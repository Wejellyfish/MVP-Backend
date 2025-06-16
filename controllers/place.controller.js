const db = require("../config/db");
const {
  crawlAndStorePlaces,
  getPaginatedPlaces,
} = require("../services/googlePlaces.service");
require("dotenv").config({ path: "../.env" });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_RADIUS_METERS = 500;
const CITY_BOUNDS = {
  north: 32.9, // Roughly extending to the northern edge of the top row of pins
  south: 32.55, // Roughly extending to the southern edge of the bottom row of pins, including Chula Vista
  east: -116.9, // Roughly extending to the eastern edge of the rightmost column of pins
  west: -117.27, // Roughly extending to the western edge of the leftmost column of pins, well into the ocean
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

const getPlaces = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const data = await getPaginatedPlaces(Number(page), Number(pageSize));
    return res.json(data);
  } catch (error) {
    console.error("Error fetching places:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getNearbyPlaces = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required." });
    }

    const places = await db("places").whereRaw(
      `ST_DWithin(location_geo, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?)`,
      [longitude, latitude, radius]
    );

    res.json({ data: places });
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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

module.exports = {
  getPlaces,
  getNearbyPlaces,
  refreshAllPlacesByGooglePlaceAPI,
};
