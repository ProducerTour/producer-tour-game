// Colyseus Game Server entry point
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { monitor } from '@colyseus/monitor';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom.js';

const PORT = parseInt(process.env.GAME_SERVER_PORT || '2567');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 3000,
    pingMaxRetries: 3,
  }),
});

// Register rooms
gameServer.define('game', GameRoom);

// Colyseus Monitor (admin panel)
// @ts-expect-error - monitor returns a Router which is compatible with middleware
app.use('/colyseus', monitor());

// Start server
gameServer.listen(PORT).then(() => {
  console.log(`🎮 Game server listening on ws://localhost:${PORT}`);
  console.log(`📊 Monitor available at http://localhost:${PORT}/colyseus`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down game server...');
  gameServer.gracefullyShutdown().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down game server...');
  gameServer.gracefullyShutdown().then(() => {
    process.exit(0);
  });
});
