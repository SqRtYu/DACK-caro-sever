const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const usersRoutes = require("./routes/users-routes");

const app = express();

const server = require("http").createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
	},
});
io.on("connection", (client) => {
	client.on("user-online", (user) => {
		io.emit("user-online", user);
	});
	client.on("user-offline", (userId) => io.emit("user-offline", userId));
});

app.use(bodyParser.json());

app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use(cors());

app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
	const error = new HttpError("Could not find this route.", 404);
	throw error;
});

app.use((error, req, res, next) => {
	if (req.file) {
		fs.unlink(req.file.path, (err) => {
			console.log(err);
		});
	}
	if (res.headerSent) {
		return next(error);
	}
	res.status(error.code || 500);
	res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
	.connect(
		`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9hjdt.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
	)
	.then(() => {
		server.listen(process.env.PORT || 5000);
	})
	.catch((err) => {
		console.log(err);
	});
