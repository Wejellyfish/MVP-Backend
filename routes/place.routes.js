const express = require("express");
const router = express.Router();
const {
  getPlaces,
  getNearbyPlaces,
  refreshAllPlacesByGooglePlaceAPI,
} = require("../controllers/place.controller");
const compression = require("compression");

router.use(compression());

router.get("/getPlaces", getPlaces);
router.post("/getNearbyPlaces", getNearbyPlaces);
router.post(
  "/refreshAllPlacesByGooglePlaceAPI",
  refreshAllPlacesByGooglePlaceAPI
);

module.exports = router;
