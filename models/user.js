const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
	name: { type: String },
	userName: { type: String, unique: true },
	email: { type: String },
	password: { type: String, minLength: 6 },
	image: { type: String },
	socketId: { type: String },
	given_name: { type: String },
	family_name: { type: String },
	nickname: { type: String },
	picture: { type: String },
	updated_at: { type: String },
	email_verified: { type: Boolean },
	sub: { type: String },
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
