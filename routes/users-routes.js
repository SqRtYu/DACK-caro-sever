const express = require("express");
const { check } = require("express-validator");

const usersControllers = require("../controllers/users-controllers");
const fileUpload = require("../middleware/uploadImageUsers");

const router = express.Router();

router.post("/rank", usersControllers.getRankingUser);

router.post("/info/get", usersControllers.getUserInfo);
router.post("/info/update", usersControllers.updateUserInfo);
router.post("/info/search", usersControllers.searchUserInfo);

router.post(
	"/signup",
	fileUpload.single("image"),
	(req, res, next) => {
		next();
	},
	[
		check("userName").not().isEmpty(),
		check("name").not().isEmpty(),
		check("password").isLength({ min: 3 }),
	],
	usersControllers.signup
);

router.post("/login", usersControllers.login);
router.post("/login-social", usersControllers.loginSocial);
router.post("/logout", usersControllers.logout);
router.post("/online", usersControllers.getOnline);

router.patch(
	"/:uid",
	fileUpload.single("image"),
	[
		check("userName").not().isEmpty(),
		check("name").not().isEmpty(),
		check("email").normalizeEmail({ gmail_remove_dots: false }).isEmail(),
		check("password").isLength({ min: 6 }),
	],
	usersControllers.updateUser
);

router.patch(
	"/:uid/password",
	[check("password").isLength({ min: 6 })],
	usersControllers.updateUserPassword
);

module.exports = router;
