const User = require("../models/user");

let listRooms = [];

const roomStatusMapping = {
	Playing: 0,
	Pending: 1,
};

module.exports = (io, socket) => {
	socket.on("user-online", (user) => {
		socket.user = { ...user, socketId: socket.id };
	});

	socket.on("get-user-online-list", () => {
		const currentUsers = Array.from(io.sockets.sockets).map(
			([socketId, { user }]) => ({
				...user,
			})
		);
		io.emit("update-user-online-list", currentUsers);
	});

	socket.on("get-current-room-list", () => {
		// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
		socket.emit("get-current-room-list", listRooms);
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

				// const listOnlineRooms = listRooms.filter(
				// 	(room) => room.isQuick === false
				// );
				io.emit("get-current-room-list", listRooms);
			} else socket.emit("join-room-fail", "Sai mật khẩu");
		}
	});

	socket.on("create-room-request", (roomName, password, time = 30000) => {
		const room = {
			id: Date.now(),
			roomName,
			players: {
				X: socket.user,
				O: null,
			},
			host: socket.user,
			password,
			time,
			status: roomStatusMapping.Pending,
			isQuick: false,
		};
		listRooms.push(room);

		socket.room = room.id;
		socket.roomInfo = room;
		socket.join(socket.room);

		socket.emit("join-room-success", room);

		// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
		io.emit("get-current-room-list", listRooms);
		// io.emit("has-new-room", room);

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
			socket.join(room.id);
			socket.emit("join-room-success", room);

			listRooms = listRooms.map((oldRoom) =>
				oldRoom.id === room.id ? room : oldRoom
			);
			// const listOnlineRooms = listRooms.filter(
			// 	(room) => room.isQuick === false
			// );
			io.emit("get-current-room-list", listRooms);

			io.to(room.host.socketId).emit("room-detail-update", room);
			io.to(room.host.socketId).emit("accept-invite-request", socket.user);
		} else {
			io.to(room.host.socketId).emit("decline-invite-request", socket.user);
		}
	});

	socket.on("leave-room", () => {
		if (socket.room && socket.roomInfo) {
			socket.leave(socket.room);
			const room = listRooms.find((room) => room.id === socket.room);
			if (room) {
				const isPlayerX =
					room.players.X && socket.user.sub === room.players.X.sub;

				const isHost = room.host && room.host.sub === socket.user.sub;

				// neu no la host
				if (isHost) {
					// neu no la X va la host
					if (isPlayerX) {
						room.host = room.players.O;
						room.players.X = null;
					}
					// neu no la host va la O
					else {
						room.host = room.players.X;
						room.players.O = null;
					}
				} else {
					if (isPlayerX) room.players.X = null;
					else room.players.O = null;
				}
				if (room.players.X === null && room.players.O === null) {
					console.log("Huy room ", socket.room);
					// xoa ra khoi list
					listRooms = listRooms.filter((room) => room.id !== socket.room);
					// xoa room
					// io.emit("room-list-delete-room", socket.roomInfo.id);
					// const listOnlineRooms = listRooms.filter(
					// 	(room) => room.isQuick === false
					// );
					io.emit("get-current-room-list", listRooms);
				} else {
					// thong bao cho room
					io.to(socket.room).emit("room-detail-update", room);
					// thong bao cho moi nguoi
					// const listOnlineRooms = listRooms.filter(
					// 	(room) => room.isQuick === false
					// );
					io.emit("get-current-room-list", listRooms);
				}

				delete socket.room;
				delete socket.roomInfo;
			}
		}
	});

	socket.on("start-game-request", () => {
		io.to(socket.room).emit("start-game");

		listRooms = listRooms.map((room) =>
			room.id === socket.room
				? { ...room, status: roomStatusMapping.Playing }
				: room
		);
		// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
		io.emit("get-current-room-list", listRooms);
	});

	socket.on("out-game", () => {
		console.log("out");
		socket.leave(socket.room);
		const room = listRooms.find((room) => room.id === socket.room);
		if (room) {
			const isPlayerX =
				room.players.X && socket.user.sub === room.players.X.sub;
			if (isPlayerX) {
				// neu no la X va thang O ko con
				if (room.players.O == null) {
					console.log("Room [" + socket.room + "] destroyed");
					listRooms = listRooms.filter((room) => room.id !== socket.room);
					// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
					io.emit("get-current-room-list", listRooms);
					delete socket.room;
					delete socket.roomInfo;
				}
				// thang O con`
				else {
					room.players.X = null;
					// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
					io.emit("get-current-room-list", listRooms);
					io.to(socket.room).emit("enemy-out");
					delete socket.room;
					delete socket.roomInfo;
				}
			} else {
				if (room.players.X == null) {
					console.log("Room [" + socket.room + "] destroyed");
					listRooms = listRooms.filter((room) => room.id !== socket.room);
					// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
					io.emit("get-current-room-list", listRooms);
					delete socket.room;
					delete socket.roomInfo;
				}
				// thang X con`
				else {
					room.players.O = null;
					// const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
					io.emit("get-current-room-list", listRooms);
					io.to(socket.room).emit("enemy-out");
					delete socket.room;
					delete socket.roomInfo;
				}

				// if (room.players.O === null && room.players.X === null) {
				// 	listRooms = listRooms.filter((room) => room.id !== socket.room);
				// 	console.log("Room [" + socket.room + "] destroyed");
				// } else {
				// 	io.to(room.id).emit("disconnectRoom", room);
				console.log(
					"Player [" +
						socket.user.nickname +
						"] leave room [" +
						socket.room +
						"]"
				);
				// 	}
			}
		}
	});

	socket.on("disconnect", () => {
		socket.leave(socket.room);
		const room = listRooms.find((room) => room.id === socket.room);
		if (room) {
			// neu no la X va thang O ko con
			if (room.players.O == null) {
				listRooms = listRooms.filter((room) => room.id !== socket.room);
				console.log("Room [" + socket.room + "] destroyed");
			} else {
				// Neu no la X va thang O con
				// Neu no la O
				if (room.players.O && room.players.O.sub === socket.user.sub) {
					room.players.O = null;
				}
				if (room.players.X && room.players.X.sub === socket.user.sub) {
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

		const currentUsers = Array.from(io.sockets.sockets).map(
			([socketId, { user }]) => ({
				...user,
			})
		);
		socket.broadcast.emit("update-user-online-list", currentUsers);
	});

	const chooseQuickRoom = (point) => {
		const listQuickRooms = listRooms.filter(
			(room) =>
				room.isQuick === true &&
				(room.players.O === null || room.players.X === null)
		);

		console.log(listQuickRooms.length);

		if (listQuickRooms.length === 0) return false;

		let pickedRoom;
		let minDifferencePoint = -1;

		listQuickRooms.map((room) => {
			let differencePoint;
			if (room.players.O === null) {
				differencePoint = Math.abs(room.players.X.trophy.point - point);
			} else {
				differencePoint = Math.abs(room.players.O.trophy.point - point);
			}
			if (minDifferencePoint < differencePoint) {
				minDifferencePoint = differencePoint;
				pickedRoom = room;
			}
		});
		return pickedRoom;
	};

	socket.on("join-room-quick", () => {
		console.log("join-room-quick");

		const mostResonableRoom = chooseQuickRoom(socket.user.trophy.point);

		if (mostResonableRoom) {
			if (mostResonableRoom.players.O === null)
				mostResonableRoom.players.O = socket.user;
			else mostResonableRoom.players.X = socket.user;
			socket.room = mostResonableRoom.id;
			socket.roomInfo = mostResonableRoom;
			socket.join(socket.room);

			io.in(mostResonableRoom.id).emit(
				"join-room-quick-success",
				mostResonableRoom
			);

			console.log("Quick room [" + socket.room + "] played");
			return;
		}

		let room = {
			id: Date.now(),
			players: {
				X: socket.user,
				O: null,
			},
			host: socket.user,
			time: 30,
			isQuick: true,
		};

		listRooms.push(room);

		socket.room = room.id;
		socket.roomInfo = room;
		socket.join(socket.room);

		console.log("Quick room [" + socket.room + "] created");
	});

	socket.on("stop-join-room-quick", () => {
		const listQuickRooms = listRooms.filter((room) => room.isQuick === true);

		listQuickRooms.map((room) => {
			if (room.players.X.sub === socket.user.sub && room.players.O === null) {
				listRooms = listRooms.filter((room) => room.id !== socket.room);
				return;
			}
		});

		socket.leave(socket.room);
	});

	socket.on("move", (data) => {
		socket.to(socket.room).emit("move", data);

		listRooms.map((room) => {
			if (room.id === socket.room) {
				room.lastMove = data;
			}
		});
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
