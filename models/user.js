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
	point: {type: Number, default: 0},
	numberOfWins: {type: Number, default: 0 },
	numberOfDefeats: {type: Number, default: 0},
	numberOfDraws: { type: Number, default: 0},
	totalGames: {type: Number, default: 0},
	// games: [{ type: mongoose.Types.ObjectId, required: true, ref: "Game" }],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
