const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer((req, res) => {
  res.writeHead(200);
  res.end('Flick server running!');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const users = {};

io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);

  socket.on('setup', (userId) => {
    users[userId] = socket.id;
    socket.join(userId);
    socket.emit('connected');
  });

  socket.on('send_message', (message) => {
    const { chatId, receiverId } = message;
    if (receiverId && users[receiverId]) {
      socket.to(users[receiverId]).emit('message_received', message);
    }
    io.to(chatId).emit('message_received', message);
  });

  socket.on('typing', (chatId) => {
    socket.to(chatId).emit('typing', chatId);
  });

  socket.on('stop_typing', (chatId) => {
    socket.to(chatId).emit('stop_typing');
  });

  socket.on('disconnect', () => {
    Object.keys(users).forEach(key => {
      if (users[key] === socket.id) delete users[key];
    });
  });
});

const port = process.env.PORT || 10000;
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${port}`);
});
