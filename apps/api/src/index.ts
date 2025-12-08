// API Server Entry Point
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import graphRouter from './routes/graph.js';
import simulationRouter from './routes/simulation.js';
import optimizationRouter from './routes/optimization.js';
import { initializeDatabase } from './db/index.js';
import { setupWebSocket } from './websocket/index.js';

const PORT = process.env.PORT ?? 3000;

async function main() {
  // Initialize database
  await initializeDatabase();
  
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  
  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // API routes
  app.use('/api/graphs', graphRouter);
  app.use('/api/simulations', simulationRouter);
  app.use('/api/optimizations', optimizationRouter);
  
  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  });
  
  // Create HTTP server
  const server = createServer(app);
  
  // Setup WebSocket
  const wss = new WebSocketServer({ server, path: '/ws' });
  setupWebSocket(wss);
  
  server.listen(PORT, () => {
    console.log(`🚀 ScenarioForge API running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  });
}

main().catch(console.error);
