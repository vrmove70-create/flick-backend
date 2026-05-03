const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const users = {}; // userId -> socketId

io.on('connection', (socket) => {
  console.log('Клиент подключился:', socket.id);

  // Регистрация пользователя
  socket.on('setup', (userId) => {
    users[userId] = socket.id;
    socket.join(userId);
    console.log('Пользователь:', userId);
    socket.emit('connected');
  });

  // Отправка сообщения
  socket.on('send_message', (message) => {
    const { chatId, receiverId } = message;
    if (receiverId && users[receiverId]) {
      socket.to(users[receiverId]).emit('message_received', message);
    }
    io.to(chatId).emit('message_received', message);
  });

  // Печатает сообщение
  socket.on('typing', (chatId) => {
    socket.to(chatId).emit('typing', chatId);
  });

  socket.on('stop_typing', (chatId) => {
    socket.to(chatId).emit('stop_typing');
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключился');
    Object.keys(users).forEach(key => {
      if (users[key] === socket.id) delete users[key];
    });
  });
});

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
