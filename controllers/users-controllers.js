const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

const User = require('../models/user');

const getUserById = async (req, res, next) => {
  const userID = req.params.uid;

  let user;
  try {
    user = await User.findById(userID);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a user.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      'Could not find a user for the provided user id',
      404
    );
    return next(error);
  }

  res.json({ user: user.toObject({ getters: true }) });
};

const signup = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    const error = new HttpError(
      'Invalid inputs passed, please check your data.',
      422
    );
    return next(error);
  }

  const { name, userName, email, password } = req.body;

  let existingUserByUserName;

  try {
    existingUserByUserName = await User.findOne({ userName: userName });
  } catch (err) {
    const error = new HttpError('Signup fail please try again.', 500);
    return next(error);
  }

  if (existingUserByUserName) {
    const error = new HttpError(
      'User name exists already, please login instead.',
      423
    );
    return next(error);
  }
  
  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not hash password, please try again.',
      500
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    userName,
    email,
    password: hashedPassword,
    image:'https://simpleicon.com/wp-content/uploads/account.png',
    boards: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError('Signup fail please try again.', 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        userName: createdUser.userName,
        email: createdUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError('Signup fail please try again.', 500);
    return next(error);
  }

  res.status(201).json({
    userId: createdUser.id,
    userName: createdUser.userName,
    email: createdUser.email,
    token: token,
  });
};

const login = async (req, res, next) => {
  const { userName, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ userName: userName });
  } catch (err) {
    const error = new HttpError('Logging fail please try again.', 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError('Logging fail please try again.', 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        userName: existingUser.userName,
        email: existingUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError('Logging fail please try again.', 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    userName: existingUser.userName,
    email: existingUser.email,
    token: token,
  });
};

const loginGoogle = async (req, res, next) => {
  const { token } = req.body;

  let userName, name, email, image;

  userName = token.sub;
  name = token.name;
  email = token.email;
  image = token.picture;

  let existingUser;

  try {
    existingUser = await User.findOne({ userName: userName });
  } catch (err) {
    const error = new HttpError("Logging fail please try again.", 500);
    return next(error);
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(email, 12);
    hashedPassword = await bcrypt.hash(hashedPassword, 12);
  } catch (err) {
    const error = new HttpError("Logging fail please try again.", 500);
    return next(error);
  }

  let createdUser;
  if (!existingUser) {
    createdUser = new User({
      name,
      userName,
      email,
      password: hashedPassword,
      image,
      boards: [],
    });

    try {
      await createdUser.save();
    } catch (err) {
      const error = new HttpError("Logging fail please try again.", 500);
      return next(error);
    }
  }

  let tokenSending;
  try {
    tokenSending = jwt.sign(
      {
        userId: existingUser ? existingUser.id : createdUser.id,
        userName: userName,
        email: email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging fail please try again.", 500);
    return next(error);
  }

  res.json({
    userId: existingUser ? existingUser.id : createdUser.id,
    userName,
    email,
    token: tokenSending,
  });
};

const loginFacebook = async (req, res, next) => {
  const { token } = req.body;

  let name, email, userName, image;

  userName = token.sub;
  name = token.name;
  email = token.email;
  image = token.picture;

  let existingUser;

  try {
    existingUser = await User.findOne({ userName: userName });
  } catch (err) {
    const error = new HttpError("Logging fail please try again.", 500);
    return next(error);
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(email, 12);
    hashedPassword = await bcrypt.hash(hashedPassword, 12);
  } catch (err) {
    const error = new HttpError(
      "Logging fail please try again.",
      500
    );
    return next(error);
  }

  let createdUser;
  if (!existingUser) {
    createdUser = new User({
      name,
      userName,
      email,
      password: hashedPassword,
      image,
      boards: [],
    });

    try {
      await createdUser.save();
    } catch (err) {
      const error = new HttpError("Logging fail please try again.", 500);
      return next(error);
    }
  }

  let tokenSending;
  try {
    tokenSending = jwt.sign(
      {
        userId: existingUser? existingUser.id: createdUser.id,
        userName,
        email: email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging fail please try again.", 500);
    return next(error);
  }

  res.json({
    userId: existingUser? existingUser.id: createdUser.id,
    userName,
    email,
    token: tokenSending,
  });
};

const updateUser = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { name, userName, email } = req.body;
  const userId = req.params.uid;

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Some thing went wrong, could not update user.',
      500
    );
    return next(error);
  }

  if (userId !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to update this user.',
      401
    );
    return next(error);
  }

  user.name = name;
  user.userName = userName;
  user.email = email;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      'Some thing went wrong, could not update user.',
      500
    );
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

const updateUserPassword = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { password, oldPassword } = req.body;
  const userId = req.params.uid;

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Some thing went wrong, could not update user.',
      500
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(oldPassword, user.password);
  } catch (err) {
    const error = new HttpError('Change password failed, please try again.', 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Password is not match.',
      500
    );
    return next(error);
  }

  if (userId !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to update this user.',
      401
    );
    return next(error);
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not hash password, please try again.',
      500
    );
    return next(error);
  }

  user.password = hashedPassword;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      'Some thing went wrong, could not update user.',
      500
    );
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

exports.getUserById = getUserById;
exports.signup = signup;
exports.login = login;
exports.loginGoogle = loginGoogle;
exports.loginFacebook = loginFacebook;
exports.updateUser = updateUser;
exports.updateUserPassword = updateUserPassword;
