import url from 'url';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080, clientTracking: true });
console.log("Server is Live on Port 8080")

let rooms = {};
let messages = {};

const getRoomFromRequest = (req) => {
  const parameters = url.parse(req.url, true);
  return parameters.query.room;
};

const addClientToRoom = (ws, room) => {
  if (!rooms[room]) {
    rooms[room] = [];
  }
  rooms[room].push(ws);
};

const addMessageToRoom = (room, message) => {
  if (!messages[room]) {
    messages[room] = [];
  }
  messages[room].push(message);
};

const broadcastMessage = (ws, room, data) => {
  const parsedData = JSON.parse(data);
  const message = {
    userName: parsedData.userName,
    message: parsedData.message
  };
  addMessageToRoom(room, message);
  rooms[room].forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

const removeClientFromRoom = (ws, room) => {
  rooms[room] = rooms[room].filter(client => client !== ws);
};

wss.on('connection', (ws, req) => {
  ws.id = uuidv4();
  const parameters = url.parse(req.url, true);
  const room = parameters.query.room;
  const allMessagesFromRoom = parameters.query.allMessagesFromRoom;

  addClientToRoom(ws, room);
  if (allMessagesFromRoom) {
    const roomMessages = messages[allMessagesFromRoom] || [];
    const lastMessages = roomMessages.slice(-30);
    ws.send(JSON.stringify(lastMessages));
  }

  ws.on('message', (data) => broadcastMessage(ws, room, data));
  ws.on('close', () => removeClientFromRoom(ws, room));
});
