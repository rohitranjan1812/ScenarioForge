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

// Memory and resource limits
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE ?? '50mb';
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT ?? '120000'); // 2 minutes default

async function main() {
  // Initialize database
  await initializeDatabase();
  
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: MAX_REQUEST_SIZE }));
  
  // Request timeout middleware
  app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT, () => {
      // Only send error if response hasn't been sent yet
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out',
          },
        });
      }
    });
    next();
  });
  
  // Health check with memory monitoring
  app.get('/health', (_req, res) => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      memory: memUsageMB,
      uptime: Math.floor(process.uptime()),
    });
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
