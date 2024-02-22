const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: 'https://code-editor-6rqa.onrender.com', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});
const PORT = 8000; 
const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected');

socket.on('join-room', ({ roomId, username }, callback) => {
   
    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: [],
        messages: [], 
        code: '//new code is added',
      };
    }

    const room = rooms[roomId];
    const user = { id: socket.id, username };

   
    room.users.push(user);

    callback({
      users: room.users.map((user) => user.username),
      messages: room.messages,
      code: room.code,
    });

    socket.to(roomId).emit('user-joined', { users: room.users.map((user) => user.username) });

    console.log(`${username} joined room ${roomId}`);
    socket.join(roomId);
  });

socket.on('chat-message', ({ roomId, message, sender }) => {
  let room = rooms[roomId];

 
  if (!room) {
    room = {
      users: [],
      messages: [], 
      code: '',
    };
    rooms[roomId] = room;
  }

  room.messages.push({ message, sender });

   socket.to(roomId).emit('chat-message', { message, sender });

  console.log(`New chat message in room ${roomId}`);
});


 socket.on('code-update', ({ roomId, code }) => {
    let room = rooms[roomId];

   
    room.code = code;

   socket.in(roomId).emit('code-update', code);

    console.log(`Code updated in room ${roomId}`);
  });

socket.on('disconnect', () => {
    console.log('A user disconnected');

   
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex((user) => user.id === socket.id);
      if (userIndex !== -1) {
        const disconnectedUser = room.users[userIndex];
        room.users.splice(userIndex, 1);

         io.to(roomId).emit('user-left', { users: room.users.map((user) => user.username) });

        console.log(`${disconnectedUser.username} left room ${roomId}`);

          if (room.users.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} removed`);
        }

        break;
      }
    }
  });
});

http.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});
