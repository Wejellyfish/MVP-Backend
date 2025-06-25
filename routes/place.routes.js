const express = require("express");
const router = express.Router();

const compression = require("compression");
const {
  getPlaces,
  getNearbyPlaces,
  refreshAllPlacesByGooglePlaceAPI,
  occupancyUpdate,
  getOccupancyById,
} = require("../controllers/place.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.use(compression());

router.get("/getPlaces", getPlaces);
router.post("/getNearbyPlaces", authenticateToken, getNearbyPlaces);
router.post("/refreshAllPlacesByGooglePlaceAPI", refreshAllPlacesByGooglePlaceAPI);
router.post("/occupancy/update", occupancyUpdate);
router.get("/occupancy/:places_google_place_id", getOccupancyById);

module.exports = router;
