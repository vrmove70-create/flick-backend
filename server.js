const WebSocket = require('ws');

const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port });

// Хранилище пользователей и данных
const clients = new Map(); // userId -> ws
const messages = [];       // история чата

wss.on('connection', (ws) => {
  console.log('Новый клиент подключился');

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', text: 'Неверный формат сообщения' }));
      return;
    }

    switch (msg.type) {

      // 1. Регистрация пользователя
      case 'register': {
        ws.userId = msg.userId;
        ws.username = msg.username;
        clients.set(msg.userId, ws);
        console.log(`Пользователь зарегистрирован: ${msg.username}`);

        // Отправляем историю чата
        ws.send(JSON.stringify({ type: 'history', messages }));

        // Уведомляем всех о новом пользователе
        broadcast({
          type: 'notification',
          text: `${msg.username} вошёл в приложение`
        }, ws);
        break;
      }

      // 2. Отправка сообщения в чат
      case 'chat': {
        const chatMsg = {
          type: 'chat',
          from: ws.username || 'Аноним',
          text: msg.text,
          time: new Date().toISOString()
        };
        messages.push(chatMsg);
        if (messages.length > 100) messages.shift(); // хранить последние 100

        broadcast(chatMsg); // всем пользователям
        break;
      }

      // 3. Личное сообщение
      case 'private': {
        const target = clients.get(msg.toUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({
            type: 'private',
            from: ws.username,
            text: msg.text,
            time: new Date().toISOString()
          }));
        } else {
          ws.send(JSON.stringify({ type: 'error', text: 'Пользователь не найден или офлайн' }));
        }
        break;
      }

      // 4. Отправка данных (например, пост, фото и т.д.)
      case 'data': {
        broadcast({
          type: 'data',
          from: ws.username,
          payload: msg.payload,
          time: new Date().toISOString()
        });
        break;
      }

      // 5. Уведомление конкретному пользователю
      case 'notify': {
        const target = clients.get(msg.toUserId);
        if (target && target.readyState === WebSocket.OPEN) {
          target.send(JSON.stringify({
            type: 'notification',
            from: ws.username,
            text: msg.text
          }));
        }
        break;
      }

      default:
        ws.send(JSON.stringify({ type: 'error', text: 'Неизвестный тип сообщения' }));
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      broadcast({
        type: 'notification',
        text: `${ws.username} покинул приложение`
      });
    }
    console.log('Клиент отключился');
  });
});

// Отправка всем подключённым клиентам
function broadcast(message, exclude = null) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

console.log(`Сервер запущен на порту ${port}`);
