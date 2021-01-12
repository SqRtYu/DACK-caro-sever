const User = require("../models/user");

let listRooms = [];

module.exports = (io, socket) => {
	socket.on("user-online", (user) => {
		const currentUsers = Array.from(io.sockets.sockets).map(
			([socketId, { user }]) => ({
				socketId,
				...user,
			})
		);
		// if (currentUsers.filter(({ sub }) => sub && sub === user.sub).length) {
		// 	socket.emit("force-logout", "User already logged in");
		// } else {
		// Send Current Online User List for the new user
		const currentOnlineUsers = currentUsers.filter(
			({ sub }) => sub && sub !== user.sub
		);
		socket.emit("get-online", currentOnlineUsers);

		const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
		socket.emit("get-rooms", listOnlineRooms);
		// Send to old user that new user has just logged in
		socket.broadcast.emit("user-online", { ...user, socketId: socket.id });
		// Save User to Socket
		socket.user = { ...user, socketId: socket.id };
		// }
	});

	socket.on("join-room-request", (roomId, password) => {
		const matched = listRooms.filter(({ id }) => id === roomId);

		if (matched.length) {
			const room = matched[0];

			let can = false;
			if (room.password) {
				if (room.password === password) {
					can = true;
				}
			} else can = true;

			if (can) {
				if (room.players.O === null && room.players.X !== null)
					room.players.O = socket.user;
				else if (room.players.O !== null && room.players.X === null)
					room.players.X = socket.user;
				else return;

				socket.room = room.id;
				socket.roomInfo = room;
				socket.join(socket.room);
				socket.emit("join-room-success", room);
				io.to(room.host.socketId).emit("room-detail-update", room);
				//
				io.emit("room-list-update-room", room);
			}
		}
	});

	socket.on("create-room-request", (roomName, password, time = 30) => {
		console.log(
			"create-room-request" +
				roomName +
				"password: " +
				password +
				"time: " +
				time
		);

		let room = {
			id: Date.now(),
			roomName,
			players: {
				X: socket.user,
				O: null,
			},
			host: socket.user,
			password,
			time,
			status: 1,
			isQuick: false,
		};
		listRooms.push(room);

		socket.room = room.id;
		socket.roomInfo = room;
		socket.join(socket.room);

		socket.emit("create-room-success", room);

		io.emit("has-new-room", room);

		console.log("Room [" + socket.room + "] created");
	});

	socket.on("invite-room", (socketId) => {
		io.to(socketId).emit("receive-invite-request", socket.roomInfo);
	});

	socket.on("reply-invite-request", ({ isAccept, roomInfo: room }) => {
		if (isAccept) {
			if (room.players.O === null && room.players.X !== null)
				room.players.O = socket.user;
			else if (room.players.O !== null && room.players.X === null)
				room.players.X = socket.user;
			else return;

			socket.room = room.id;
			socket.roomInfo = room;
			socket.join(socket.room);
			socket.emit("join-room-success", room);
			io.emit("room-list-update-room", room);
			io.to(room.host.socketId).emit("room-detail-update", room);
			io.to(room.host.socketId).emit("accept-invite-request", socket.user);
		} else {
			io.to(room.host.socketId).emit("decline-invite-request", socket.user);
		}
	});

	socket.on("leave-room", () => {
		const isPlayerX =
			socket.roomInfo.players.X &&
			socket.user.sub === socket.roomInfo.players.X.sub;

		const isHost =
			socket.roomInfo.host && socket.roomInfo.host.sub === socket.user.sub;

		// neu no la host
		if (isHost) {
			// neu no la X va la host
			if (isPlayerX) {
				socket.roomInfo.host = socket.roomInfo.players.O;
				socket.roomInfo.players.X = null;
			}
			// neu no la host va la O
			else {
				socket.roomInfo.host = socket.roomInfo.players.X;
				socket.roomInfo.players.O = null;
			}
		} else {
			if (isPlayerX) socket.roomInfo.players.X = null;
			else socket.roomInfo.players.O = null;
		}
		if (
			socket.roomInfo.players.X === null &&
			socket.roomInfo.players.O === null
		) {
			console.log("Huy room ", socket.room);
			// xoa ra khoi list
			listRooms = listRooms.filter((room) => room.id !== socket.room);
			// xoa room
			io.emit("room-list-delete-room", socket.roomInfo.id);
		} else {
			// thong bao cho room
			io.to(socket.room).emit("room-detail-update", socket.roomInfo);
			// thong bao cho moi nguoi
			io.emit("room-list-update-room", socket.roomInfo);
		}

		socket.leave(socket.room);

		delete socket.room;
		delete socket.roomInfo;
	});

	socket.on("start-game-request", () => {
		io.to(socket.room).emit("start-game");
	});

	socket.on("out-game", () => {
		console.log("out");

		socket.leave(socket.room);

		let room = listRooms.find((room) => room.id === socket.room);
		if (room.length) {
			room = room[0];
			// neu no la X va thang O ko con
			if (room.players.O == null) {
				listRooms = listRooms.filter((room) => room.id !== socket.room);
				console.log("Room [" + socket.room + "] destroyed");
			} else {
				// Neu no la X va thang O con
				// Neu no la O
				if (room.players.O.sub === socket.user.sub) {
					room.players.O = null;
				}
				if (room.players.X.sub === socket.user.sub) {
					room.players.X = null;
				}

				if (room.players.O === null && room.players.X === null) {
					listRooms = listRooms.filter((room) => room.id !== socket.room);
					console.log("Room [" + socket.room + "] destroyed");
				} else {
					io.to(room.id).emit("disconnectRoom", room);
					console.log(
						"Player [" +
							socket.user.nickname +
							"] leave room [" +
							socket.room +
							"]"
					);
				}
			}
		}
	});

	socket.on("disconnect", () => {
		console.log("disconnect");

		socket.broadcast.emit("user-offline", socket.id);

		socket.leave(socket.room);

		let room = listRooms.find((room) => room.id === socket.room);
		if (room && room.length) {
			room = room[0];
			if (room.players.O == null) {
				listRooms = listRooms.filter((room) => room.id !== socket.room);
				console.log("Room [" + socket.room + "] destroyed");
			} else {
				if (room.players.O.sub === socket.user.sub) {
					room.players.O.name = "DISCONNECTED";
				}
				if (room.players.X.sub === socket.user.sub) {
					room.players.X.name = "DISCONNECTED";
				}

				if (room.players.O === null && room.players.X === null) {
					listRooms = listRooms.filter((room) => room.id !== socket.room);
					console.log("Room [" + socket.room + "] destroyed");
				} else {
					io.to(room.id).emit("disconnectRoom", room);
					console.log(
						"Player [" +
							socket.user.nickname +
							"] leave room [" +
							socket.room +
							"]"
					);
				}
			}
		}
	});

	socket.on("join-room-quick", (data) => {
		console.log("join-room-quick");

		const listQuickRooms = listRooms.filter((room) => room.isQuick === true);

		console.log(listQuickRooms);

		let flag = false;

		listQuickRooms.map((room) => {
			if(room.players.O === null){
				room.players.O = socket.user;
				console.log(room.id);
				socket.room = room.id;
				socket.join(socket.room);
				io.in(room.id).emit("join-room-quick-success", room);

				console.log("Quick room [" + socket.room + "] played");
				flag = true;
			}
		})

		if(flag === true) return;

		let room = {
			id: Date.now(),
			players: {
				X: socket.user,
				O: null
			},
			host: socket.user,
			time: 30,
			isQuick: true,
		}

		listRooms.push(room);

		socket.room = room.id;
		socket.roomInfo = room;
		socket.join(socket.room);

		console.log("Quick room [" + socket.room + "] created");
	});

	socket.on("move", (data) => {
		socket.to(socket.room).emit("move", data);

		listRooms.map((room) => {
			if(room.id === socket.room) {
				room.lastMove = data;
			}
		})
	});

	socket.on("chat", (data) => {
		socket.emit("chat", {
			sender: socket.user.sub,
			message: data,
		});
		socket.to(socket.room).emit("chat", {
			sender: socket.user.sub,
			message: data,
		});
	});

	//refresh-game
	socket.on("refresh-game-request", (data) => {
		socket.to(socket.room).emit("refresh-game-request", data);
	});

	socket.on("refresh-game-result", (data) => {
		socket.to(socket.room).emit("refresh-game-result", data);
	});

	// surrender
	socket.on("surrender-request", () => {
		socket.to(socket.room).emit("surrender-request");
	});

	socket.on("surrender-result", () => {
		socket.to(socket.room).emit("surrender-result");
	});

	// draw
	socket.on("draw-request", () => {
		socket.to(socket.room).emit("draw-request");
	});

	socket.on("draw-result", (data) => {
		socket.to(socket.room).emit("draw-result", data);
	});

	// socket.on("on-reconnect", function (data) {
	// 	if (data.roomInfo) {
	// 		socket.data = data.user;

	// 		for (var i = 0; i < listRooms.length; i++) {
	// 			if (listRooms[i].id === data.roomInfo.id) {
	// 				if (listRooms[i].playerO === "DISCONNECTED") {
	// 					listRooms[i].playerO = data.user.name;
	// 					listRooms[i].pictureO = data.user.picture;
	// 				}
	// 				if (listRooms[i].playerX === "DISCONNECTED") {
	// 					listRooms[i].playerX = data.user.name;
	// 					listRooms[i].pictureX = data.user.picture;
	// 				}

	// 				socket.room = listRooms[i].id;
	// 				socket.join(socket.room);

	// 				socket.to(socket.room).emit("on-reconnect", listRooms[i]);
	// 				console.log(
	// 					"Player [" +
	// 						data.user.name +
	// 						"] reconnected in room [" +
	// 						socket.room +
	// 						"]"
	// 				);

	// 				if (listRooms[i].lastMove) {
	// 					socket.emit("move", listRooms[i].lastMove);
	// 				}

	// 				return;
	// 			}
	// 		}

	// 		socket.emit("on-reconnect", null);
	// 		console.log(
	// 			"Player [" +
	// 				data.user.name +
	// 				"] find room [" +
	// 				data.roomInfo.id +
	// 				"] but not exists"
	// 		);
	// 	}
	// });
};
