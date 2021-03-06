const User = require("../models/user");

let listRooms = [];
let listQuickPlayers = [];

const rep = 6;
const time = 5000;

const roomStatusMapping = {
  Playing: 0,
  Pending: 1,
};

module.exports = (io, socket) => {
  socket.on("user-online", (user) => {
    socket.user = { ...user, socketId: socket.id };
    const currentUsers = Array.from(io.sockets.sockets).map(
      ([socketId, { user }]) => ({
        ...user,
      })
    );
    io.emit("update-user-online-list", currentUsers);
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
    const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
    socket.emit("get-current-room-list", listOnlineRooms);
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

        const listOnlineRooms = listRooms.filter(
          (room) => room.isQuick === false
        );
        io.emit("get-current-room-list", listOnlineRooms);
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

    const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
    io.emit("get-current-room-list", listOnlineRooms);
    // io.emit("has-new-room", room);

    console.log("Room [" + socket.room + "] created");
  });

  socket.on("invite-room", (socketId) => {
    const newRoom = listRooms.find((r) => r.id === socket.roomInfo.id);
    console.log(newRoom);
    io.to(socketId).emit("receive-invite-request", newRoom);
  });

  socket.on("reply-invite-request", ({ isAccept, roomInfo: room }) => {
    const newRoom = listRooms.find((r) => r.id === room.id);
    if (isAccept) {
      if (newRoom.players.O !== null && newRoom.players.X !== null) {
        socket.emit("decline-reply-join-room", "Phòng này đã đủ người!");
        return;
      }
      if (newRoom.players.O === null && newRoom.players.X !== null)
        room.players.O = socket.user;
      else if (newRoom.players.O !== null && newRoom.players.X === null)
        room.players.X = socket.user;
      else return;

      socket.room = room.id;
      socket.roomInfo = room;
      socket.join(room.id);
      socket.emit("join-room-success", room);

      listRooms = listRooms.map((oldRoom) =>
        oldRoom.id === room.id ? room : oldRoom
      );
      const listOnlineRooms = listRooms.filter(
        (room) => room.isQuick === false
      );
      io.emit("get-current-room-list", listOnlineRooms);

      io.to(room.host.socketId).emit("room-detail-update", room);
      io.to(room.host.socketId).emit("accept-invite-request", socket.user);
    } else {
      io.to(room.host.socketId).emit("decline-invite-request", socket.user);
    }
  });

  socket.on("leave-room", () => {
    if (socket.room && socket.roomInfo) {
      socket.leave(socket.room);
      const newRoom = listRooms.find((room) => room.id === socket.room);
      if (newRoom) {
        // const newRoom = JSON.parse(JSON.stringify(room));
        const isPlayerX =
          newRoom.players.X && socket.user.sub === newRoom.players.X.sub;

        const isHost = newRoom.host && newRoom.host.sub === socket.user.sub;

        // neu no la host
        if (isHost) {
          // neu no la X va la host
          if (isPlayerX) {
            newRoom.host = newRoom.players.O;
            newRoom.players.X = null;
          }
          // neu no la host va la O
          else {
            newRoom.host = newRoom.players.X;
            newRoom.players.O = null;
          }
        } else {
          if (isPlayerX) newRoom.players.X = null;
          else newRoom.players.O = null;
        }
        if (newRoom.players.X === null && newRoom.players.O === null) {
          console.log("Huy room ", socket.room);
          // xoa ra khoi list
          listRooms = listRooms.filter((room) => room.id !== socket.room);
          // xoa room
          // io.emit("room-list-delete-room", socket.roomInfo.id);
          const listOnlineRooms = listRooms.filter(
            (room) => room.isQuick === false
          );
          io.emit("get-current-room-list", listOnlineRooms);
        } else {
          // thong bao cho room
          //   listRooms = listRooms.map((room) =>
          //     room.id === newRoom.id ? { ...newRoom } : room
          //   );
          io.to(socket.room).emit("room-detail-update", newRoom);
          // thong bao cho moi nguoi
          const listOnlineRooms = listRooms.filter(
            (room) => room.isQuick === false
          );
          io.emit("get-current-room-list", listOnlineRooms);
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
    const listOnlineRooms = listRooms.filter((room) => room.isQuick === false);
    io.emit("get-current-room-list", listOnlineRooms);
  });

  socket.on("out-game", () => {
    console.log("out");
    socket.leave(socket.room);
    const room = listRooms.find((room) => room.id === socket.room);
    if (room) {
      const newRoom = JSON.parse(JSON.stringify(room));
      if (newRoom.players.O && newRoom.players.O.sub === socket.user.sub) {
        newRoom.players.O.name = "DISCONNECTED";
      }
      if (newRoom.players.X && newRoom.players.X.sub === socket.user.sub) {
        newRoom.players.X.name = "DISCONNECTED";
      }
      console.log(newRoom.players.O.name, newRoom.players.X.name);
      if (
        (newRoom.players.O || {}).name === "DISCONNECTED" &&
        (newRoom.players.X || {}).name === "DISCONNECTED"
      ) {
        listRooms = listRooms.filter((room) => room.id !== socket.room);
        console.log("Room [" + socket.room + "] destroyed");

        const listOnlineRooms = listRooms.filter(
          (room) => room.isQuick === false
        );

        console.log("Cap nhap phong");
        io.emit("get-current-room-list", listOnlineRooms);
      } else {
        io.to(room.id).emit("disconnectRoom", newRoom);
        listRooms = listRooms.map((room) =>
          room.id === newRoom.id ? { ...newRoom } : room
        );
        console.log(
          "Player [" +
            socket.user.nickname +
            "] leave room [" +
            socket.room +
            "]"
        );
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECTED");
    socket.leave(socket.room);
    const room = listRooms.find((room) => room.id === socket.room);
    if (room) {
      const newRoom = JSON.parse(JSON.stringify(room));
      if (newRoom.players.O && newRoom.players.O.sub === socket.user.sub) {
        newRoom.players.O.name = "DISCONNECTED";
      }
      if (newRoom.players.X && newRoom.players.X.sub === socket.user.sub) {
        newRoom.players.X.name = "DISCONNECTED";
      }
      if (
        (newRoom.players.O || {}).name === "DISCONNECTED" &&
        (newRoom.players.X || {}).name === "DISCONNECTED"
      ) {
        listRooms = listRooms.filter((room) => room.id !== socket.room);
        console.log("Room [" + socket.room + "] destroyed");

        const listOnlineRooms = listRooms.filter(
          (room) => room.isQuick === false
        );
        io.emit("get-current-room-list", listOnlineRooms);
      } else {
        io.to(room.id).emit("disconnectRoom", newRoom);
        listRooms = listRooms.map((room) =>
          room.id === newRoom.id ? { ...newRoom } : room
        );
        console.log(
          "Player [" +
            socket.user.displayName +
            "] leave room [" +
            socket.room +
            "]"
        );
      }
    }

    const currentUsers = Array.from(io.sockets.sockets).map(
      ([socketId, { user }]) => ({
        ...user,
      })
    );
    socket.broadcast.emit("update-user-online-list", currentUsers);
  });

  //   const chooseQuickRoom = (point) => {
  //     const listQuickRooms = listRooms.filter(
  //       (room) =>
  //         room.isQuick === true &&
  //         (room.players.O === null || room.players.X === null) //ok ma
  //     );

  //     if (listQuickRooms.length === 0) return false;

  //     // let pickedRoom = {
  // 	// 	minDifferencePoint = -1,
  // 	// 	room,
  // 	// };
  //     let minDifferencePoint = -1;

  //     listQuickRooms.map((room) => {
  //       let differencePoint;
  //       if (room.players.O === null) {
  //         differencePoint = Math.abs(room.players.X.trophy.point - point);
  //       } else {
  //         differencePoint = Math.abs(room.players.O.trophy.point - point);
  //       }
  //       if (minDifferencePoint < differencePoint) {
  //         minDifferencePoint = differencePoint;
  //         pickedRoom = room;
  //       }
  //     });
  //     return pickedRoom;
  //   };

  //   socket.on("join-room-quick", () => {
  //     console.log("join-room-quick");

  // 	let mostResonableRoom = chooseQuickRoom(socket.user.trophy.point);

  // 	setTimeout(()=>{

  // 	}, 3000)

  //     if (mostResonableRoom) {
  //       if (mostResonableRoom.players.O === null)
  //         mostResonableRoom.players.O = socket.user;
  //       else mostResonableRoom.players.X = socket.user;
  //       socket.room = mostResonableRoom.id;
  //       socket.roomInfo = mostResonableRoom;
  //       socket.join(socket.room);

  //       io.to(mostResonableRoom.id).emit(
  //         "join-room-quick-success",
  //         mostResonableRoom
  //       );

  //       console.log("Quick room [" + socket.room + "] played");
  //       return;
  //     }

  //     let room = {
  //       id: Date.now(),
  //       players: {
  //         X: socket.user,
  //         O: null,
  //       },
  //       host: socket.user,
  //       time: 30,
  //       isQuick: true,
  //     };

  //     listRooms.push(room);

  //     socket.room = room.id;
  //     socket.roomInfo = room;

  //     socket.join(socket.room);

  //     console.log("Quick room [" + socket.room + "] created");
  //   });

  //   socket.on("stop-join-room-quick", () => {
  //     const listQuickRooms = listRooms.filter((room) => room.isQuick === true);

  //     listQuickRooms.map((room) => {
  //       if (room.players.X.sub === socket.user.sub && room.players.O === null) {
  //         listRooms = listRooms.filter((room) => room.id !== socket.room);
  //         return;
  //       }
  //     });

  //     socket.leave(socket.room);
  //   });

  ////new mech

  const chooseQuickPlayer = (player, isLast) => {
    if (
      listQuickPlayers.filter((player) => player.socketId === socket.id)
        .length === 0
    ) {
      return false;
    }

    const listAnotherQuickPlayer = listQuickPlayers.filter(
      (player) => player.socketId !== socket.id
    );

    if (listAnotherQuickPlayer.length === 0) return false;

    let minDifferencePoint = -1;
    let pickedPlayer;
    listAnotherQuickPlayer.map((p) => {
      let differencePoint = Math.abs(p.trophy.point - player.trophy.point);

      if (minDifferencePoint > differencePoint || minDifferencePoint === -1) {
        minDifferencePoint = differencePoint;
        pickedPlayer = p;
      }
    });

    if (minDifferencePoint <= 100 || isLast) return pickedPlayer;
    return false;
  };

  socket.on("join-room-quick", () => {
    const player = socket.user;

    console.log("Player [" + player.name + "] want to find another player");

    listQuickPlayers.push(player);

    let mostResonablePlayer = false;

    let i = 0;
    let pointStop = 1;
    do {
      setTimeout(() => {
        let isLast = pointStop === rep;
        if (
          listQuickPlayers.filter((player) => player.socketId === socket.id)
            .length === 0
        ) {
          console.log("Da bi kick ra ngoai");
          return;
        }

        mostResonablePlayer = chooseQuickPlayer(player, isLast);
        console.log(mostResonablePlayer);

        if (mostResonablePlayer !== false) {
          console.log("tim duoc nguoi choi: " + mostResonablePlayer.name);

          listQuickPlayers = listQuickPlayers.filter(
            (player) => player.socketId !== socket.id
          );

          listQuickPlayers = listQuickPlayers.filter(
            (player) => player.socketId !== mostResonablePlayer.socketId
          );

          console.log("List player sau khi paired: \n");
          console.log(listQuickPlayers);

          let room = {
            id: Date.now(),
            players: {
              X: socket.user,
              O: mostResonablePlayer,
            },
            host: socket.user,
            time: 30,
            isQuick: true,
          };

          listRooms.push(room);

          socket.room = room.id;
          socket.roomInfo = room;

          socket.join(socket.room);

          io.to(mostResonablePlayer.socketId).emit("pair-success", room);

          console.log("Quick room [" + socket.room + "] created");

          return;
        }
        if (isLast) {
          listQuickPlayers = listQuickPlayers.filter(
            (player) => player.socketId !== socket.id
          );
          console.log("fail");
          socket.emit("join-room-quick-fail");
          return;
        }
        pointStop++;
      }, (i + 1) * time);

      i++;
    } while (i < rep);
  });

  socket.on("stop-join-room-quick", () => {
    listQuickPlayers = listQuickPlayers.filter(
      (player) => player.socketId !== socket.id
    );
  });

  socket.on("pair-success", (room) => {
    socket.room = room.id;
    socket.roomInfo = room;

    socket.join(socket.room);

    io.to(room.id).emit("join-room-quick-success", room);
  });

  //new mech end

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
