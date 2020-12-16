const User = require("../models/user");

let listRooms = [];

module.exports = (io, socket) => {
  socket.on("user-online", (user) => {
    User.findById(user.userId).then((matchedUser) => {
      matchedUser.socketId = socket.id;
      matchedUser.save().then((doc) => {
        socket.broadcast.emit("user-online", user);
        User.find({ socketId: { $nin: [socket.id, null] } }).then((list) => {
          io.to(socket.id).emit("get-online", list);
        });
      });
    });
  });

  socket.on("joinroom", (data) => {
    socket.data = data;

    for (let i = 0; i < listRooms.length; i++) {
      if (listRooms[i].playerO == null) {
        listRooms[i].playerO = data.name;
        listRooms[i].imageO = data.image;
        socket.room = listRooms[i].id;
        socket.join(socket.room);

        io.in(listRooms[i].id).emit("joinroom-success", listRooms[i]);

        console.log("Room [" + socket.room + "] played");
        return;
      }
    }

    let room = {
      id: data.userName + Date.now(),
      playerX: data.name,
      imageX: data.image,
      playerO: null,
      imageO: null,
    };
    listRooms.push(room);

    socket.room = room.id;
    socket.join(socket.room);

    console.log("Room [" + socket.room + "] created");
  });

  socket.on("move", (data) => {
    socket.to(socket.room).emit("move", data);

    for (let i = 0; i < listRooms.length; i++) {
      if (listRooms[i].id == socket.room) {
        listRooms[i].lastMove = data;
      }
    }
  });

  socket.on("chat", (data) => {
    socket.emit("chat", {
      sender: socket.data.name,
      message: data,
    });
    socket.to(socket.room).emit("chat", {
      sender: socket.data.name,
      message: data,
    });
  });

  socket.on("disconnect", function () {
    io.emit("user-offline", socket.id);
    User.findOne({ socketId: socket.id }).then((matchedUser) => {
      if (matchedUser) {
        matchedUser.socketId = null;
        matchedUser.save();
      }
    });

    socket.removeAllListeners();

    socket.leave(socket.room);

    for (let i = 0; i < listRooms.length; i++) {
      if (listRooms[i].id == socket.room) {
        if (listRooms[i].playerO == null) {
          listRooms.splice(i, 1);
          console.log("Room [" + socket.room + "] destroyed");
        } else {
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
                socket.data.userName +
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

  socket.on("on-reconnect", function (data) {
    if (data.roomInfo) {
      socket.data = data.user;

      for (var i = 0; i < listRooms.length; i++) {
        if (listRooms[i].id === data.roomInfo.id) {
          if (listRooms[i].playerO === "DISCONNECTED") {
            listRooms[i].playerO = data.user.name;
            listRooms[i].imageO = data.user.image;
          }
          if (listRooms[i].playerX === "DISCONNECTED") {
            listRooms[i].playerX = data.user.name;
            listRooms[i].imageX = data.user.image;
          }

          socket.room = listRooms[i].id;
          socket.join(socket.room);

          socket.to(socket.room).emit("on-reconnect", listRooms[i]);
          console.log(
            "Player [" +
              data.user.userName +
              "] reconnected in room [" +
              socket.room +
              "]"
          );

          if (listRooms[i].lastMove) {
            socket.emit("move", listRooms[i].lastMove);
          }

          return;
        }
      }

      socket.emit("on-reconnect", null);
      console.log(
        "Player [" +
          data.user.userName +
          "] find room [" +
          data.roomInfo.id +
          "] but not exists"
      );
    }
  });
};
