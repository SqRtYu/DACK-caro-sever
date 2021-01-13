const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const user = require("../models/user");

const User = require("../models/user");

const getUserInfo = async (req, res, next) => {
	const { sub } = req.user || {};
	const { name, picture, email, isLocked } = req.body.user || {};
	if (sub) {
		const matchedUser = await User.findOne({ sub });
		if (matchedUser) {
			const { displayName, point, win, lost, draw, total } = matchedUser;
			res.json({
				info: { displayName },
				isLocked,
				trophy: {
					point,
					win,
					lost,
					draw,
					total,
				},
			});
		} else {
			const createdUser = new User({
				sub,
				displayName: name,
				email,
				name,
				picture,
				created_at:
					(req.body.user || {})["https://carona.netlify.app/created_at"] ||
					new Date().toISOString(),
			});
			createdUser
				.save()
				.then((document) => {
					const { displayName, point, win, lost, draw, total } = document;
					res.json({
						info: { displayName },
						trophy: {
							point,
							win,
							lost,
							draw,
							total,
						},
					});
				})
				.catch(() => {
					next(new HttpError("Internal Server Error", 500));
				});
		}
	} else return next(new HttpError("User not found", 404));
};

const updateUserInfo = async (req, res, next) => {
	const { sub } = req.user || {};
	const { displayName } = req.body || {};
	if (sub) {
		const matchedUser = await User.findOne({ sub });
		if (matchedUser) {
			matchedUser.displayName = displayName;
			matchedUser.save().then((document) => {
				const { displayName, point, win, lost, draw, total } = document;
				res.json({
					info: { displayName },
					trophy: {
						point,
						win,
						lost,
						draw,
						total,
					},
				});
			});
		} else {
			return next(new HttpError("User not found", 404));
		}
	} else return next(new HttpError("User not found", 404));
};

const searchUserInfo = async (req, res, next) => {
	const { sub } = req.body || {};
	if (sub) {
		const matchedUser = await User.findOne({ sub });
		if (matchedUser) {
			const {
				displayName,
				picture,
				created_at,
				point,
				win,
				lost,
				draw,
				total,
			} = matchedUser;
			res.json({
				info: { displayName, picture, created_at },
				trophy: {
					point,
					win,
					lost,
					draw,
					total,
				},
			});
		} else return next(new HttpError("User not found", 404));
	} else return next(new HttpError("User not found", 404));
};

const getUserById = async (req, res, next) => {
	const userID = req.params.uid;

	let user;
	try {
		user = await User.findById(userID);
	} catch (err) {
		const error = new HttpError(
			"Something went wrong, could not find a user.",
			500
		);
		return next(error);
	}

	if (!user) {
		const error = new HttpError(
			"Could not find a user for the provided user id",
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
			"Invalid inputs passed, please check your data.",
			422
		);
		return next(error);
	}

	const { name, userName, email, password } = req.body;

	let existingUserByUserName;

	try {
		existingUserByUserName = await User.findOne({ userName: userName });
	} catch (err) {
		const error = new HttpError("Signup fail please try again.", 500);
		return next(error);
	}
	if (existingUserByUserName) {
		const error = new HttpError(
			"User name exists already, please login instead.",
			423
		);
		return next(error);
	}

	let hashedPassword;

	try {
		hashedPassword = await bcrypt.hash(password, 12);
	} catch (err) {
		const error = new HttpError(
			"Could not hash password, please try again.",
			500
		);
		return next(error);
	}

	const createdUser = new User({
		name,
		userName,
		email,
		password: hashedPassword,
		image: "https://simpleicon.com/wp-content/uploads/account.png",
	});

	try {
		await createdUser.save();
	} catch (err) {
		const error = new HttpError("Signup fail please try again.", 500);
		return next(error);
	}

	let token;
	try {
		token = jwt.sign(
			{
				userId: createdUser.id,
				userName: createdUser.userName,
				name: createdUser.name,
				image: createdUser.image,
				email: createdUser.email,
			},
			process.env.JWT_KEY
		);
	} catch (err) {
		const error = new HttpError("Signup fail please try again.", 500);
		return next(error);
	}

	res.status(201).json({
		userId: createdUser.id,
		userName: createdUser.userName,
		name: createdUser.name,
		image: createdUser.image,
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
		const error = new HttpError("Logging fail please try again.", 500);
		return next(error);
	}
	if (!existingUser) {
		const error = new HttpError("User not found", 404);
		return next(error);
	}

	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(password, existingUser.password);
	} catch (err) {
		const error = new HttpError("Logging fail please try again.", 500);
		return next(error);
	}

	if (!isValidPassword) {
		const error = new HttpError(
			"Invalid credentials, could not log you in.",
			500
		);
		return next(error);
	}

	if (existingUser && existingUser.socketId) {
		const error = new HttpError("User has already logged in", 500);
		return next(error);
	}

	let token;
	try {
		token = jwt.sign(
			{
				userId: existingUser.id,
				userName: existingUser.userName,
				name: existingUser.name,
				image: existingUser.image,
				email: existingUser.email,
			},
			process.env.JWT_KEY
		);
	} catch (err) {
		const error = new HttpError("Logging fail please try again.", 500);
		return next(error);
	}

	res.json({
		userId: existingUser.id,
		userName: existingUser.userName,
		name: existingUser.name,
		image: existingUser.image,
		email: existingUser.email,
		token: token,
	});
};

const loginSocial = async (req, res, next) => {
	const { token } = req.body;
	let decoded;
	try {
		decoded = jwt.decode(token);
	} catch (err) {
		const error = new HttpError("Token Invalid.", 500);
		return next(error);
	}

	let userName, name, email, image;
	userName = decoded.user_id;
	name = decoded.name;
	email = decoded.email;
	image = decoded.picture;

	let existingUser;

	try {
		existingUser = await User.findOne({ userName });
	} catch (err) {
		const error = new HttpError("Logging fail please try again.", 500);
		return next(error);
	}

	if (existingUser && existingUser.socketId) {
		const error = new HttpError("User has already logged in", 500);
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
				userId: (existingUser || createdUser).id,
				userName: (existingUser || createdUser).userName,
				email: (existingUser || createdUser).email,
				name: (existingUser || createdUser).name,
				image: (existingUser || createdUser).image,
			},
			process.env.JWT_KEY
		);
	} catch (err) {
		const error = new HttpError("Logging fail please try again.", 500);
		return next(error);
	}

	res.json({
		userId: (existingUser || createdUser).id,
		userName: (existingUser || createdUser).userName,
		email: (existingUser || createdUser).email,
		name: (existingUser || createdUser).name,
		image: (existingUser || createdUser).image,
		token: tokenSending,
	});
};

const updateUser = async (req, res, next) => {
	const error = validationResult(req);
	if (!error.isEmpty()) {
		return next(
			new HttpError("Invalid inputs passed, please check your data.", 422)
		);
	}

	const { name, userName, email } = req.body;
	const userId = req.params.uid;

	let user;

	try {
		user = await User.findById(userId);
	} catch (err) {
		const error = new HttpError(
			"Some thing went wrong, could not update user.",
			500
		);
		return next(error);
	}

	if (userId !== req.userData.userId) {
		const error = new HttpError(
			"You are not allowed to update this user.",
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
			"Some thing went wrong, could not update user.",
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
			new HttpError("Invalid inputs passed, please check your data.", 422)
		);
	}

	const { password, oldPassword } = req.body;
	const userId = req.params.uid;

	let user;

	try {
		user = await User.findById(userId);
	} catch (err) {
		const error = new HttpError(
			"Some thing went wrong, could not update user.",
			500
		);
		return next(error);
	}

	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(oldPassword, user.password);
	} catch (err) {
		const error = new HttpError(
			"Change password failed, please try again.",
			500
		);
		return next(error);
	}

	if (!isValidPassword) {
		const error = new HttpError("Password is not match.", 500);
		return next(error);
	}

	if (userId !== req.userData.userId) {
		const error = new HttpError(
			"You are not allowed to update this user.",
			401
		);
		return next(error);
	}

	let hashedPassword;

	try {
		hashedPassword = await bcrypt.hash(password, 12);
	} catch (err) {
		const error = new HttpError(
			"Could not hash password, please try again.",
			500
		);
		return next(error);
	}

	user.password = hashedPassword;

	try {
		await user.save();
	} catch (err) {
		const error = new HttpError(
			"Some thing went wrong, could not update user.",
			500
		);
		return next(error);
	}

	res.status(200).json({ user: user.toObject({ getters: true }) });
};

const logout = async (req, res, next) => {
	const { userId } = req.body;

	let existingUser;

	try {
		existingUser = await User.findById(userId);
	} catch (err) {
		const error = new HttpError("Logging out fail please try again.", 500);
		return next(error);
	}

	if (!existingUser) {
		const error = new HttpError(
			"Invalid credentials, could not find user.",
			403
		);
		return next(error);
	}

	res.status(200).send();
};

const getOnline = async (req, res, next) => {
	const { socketId } = req.body;
	try {
		onlineUser = await User.find({ socketId: { $nin: [socketId, null] } });
		console.log(onlineUser);
	} catch (err) {
		const error = new HttpError("Get Online Fail", 500);
		return next(error);
	}

	res.json({
		users: onlineUser.map((user) => user.toObject({ getters: true })),
	});
};

const getRankingUser = async (req, res, next) => {
	let rankingUsers;

	try {
		rankingUsers = await User.find({})
			.sort({
				point: "descending",
				total: "ascending",
				win: "descending",
				lost: "ascending",
			})
			.limit(3);
	} catch (err) {
		const error = new HttpError(
			"Fetching users failed, please try again later.",
			500
		);
		return next(error);
	}

	// if (rankingUsers.length === 0) {
	// 	return next(new HttpError("Could not find users", 404));
	// }

	res.json(rankingUsers.map((user) => user.toObject({ getters: true })));
};

exports.getUserById = getUserById;
exports.signup = signup;
exports.login = login;
exports.logout = logout;
exports.loginSocial = loginSocial;
exports.updateUser = updateUser;
exports.updateUserPassword = updateUserPassword;
exports.getOnline = getOnline;
exports.getUserInfo = getUserInfo;
exports.updateUserInfo = updateUserInfo;
exports.searchUserInfo = searchUserInfo;
exports.getRankingUser = getRankingUser;
