const express = require("express");
const { check } = require("express-validator");

const gamesControllers = require("../controllers/games-controllers");

const router = express.Router();

router.post("/save", gamesControllers.saveGame);

router.get("/:sub", gamesControllers.getGameByUser);

module.exports = router;
