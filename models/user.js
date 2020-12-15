const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
	name: { type: String, required: true },
	userName: { type: String, required: true, unique: true },
	email: { type: String, required: true },
	password: { type: String, required: true, minLength: 6 },
	image: { type: String },
	socketId: { type: String },
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
