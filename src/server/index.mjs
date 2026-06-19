import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 存储访问码和会话信息
const accessCodes = new Map();
const streamSessions = new Map();
const viewers = new Map();

// 生成访问码
function generateAccessCode(length = 6) {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 检查访问码是否过期
function isAccessCodeExpired(createdAt, expiryHours = 24) {
  const now = Date.now();
  const expiryTime = createdAt + (expiryHours * 60 * 60 * 1000);
  return now > expiryTime;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 生成新的访问码
  socket.on('generate-access-code', () => {
    const code = generateAccessCode();
    const session = {
      code,
      createdAt: Date.now(),
      streamerSocket: socket.id,
      viewers: new Set(),
      isStreaming: false
    };
    accessCodes.set(code, session);
    streamSessions.set(socket.id, code);
    socket.emit('access-code', code);
    console.log('Generated access code:', code);
  });

  // 开始流式传输
  socket.on('start-stream', () => {
    const code = streamSessions.get(socket.id);
    if (!code) {
      console.warn('No access code found for socket:', socket.id);
      return;
    }

    const session = accessCodes.get(code);
    if (session) {
      session.isStreaming = true;
      session.streamerSocket = socket.id;
      // 通知所有查看者流已开始
      session.viewers.forEach(viewerSocket => {
        io.to(viewerSocket).emit('stream-status', true);
      });
      console.log('Stream started for code:', code);
    }
  });

  // 停止流式传输
  socket.on('stop-stream', () => {
    const code = streamSessions.get(socket.id);
    if (!code) return;

    const session = accessCodes.get(code);
    if (session) {
      session.isStreaming = false;
      // 通知所有查看者流已停止
      session.viewers.forEach(viewerSocket => {
        io.to(viewerSocket).emit('stream-status', false);
      });
      console.log('Stream stopped for code:', code);
    }
  });

  // 接收视频帧
  socket.on('video-frame', (frameData) => {
    const code = streamSessions.get(socket.id);
    if (!code) return;

    const session = accessCodes.get(code);
    if (!session || !session.isStreaming) return;

    // 转发给所有查看者
    session.viewers.forEach(viewerSocket => {
      io.to(viewerSocket).emit('video-frame', frameData);
    });
  });

  // 查看者连接
  socket.on('view-stream', (code) => {
    const session = accessCodes.get(code);
    if (!session) {
      socket.emit('error', 'Invalid access code');
      return;
    }

    // 检查访问码是否过期
    if (isAccessCodeExpired(session.createdAt)) {
      socket.emit('error', 'Access code expired');
      accessCodes.delete(code);
      return;
    }

    session.viewers.add(socket.id);
    viewers.set(socket.id, code);

    // 通知流式传输者
    if (session.streamerSocket) {
      io.to(session.streamerSocket).emit('viewer-joined', session.viewers.size);
      // 发送当前流状态
      socket.emit('stream-status', session.isStreaming);
    }

    console.log('Viewer joined for code:', code, 'Total viewers:', session.viewers.size);
  });

  // 断开连接
  socket.on('disconnect', () => {
    const code = streamSessions.get(socket.id);
    if (code) {
      const session = accessCodes.get(code);
      if (session) {
        if (session.streamerSocket === socket.id) {
          // 流式传输者断开连接
          session.isStreaming = false;
          // 通知所有查看者
          session.viewers.forEach(viewerSocket => {
            io.to(viewerSocket).emit('stream-ended');
          });
          session.viewers.clear();
        } else {
          // 查看者断开连接
          session.viewers.delete(socket.id);
          if (session.streamerSocket) {
            io.to(session.streamerSocket).emit('viewer-left', session.viewers.size);
          }
        }
      }
    }
    streamSessions.delete(socket.id);
    viewers.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// 提供静态文件
app.use(express.static(path.join(__dirname, '../../dist')));

// 查看端页面
app.get('/view', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Access code required');
  }
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    sessions: accessCodes.size,
    viewers: viewers.size
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Stream server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// 清理过期的访问码
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [code, session] of accessCodes.entries()) {
    if (isAccessCodeExpired(session.createdAt)) {
      accessCodes.delete(code);
      cleaned++;
      console.log('Expired access code removed:', code);
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} expired access codes`);
  }
}, 60 * 60 * 1000); // 每小时检查一次

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});