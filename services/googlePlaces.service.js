const axios = require("axios");
const db = require("../config/db");
require("dotenv").config({ path: "../.env" });

/**
 * Generates a grid of latitude and longitude points to cover a given bounding box.
 * The spacing ensures that a search with a given radius from each point provides good coverage.
 *
 * @param {number} north - Northern latitude bound.
 * @param {number} south - Southern latitude bound.
 * @param {number} east - Eastern longitude bound.
 * @param {number} west - Western longitude bound.
 * @param {number} searchRadiusMeters - The radius (in meters) that will be used for API calls.
 * @returns {Array<{lat: number, lng: number}>} An array of {lat, lng} objects.
 */
function generateGridForRadius(north, south, east, west, searchRadiusMeters) {
  const points = [];

  // Approximate meters per degree at San Diego's latitude (approx 32.7 degrees)
  const METERS_PER_DEGREE_LAT = 111139; // meters/degree
  // Use a more dynamic cosine calculation for longitude spacing based on average latitude
  const avgLat = (north + south) / 2;
  const METERS_PER_DEGREE_LNG =
    METERS_PER_DEGREE_LAT * Math.cos((avgLat * Math.PI) / 180); // meters/degree

  // Calculate spacing to ensure good overlap for the given searchRadiusMeters
  // A factor of 1.5-1.8 * radius is often used to ensure no gaps. Let's use 1.7 * radius for better coverage.
  const desiredOverlapFactor = 1.7;
  const latSpacingMeters = searchRadiusMeters * desiredOverlapFactor;
  const lngSpacingMeters = searchRadiusMeters * desiredOverlapFactor;

  const latSpacingDegrees = latSpacingMeters / METERS_PER_DEGREE_LAT;
  const lngSpacingDegrees = lngSpacingMeters / METERS_PER_DEGREE_LNG;

  // Ensure minimum spacing to avoid too many points for very small radii
  const MIN_SPACING_DEGREES = 0.005; // ~500m to avoid excessive points
  const actualLatSpacing = Math.max(latSpacingDegrees, MIN_SPACING_DEGREES);
  const actualLngSpacing = Math.max(lngSpacingDegrees, MIN_SPACING_DEGREES);

  console.log(
    `Grid generation: Lat spacing: ${actualLatSpacing.toFixed(
      5
    )} deg, Lng spacing: ${actualLngSpacing.toFixed(5)} deg`
  );
  console.log(
    `Estimated points: ${Math.ceil((north - south) / actualLatSpacing) *
    Math.ceil((east - west) / actualLngSpacing)
    }`
  );

  for (
    let lat = south;
    lat <= north + actualLatSpacing / 2; // Add a small buffer for floating point
    lat += actualLatSpacing
  ) {
    for (
      let lng = west;
      lng <= east + actualLngSpacing / 2; // Add a small buffer for floating point
      lng += actualLngSpacing
    ) {
      points.push({
        lat: parseFloat(lat.toFixed(6)), // Round to avoid float precision issues
        lng: parseFloat(lng.toFixed(6)),
      });
    }
  }
  return points;
}

/**
 * Fetches places using the Places API (New) searchNearby endpoint.
 *
 * @param {string[]} type - The type of place to search for (e.g., ["restaurant", "bar"]).
 * @param {{latitude: number, longitude: number}} center - The center coordinates for the circle.
 * @param {number} radius - The radius in meters.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of place objects.
 */
async function fetchPlacesNearby(types, center, radius, googleAPIKey) {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": googleAPIKey,
    "X-Goog-FieldMask": "*",
  };
  const body = {
    includedTypes: types,
    maxResultCount: 20, // Max for searchNearby
    locationRestriction: {
      circle: {
        center: {
          latitude: center.latitude,
          longitude: center.longitude,
        },
        radius: radius,
      },
    },
  };

  try {
    console.log(
      `Fetching ${types.join(",")}s near ${center.latitude},${center.longitude
      } with radius ${radius}m...`
    );
    console.log("headers =>", headers);
    const response = await axios.post(url, body, { headers });
    const data = response.data;

    if (data.places && data.places.length > 0) {
      console.log(`Found ${data.places.length} ${types.join(",")}s.`);
      return data.places;
    } else {
      console.log(`No ${types.join(",")}s found for this location.`);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching ${types.join(",")}s:`, error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return []; // Return empty array on error to continue processing
  }
}

/**
 * Inserts or updates place data into the 'places' table.
 * @param {Object} placeData - The place data from Google Places API.
 */
async function savePlaceToDb(placeData, errorArr = []) {
  const mappedData = {
    id: placeData.id,
    name: placeData.displayName?.text || null,
    national_phone_number: placeData.nationalPhoneNumber || null,
    international_phone_number: placeData.internationalPhoneNumber || null,
    formatted_address: placeData.formattedAddress || null,
    short_formatted_address: placeData.shortFormattedAddress || null,
    website_uri: placeData.websiteUri || null,
    maps_uri: placeData.googleMapsUri || null,
    rating: placeData.rating || null,
    user_rating_count: placeData.userRatingCount || null,
    price_level: placeData.priceLevel || null,
    business_status: placeData.businessStatus || null,
    primary_type_display_name: placeData.primaryTypeDisplayName?.text || null,
    editorial_summary_text: placeData.editorialSummary?.text || null,
    editorial_summary_language_code:
      placeData.editorialSummary?.languageCode || null,
    generative_summary_overview_text:
      placeData.generativeSummary?.overview?.text || null,
    generative_summary_overview_language_code:
      placeData.generativeSummary?.overview?.languageCode || null,
    review_summary_text: placeData.reviewSummary?.text || null,
    review_summary_language_code: placeData.reviewSummary?.languageCode || null,
    time_zone_id: placeData.timeZone?.id || null,

    latitude: placeData.location?.latitude || null,
    longitude: placeData.location?.longitude || null,
    // Ensure longitude comes before latitude for ST_MakePoint
    location_geo: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [
      placeData.location?.longitude || 0, // Default to 0 if null, though ideally, location should exist
      placeData.location?.latitude || 0,
    ]),
    // Store JSONB as string, handle potential null/undefined for objects
    viewport: placeData.viewport ? JSON.stringify(placeData.viewport) : null,
    plus_code_global_code: placeData.plusCode?.globalCode || null,
    plus_code_compound_code: placeData.plusCode?.compoundCode || null,

    // JSONB fields - stringify only if they are non-empty arrays or non-null objects
    address_components:
      placeData.addressComponents && placeData.addressComponents.length > 0
        ? JSON.stringify(placeData.addressComponents)
        : null,
    types:
      placeData.types && placeData.types.length > 0
        ? JSON.stringify(placeData.types)
        : null,
    reviews:
      placeData.reviews && placeData.reviews.length > 0
        ? JSON.stringify(placeData.reviews)
        : null,
    photos:
      placeData.photos && placeData.photos.length > 0
        ? JSON.stringify(placeData.photos)
        : null,
    price_range: placeData.priceRange
      ? JSON.stringify(placeData.priceRange)
      : null,
    containing_places: placeData.containingPlaces
      ? JSON.stringify(placeData.containingPlaces)
      : null,
    address_descriptor: placeData.addressDescriptor
      ? JSON.stringify(placeData.addressDescriptor)
      : null,
    maps_links: placeData.googleMapsLinks
      ? JSON.stringify(placeData.googleMapsLinks)
      : null,

    // Booleans - ensure they map correctly, default to false if not present
    open_now: placeData.regularOpeningHours?.openNow || false,
    takeout: placeData.takeout || false,
    delivery: placeData.delivery || false,
    dine_in: placeData.dineIn || false,
    curbside_pickup: placeData.curbsidePickup || false,
    reservable: placeData.reservable || false,
    serves_breakfast: placeData.servesBreakfast || false,
    serves_lunch: placeData.servesLunch || false,
    serves_dinner: placeData.servesDinner || false,
    serves_beer: placeData.servesBeer || false,
    serves_wine: placeData.servesWine || false,
    serves_brunch: placeData.servesBrunch || false,
    serves_vegetarian_food: placeData.servesVegetarianFood || false,
    outdoor_seating: placeData.outdoorSeating || false,
    live_music: placeData.liveMusic || false,
    menu_for_children: placeData.menuForChildren || false,
    serves_cocktails: placeData.servesCocktails || false,
    serves_dessert: placeData.servesDessert || false,
    serves_coffee: placeData.servesCoffee || false,
    good_for_children: placeData.goodForChildren || false,
    allows_dogs: placeData.allowsDogs || false,
    restroom: placeData.restroom || false,
    good_for_groups: placeData.goodForGroups || false,
    good_for_watching_sports: placeData.goodForWatchingSports || false,

    // JSONB fields from the API can be complex; ensure they are stringified
    regular_opening_hours: placeData.regularOpeningHours
      ? JSON.stringify(placeData.regularOpeningHours)
      : null,
    current_opening_hours: placeData.currentOpeningHours
      ? JSON.stringify(placeData.currentOpeningHours)
      : null,
    regular_secondary_opening_hours: placeData.regularSecondaryOpeningHours
      ? JSON.stringify(placeData.regularSecondaryOpeningHours)
      : null,
    current_secondary_opening_hours: placeData.currentSecondaryOpeningHours
      ? JSON.stringify(placeData.currentSecondaryOpeningHours)
      : null,
    payment_options: placeData.paymentOptions
      ? JSON.stringify(placeData.paymentOptions)
      : null,
    parking_options: placeData.parkingOptions
      ? JSON.stringify(placeData.parkingOptions)
      : null,
    accessibility_options: placeData.accessibilityOptions
      ? JSON.stringify(placeData.accessibilityOptions)
      : null,
  };

  try {
    // Use upsert (insert or update) to handle existing places and new ones
    await db("places").insert(mappedData).onConflict("id").merge();

    const hasOccupancy = await db("occupancy_data")
      .where("places_google_place_id", placeData.id)
      .first();

    if (!hasOccupancy) {
      const now = new Date().toISOString();

      await db("occupancy_data").insert({
        places_google_place_id: placeData.id,
        timestamp: now,
        occupancy_level: "unknown",
        occupancy_percentage: null,
        source: "system_default",
        created_at: now,
        updated_at: now,
      });
    }

    console.log(
      `Successfully saved/updated place: ${placeData.displayName?.text || placeData.id
      } (ID: ${placeData.id})`
    );
    return true;
  } catch (error) {
    const errorMessage = `Error saving/updating place ${placeData.id}: ${error.message}`;
    errorArr.push({
      message: `Error saving/updating place ${placeData.displayName?.text || placeData.id
        }`,
      details: error.message,
    });
    console.error(errorMessage);
    return false;
  }
}

async function crawlAndStorePlaces({
  cityBounds,
  searchRadius,
  venueTypesToCrawl,
  googleAPIKey,
}) {
  const logId = await db("place_refresh_logs")
    .insert({ status: "in_progress" })
    .returning("id")
    .then((res) => res[0]?.id || res[0]);

  const errorArr = [];
  const seenPlaceIds = new Map();
  const existingIdsSet = new Set();

  try {
    // Generate grid points (you can use all points instead of just center if needed)
    const gridPoints = generateGridForRadius(
      cityBounds.north,
      cityBounds.south,
      cityBounds.east,
      cityBounds.west,
      searchRadius
    );

    for (const point of gridPoints) {
      // The new Google Places Nearby Search API returns up to 20 results per request with no pagination.
      // To cover larger areas, we use a grid of lat/lng points and query each one separately.
      const places = await fetchPlacesNearby(
        venueTypesToCrawl,
        { latitude: point.lat, longitude: point.lng },
        searchRadius,
        googleAPIKey
      );

      const placeIds = places.map((p) => p.id);

      // Add all existing IDs directly into the Set (optimized)
      (await db("places").whereIn("id", placeIds).pluck("id")).forEach((id) =>
        existingIdsSet.add(id)
      );

      // Save places if not already seen
      for (const place of places) {
        if (!seenPlaceIds.has(place.id)) {
          const status = await savePlaceToDb(place, errorArr);
          seenPlaceIds.set(place.id, status);
        }
      }

      // Delay to avoid API rate limit
      await new Promise((res) => setTimeout(res, 800));
    }

    console.log(
      `--- Crawled types: ${venueTypesToCrawl.join(", ")} | Processed: ${seenPlaceIds.size
      } ---`
    );
  } catch (err) {
    console.error("Error =>", err);
    errorArr.push({
      message: "Error during crawling",
      details: err.message,
    });
  } finally {
    const failed = errorArr.length;

    // Count how many of the seen places were existing
    let updated = 0;
    for (const id of existingIdsSet) {
      if (seenPlaceIds.has(id)) updated++;
    }

    const inserted = seenPlaceIds.size - updated - failed;

    // Update the crawl log
    await db("place_refresh_logs")
      .where({ id: logId })
      .update({
        status: failed > 0 ? "error" : "success",
        ended_at: new Date(),
        places_inserted: inserted,
        places_updated: updated,
        places_failed: failed,
        error_messages: failed > 0 ? JSON.stringify(errorArr) : null,
      });
  }
}


async function getPaginatedPlaces(page = 1, pageSize = 20, search = '') {
  const offset = (page - 1) * pageSize;

  const query = db("places");

  if (search) {
    query.where(function () {
      this.where("name", "like", `%${search}%`)
        .orWhere("formatted_address", "like", `%${search}%`);
    });
  }

  const [data, countResult] = await Promise.all([
    query.clone().select("*").limit(pageSize).offset(offset),
    query.clone().count("* as total").first(),
  ]);

  const totalCount = parseInt(countResult.total);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    page,
    nextPage: page + 1,
    pageSize,
    totalCount,
    totalPages,
    data,
  };
}


module.exports = {
  crawlAndStorePlaces,
  getPaginatedPlaces,
};
