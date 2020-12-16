const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

const Game = require("../models/game");
const User = require("../models/user");

const saveGame = async (req, res, next) => {
    // const error = validationResult(req);
    // if (!error.isEmpty()) {
    //   const error = new HttpError(
    //     "Invalid inputs passed, please check your data.",
    //     422
    //   );
    //   return next(error);
    // }


    // const { xPlayer, oPlayer}   = req.body
  
    // const createdGame = new Game({
    //   xPlayer,
    //   oPlayer,
    // });
  
    // let userX;
    // let userO;
  
    // try {
    //  userX = await User.findById(xPlayer);
    //  userO = await User.findById(oPlayer);
    // } catch (err) {
    //   const error = new HttpError("Creating game failed, please try again.");
    //   next(error);
    // }
  
    // if (!userX || !user0) {
    //   const error = new HttpError("Could not find user for provided id", 404);
    //   return next(error);
    // }
  
    // try {
    //   const sess = await mongoose.startSession();
    //   sess.startTransaction();
    //   await createdGame.save({ session: sess });
    //   userX.games.push(createdGame);
    //   userO.games.push(createdGame);
    //   await userX.save({ session: sess });
    //   await userO.save({ session: sess });
    //   await sess.commitTransaction();
    // } catch (err) {
    //   const error = new HttpError(
    //     "Creating board failed, please try again.",
    //     500
    //   );
    //   return next(error);
    // }
  
    // res.status(201).json({ game: createdGame.toObject({ getters: true }) });
};

exports.saveGame = saveGame;

