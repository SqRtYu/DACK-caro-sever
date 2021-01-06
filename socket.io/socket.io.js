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
    // Send to old user that new user has just logged in
    socket.broadcast.emit("user-online", { ...user, socketId: socket.id });
    // Save User to Socket
    socket.user = user;
    // }
  });

  socket.on("join-room-request", (room, password) => {
    // chỗ này check password các thứ
    socket.emit("join-room-success", { roomId: room.id });
  });

  socket.on("disconnect", () => {
    console.log("disconnect");

    socket.broadcast.emit("user-offline", socket.id);
    // socket.removeAllListeners();
    socket.leave(socket.room);

    for (let i = 0; i < listRooms.length; i++) {
      if (listRooms[i].id == socket.room) {
        if (listRooms[i].playerO == null) {
          listRooms.splice(i, 1);
          console.log("Room [" + socket.room + "] destroyed");
        } else {
          console.log(socket.data.name);
          if (listRooms[i].playerO === socket.data.name) {
            listRooms[i].playerO = "DISCONNECTED";
          }
          if (listRooms[i].playerX === socket.data.name) {
            listRooms[i].playerX = "DISCONNECTED";
          }

          if (
            listRooms[i].playerO === "DISCONNECTED" &&
            listRooms[i].playerX === "DISCONNECTED"
          ) {
            listRooms.splice(i, 1);
            console.log("Room [" + socket.room + "] destroyed");
          } else {
            io.to(listRooms[i].id).emit("disconnectRoom", listRooms[i]);
            console.log(
              "Player [" +
                socket.data.name +
                "] leave room [" +
                socket.room +
                "]"
            );
          }
        }

        break;
      }
    }
  });

  socket.on("join-room-quick", (data) => {
    console.log("join-room-quick");
    socket.data = data;

    for (let i = 0; i < listRooms.length; i++) {
      if (listRooms[i].playerO == null) {
        listRooms[i].playerO = data.name;
        listRooms[i].pictureO = data.picture;
        socket.room = listRooms[i].id;
        socket.join(socket.room);

        io.in(listRooms[i].id).emit("join-room-quick-success", listRooms[i]);

        console.log("Room [" + socket.room + "] played");
        return;
      }
    }

    let room = {
      id: Date.now(),
      playerX: data.name,
      pictureX: data.picture,
      playerO: null,
      pictureO: null,
    };
    listRooms.push(room);

    socket.room = room.id;
    socket.join(socket.room);

    console.log("Room [" + socket.room + "] created");
  });

  socket.on("move", (data) => {
    console.log("move");
    console.log(socket.id);
    socket.to(socket.room).emit("move", data);

    for (let i = 0; i < listRooms.length; i++) {
      if (listRooms[i].id == socket.room) {
        listRooms[i].lastMove = data;
      }
    }
  });

  socket.on("chat", (data) => {
    console.log("chat" + data);
    socket.emit("chat", {
      sender: socket.data.name,
      message: data,
    });
    socket.to(socket.room).emit("chat", {
      sender: socket.data.name,
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
	  console.log("draw-request");
      socket.to(socket.room).emit("draw-request");
  });

  socket.on("draw-result", (data) => {
	  console.log("draw-result");
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
