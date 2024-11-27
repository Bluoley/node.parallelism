const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const flightController = require("../controller/flightController");

router.post("/flight/weather", upload.single("csvFile"), flightController.reportWeather);
router.get("/flight/iatakeys", flightController.getIataKeys);

module.exports = router;
