const express = require("express");
const { startAssessment } = require("../controllers/authController");

const router = express.Router();

router.post("/start", startAssessment);

module.exports = router;
