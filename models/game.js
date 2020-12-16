const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const gameSchema = new Schema({
    xPlayer: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    oPlayer: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    chatHistory: [{ type: String, required: true}],
    winCells: [{
        coorX: {type: Number, required: true},
        coorY: {type: Number, required: true},
    }],
    history: [{
        x: {type: Number, required: true},
        y: {type: Number, required: true},
        square: [[{type: String, required: true}]],
    }]
});

gameSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Game", gameSchema);
