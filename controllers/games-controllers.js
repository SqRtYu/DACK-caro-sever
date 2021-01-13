const HttpError = require("../models/http-error");
const mongoose = require("mongoose");

const Game = require("../models/game");
const User = require("../models/user");

const saveGame = async (req, res, next) => {
  console.log("save game");
  console.log(req.body);
  const {
    xPlayer,
    oPlayer,
    history,
    chatHistory,
    winCells,
    isDraw,
    winner,
    date,
  } = req.body;

  history.map((history) => {
    history.squares = JSON.parse(JSON.stringify(history.squares));
  })

  let userX;
  let userO;

  try {
    userX = await User.findOne({ sub: xPlayer.sub });
    userO = await User.findOne({ sub: oPlayer.sub });
  } catch (err) {
    const error = new HttpError("Creating game failed, please try again.");
    next(error);
  }

  if (!userX || !userO) {
    const error = new HttpError("Could not find user for provided sub", 404);
    return next(error);
  }

  //Calculate point
  let point = 0;
  if (!isDraw) {
    point = Math.abs(userX.point - userO.point);
    if(point > 100) point = 100;

    if (winner === userX.sub) {
      if (userX.point > userO.point) {
        userX.point += 50;
        userO.point -= 50;
        point = 0;
      } else {
        userX.point += point + 50;
        userO.point -= point + 50;
      }
      userX.win++;
      userO.lost++;
    } else {
      if (userO.point > userX.point) {
        userO.point += 50;
        userX.point -= 50;
        point = 0;
      } else {
        userO.point += point + 50;
        userX.point -= point + 50;
      }
      userO.win++;
      userX.lost++;
    }
  } else {
    point = -50;
    userX.draw++;
    userO.draw++;
  }

  if(userX.point < 0) userX.point = 0;
  if(userO.point < 0) userO.point = 0;

  userX.total++;
  userO.total++;

  console.log(userX.point);
  console.log(userO.point);

  const createdGame = new Game({
    xPlayer,
    oPlayer,
    history,
    chatHistory,
    winCells,
    isDraw,
    winner,
    point: point + 50,
    date,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdGame.save({ session: sess });
    userX.games.push(createdGame);
    userO.games.push(createdGame);
    await userX.save({ session: sess });
    await userO.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating games failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ game: createdGame.toObject({ getters: true }) });
};

const getGameByUser = async (req, res, next) => {
    const sub = req.params.sub;
  
    let userWithGames;
    try {
        userWithGames =  await User.findOne({sub}).populate('games');
    } catch (err) {
      const error = new HttpError(
        "Fetching games failed, please try again later.",
        500
      );
      return next(error);
    }
  
    if (!userWithGames || userWithGames.games.length === 0) {
      return next(
        new HttpError("Could not find games for the provided user sub", 404)
      );
    }

    const games = userWithGames.games;
    games.sort(function(a,b){
      return new Date(b.date) - new Date(a.date);
    });
  
    res.json({
      games: games.map(game => game.toObject({ getters: true })),
    });
  };
  

exports.saveGame = saveGame;
exports.getGameByUser = getGameByUser;