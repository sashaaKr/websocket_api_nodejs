import { Server } from "ws";

const wss = new Server({ port: 8181 });
const uuid = require("node-uuid");

const clients = [];

function wsSend(type, client_uuid, nickname, message) {
  for (let i = 0; i < clients.length; i++) {
    let clientSocket = clients[i].ws;
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          type: type,
          id: client_uuid,
          nickname: nickname,
          message: message,
        })
      );
    }
  }
}

let clientIndex = 1;

wss.on("connection", function (ws) {
  const client_uuid = uuid.v4();
  const nickname = "AnonymousUser" + clientIndex;
  clientIndex += 1;
  clients.push({ id: client_uuid, ws: ws, nickname: nickname });
  console.log("client [%s] connected", client_uuid);

  const connect_message = nickname + " has connected";
  wsSend("notification", client_uuid, nickname, connect_message);

  ws.on("message", function (message) {
    if (message.indexOf("/nick") === 0) {
      const nickname_array = message.split(" ");
      if (nickname_array.length >= 2) {
        const old_nickname = nickname;
        nickname = nickname_array[1];
        const nickname_message =
          "Client " + old_nickname + " changed to " + nickname;
        wsSend("nick_update", client_uuid, nickname, nickname_message);
      }
    } else {
      wsSend("message", client_uuid, nickname, message);
    }
  });

  const closeSocket = function (customMessage) {
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].id == client_uuid) {
        let disconnect_message;
        if (customMessage) {
          disconnect_message = customMessage;
        } else {
          disconnect_message = nickname + " has disconnected";
        }
        wsSend("notification", client_uuid, nickname, disconnect_message);
        clients.splice(i, 1);
      }
    }
  };
  ws.on("close", function () {
    closeSocket();
  });

  process.on("SIGINT", function () {
    console.log("Closing things");
    closeSocket("Server has disconnected");
    process.exit();
  });
});
