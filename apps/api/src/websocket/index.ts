// WebSocket handler for real-time updates
import { WebSocketServer, WebSocket } from 'ws';

interface Subscription {
  ws: WebSocket;
  channels: Set<string>;
}

const subscriptions = new Map<WebSocket, Subscription>();
const channelSubscribers = new Map<string, Set<WebSocket>>();

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Initialize subscription for this client
    subscriptions.set(ws, {
      ws,
      channels: new Set(),
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      
      // Clean up subscriptions
      const sub = subscriptions.get(ws);
      if (sub) {
        for (const channel of sub.channels) {
          const subscribers = channelSubscribers.get(channel);
          if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
              channelSubscribers.delete(channel);
            }
          }
        }
        subscriptions.delete(ws);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });
}

function handleMessage(ws: WebSocket, message: { type: string; channel?: string; [key: string]: unknown }): void {
  const sub = subscriptions.get(ws);
  if (!sub) return;
  
  switch (message.type) {
    case 'subscribe':
      if (message.channel) {
        sub.channels.add(message.channel);
        
        if (!channelSubscribers.has(message.channel)) {
          channelSubscribers.set(message.channel, new Set());
        }
        channelSubscribers.get(message.channel)!.add(ws);
        
        ws.send(JSON.stringify({ type: 'subscribed', channel: message.channel }));
      }
      break;
      
    case 'unsubscribe':
      if (message.channel) {
        sub.channels.delete(message.channel);
        
        const subscribers = channelSubscribers.get(message.channel);
        if (subscribers) {
          subscribers.delete(ws);
          if (subscribers.size === 0) {
            channelSubscribers.delete(message.channel);
          }
        }
        
        ws.send(JSON.stringify({ type: 'unsubscribed', channel: message.channel }));
      }
      break;
      
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;
      
    default:
      ws.send(JSON.stringify({ error: `Unknown message type: ${message.type}` }));
  }
}

export function broadcastToSubscribers(channel: string, message: unknown): void {
  const subscribers = channelSubscribers.get(channel);
  if (!subscribers) return;
  
  const payload = JSON.stringify(message);
  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function broadcastToAll(message: unknown): void {
  const payload = JSON.stringify(message);
  for (const [ws] of subscriptions) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
