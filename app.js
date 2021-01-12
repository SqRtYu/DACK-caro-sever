// libs
const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
// middlewares
const { verifyAPI, verifySocket } = require("./middleware/check-auth");
// routes
const usersRoutes = require("./routes/users-routes");
const gamesRoutes = require("./routes/games-routes");

// socket
var socketfunc = require("./socket.io/socket.io");

const app = express();

// socket
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
	},
});
io.use(verifySocket).on("connection", (socket) => {
	socketfunc(io, socket);
});

// middlewares
app.use(bodyParser.json());
app.use(cors());
app.use(verifyAPI);

// routers
app.use("/uploads/images", express.static(path.join("uploads", "images")));
app.use("/api/users", usersRoutes);
app.use("/api/games", gamesRoutes);

// handle error
app.use((err, req, res, next) => {
	console.log(err);
	if (err.name === "UnauthorizedError") {
		res.status(401).send("invalid token...");
	}
});
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
		`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.9hjdt.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true,
		}
	)
	.then(() => {
		server.listen(process.env.PORT || 5000, () => console.log("Server On"));
	})
	.catch((err) => {
		console.log(err);
	});
