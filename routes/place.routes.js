const express = require("express");
const router = express.Router();

const compression = require("compression");
const {
  getPlaces,
  getNearbyPlaces,
  refreshAllPlacesByGooglePlaceAPI,
  occupancyUpdate,
} = require("../controllers/place.controller");

router.use(compression());

router.get("/getPlaces", getPlaces);
router.post("/getNearbyPlaces", getNearbyPlaces);
router.post(
  "/refreshAllPlacesByGooglePlaceAPI",
  refreshAllPlacesByGooglePlaceAPI
);
router.post("/occupancy/update", occupancyUpdate);

module.exports = router;
