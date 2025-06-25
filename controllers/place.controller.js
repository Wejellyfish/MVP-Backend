const db = require("../config/db");
const {
  crawlAndStorePlaces,
  getPaginatedPlaces,
} = require("../services/googlePlaces.service");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const SEARCH_RADIUS_METERS = 500;

const CITY_BOUNDS = {
  north: 32.9, // Roughly extending to the northern edge of the top row of pins
  south: 32.55, // Roughly extending to the southern edge of the bottom row of pins, including Chula Vista
  east: -116.9, // Roughly extending to the eastern edge of the rightmost column of pins
  west: -117.27, // Roughly extending to the western edge of the leftmost column of pins, well into the ocean
};


const getPlaces = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '' } = req.query;
    const data = await getPaginatedPlaces(Number(page), Number(pageSize), search.trim());
    return res.json(data);
  } catch (error) {
    console.error("Error fetching places:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const getNearbyPlaces = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.body;
    const userId = req.user?.id;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required." });
    }

    // const places = await db("places").whereRaw(
    //   `ST_DWithin(location_geo, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?)`,
    //   [longitude, latitude, radius]
    // );

    const subquery = db("occupancy_data")
      .select("places_google_place_id")
      .max("timestamp as latest_timestamp")
      .groupBy("places_google_place_id")
      .as("latest");


    const occupancyData = await db("occupancy_data as o")
      .join("places as p", "p.id", "o.places_google_place_id")
      .join(subquery, function () {
        this.on("o.places_google_place_id", "=", "latest.places_google_place_id")
          .andOn("o.timestamp", "=", "latest.latest_timestamp");
      })
      .leftJoin("favorite_places as f", function () {
        this.on("f.place_id", "=", "p.id").andOn("f.user_id", "=", db.raw("?", [userId]));
      })
      .whereRaw(
        `ST_DWithin(p.location_geo, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?)`,
        [longitude, latitude, radius]
      )
      .select(
        "p.*",
        "o.*",
        db.raw("CASE WHEN f.id IS NOT NULL THEN true ELSE false END as isFavorite")
      );

    res.json({ data: occupancyData });
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const isValidCityBounds = (bounds) => {
  if (
    typeof bounds !== "object" ||
    bounds === null ||
    typeof bounds.north !== "number" ||
    typeof bounds.south !== "number" ||
    typeof bounds.east !== "number" ||
    typeof bounds.west !== "number"
  ) {
    return false;
  }
  return true;
};

const isValidVenueTypes = (types) =>
  Array.isArray(types) && types.every((t) => typeof t === "string");

const refreshAllPlacesByGooglePlaceAPI = async (req, res) => {
  try {
    const body = req.body || {};
    const errors = [];

    // Validate only if provided
    if ("cityBounds" in body && !isValidCityBounds(body.cityBounds)) {
      errors.push(
        "Invalid 'cityBounds'. Expected object with { north, south, east, west } as numbers."
      );
    }

    if ("searchRadius" in body && typeof body.searchRadius !== "number") {
      errors.push("Invalid 'searchRadius'. Expected a number.");
    }

    if (
      "venueTypesToCrawl" in body &&
      !isValidVenueTypes(body.venueTypesToCrawl)
    ) {
      errors.push("Invalid 'venueTypesToCrawl'. Expected an array of strings.");
    }

    if (
      "googleAPIKey" in body &&
      (typeof body.googleAPIKey !== "string" ||
        body.googleAPIKey.trim().length === 0)
    ) {
      errors.push("Invalid 'googleAPIKey'. Expected a non-empty string.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Use defaults if not provided
    const cityBounds = "cityBounds" in body ? body.cityBounds : CITY_BOUNDS;
    const searchRadius =
      "searchRadius" in body ? body.searchRadius : SEARCH_RADIUS_METERS;
    const venueTypesToCrawl =
      "venueTypesToCrawl" in body
        ? body.venueTypesToCrawl
        : ["restaurant", "bar"];
    const googleAPIKey =
      "googleAPIKey" in body ? body.googleAPIKey : GOOGLE_API_KEY;

    // Check for in-progress job
    const activeLog = await db("place_refresh_logs")
      .where({ status: "in_progress" })
      .first();

    if (activeLog) {
      return res
        .status(409)
        .json({ message: "Refresh is already in progress." });
    }

    // Start background job
    crawlAndStorePlaces({
      cityBounds,
      searchRadius,
      venueTypesToCrawl,
      googleAPIKey,
    });

    return res.status(202).json({ message: "Place refresh started." });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ error: "Failed to start place refresh." });
  }
};


const occupancyUpdate = async (req, res) => {
  const {
    placeId,
    occupancy_level = "unknown",
    occupancy_percentage = null,
    source = "admin_entry",
  } = req.body;

  if (!placeId) {
    return res.status(400).json({ error: "Missing placeId" });
  }

  try {
    // Check if there's already a row for this placeId
    const existing = await db("occupancy_data")
      .where("places_google_place_id", placeId)
      .first();

    const now = new Date().toISOString();

    if (existing) {
      // Update the existing record
      await db("occupancy_data")
        .where("places_google_place_id", placeId)
        .update({
          occupancy_level,
          occupancy_percentage,
          source,
          updated_at: now,
        });

      return res.status(200).json({
        success: true,
        message: "Occupancy updated",
        action: "updated",
      });
    } else {
      // Insert a new record
      await db("occupancy_data").insert({
        places_google_place_id: placeId,
        timestamp: now,
        occupancy_level,
        occupancy_percentage,
        source,
        created_at: now,
        updated_at: now,
      });

      return res.status(200).json({
        success: true,
        message: "Occupancy inserted",
        action: "inserted",
      });
    }
  } catch (error) {
    console.error("Error updating occupancy:", error);
    return res.status(500).json({ error: "Failed to update occupancy data" });
  }
};


const getOccupancyById = async (req, res) => {
  const { places_google_place_id } = req.params;

  if (!places_google_place_id) {
    return res.status(400).json({ error: "Missing placeId" });
  }

  try {
    const occupancy = await db("occupancy_data")
      .where({ places_google_place_id })
      .first();

    if (!occupancy) {
      return res.status(404).json({ message: "No occupancy data found" });
    }

    return res.status(200).json(occupancy);
  } catch (error) {
    console.error("Error fetching occupancy data:", error);
    return res.status(500).json({ error: "Failed to fetch occupancy data" });
  }
}

module.exports = {
  getPlaces,
  getNearbyPlaces,
  refreshAllPlacesByGooglePlaceAPI,
  occupancyUpdate,
  getOccupancyById
};
