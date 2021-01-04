const express = require("express");
const { check } = require("express-validator");

const checkAuth = require("../middleware/check-auth.js");
const gamesControllers = require("../controllers/games-controllers");

const router = express.Router();

router.use(checkAuth);

router.post("/", gamesControllers.saveGame);

module.exports = router;
