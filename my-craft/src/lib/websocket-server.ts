import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { botManager } from './bot-manager';
import { config } from './config';

interface WebSocketMessage {
  type: string;
  data: any;
}

class MinecraftWebSocketServer {
  private wss: WebSocketServer | null = null;
  private server: any = null;
  private clients: Set<any> = new Set();

  init() {
    if (this.server) return; // Already initialized

    // Create HTTP server for WebSocket
    this.server = createServer();

    // Create WebSocket server
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/minecraft-ws'
    });

    this.setupWebSocketHandlers();
    this.setupBotManagerEvents();

    // Start server
    this.server.listen(config.websocket.port, () => {
      console.log(`WebSocket server running on port ${config.websocket.port}`);
    });
  }

  private setupWebSocketHandlers() {
    if (!this.wss) return;

    this.wss.on('connection', (ws, request) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      // Send initial bot status
      this.sendToClient(ws, {
        type: 'initial_state',
        data: {
          bots: botManager.getAllBots().map(bot => ({
            botId: bot.id,
            status: bot.status,
            connected: bot.bot?.player?.username ? true : false,
            health: bot.bot?.health || 0,
            food: bot.bot?.food || 0,
            position: bot.bot?.entity?.position || null,
            serverInfo: bot.serverInfo
          }))
        }
      });

      // Handle messages from client
      ws.on('message', async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Invalid message format' }
          });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private async handleClientMessage(ws: any, message: WebSocketMessage) {
    switch (message.type) {
      case 'start_bot':
        try {
          const result = await botManager.startBot(message.data);
          this.sendToClient(ws, {
            type: 'bot_start_result',
            data: result
          });
        } catch (error) {
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Failed to start bot' }
          });
        }
        break;

      case 'stop_bot':
        try {
          const result = await botManager.stopBot(message.data.botId);
          this.sendToClient(ws, {
            type: 'bot_stop_result',
            data: result
          });
        } catch (error) {
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Failed to stop bot' }
          });
        }
        break;

      case 'send_command':
        try {
          const { botId, command, args } = message.data;
          let result;

          switch (command) {
            case 'chat':
              result = await botManager.sendChatMessage(botId, args.message);
              break;
            case 'move':
              result = await botManager.moveBot(botId, args.x, args.y, args.z);
              break;
            default:
              result = { success: false, error: 'Unknown command' };
          }

          this.sendToClient(ws, {
            type: 'command_result',
            data: { command, result }
          });
        } catch (error) {
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Failed to execute command' }
          });
        }
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` }
        });
    }
  }

  private setupBotManagerEvents() {
    // Listen to bot manager events and broadcast to all clients
    botManager.on('bot:spawn', (data: any) => {
      this.broadcast({
        type: 'bot_event',
        data: { event: 'spawn', ...data }
      });
    });

    botManager.on('bot:error', (data: any) => {
      this.broadcast({
        type: 'bot_event',
        data: { event: 'error', ...data }
      });
    });

    botManager.on('bot:disconnect', (data: any) => {
      this.broadcast({
        type: 'bot_event',
        data: { event: 'disconnect', ...data }
      });
    });

    botManager.on('bot:chat', (data: any) => {
      this.broadcast({
        type: 'bot_event',
        data: { event: 'chat', ...data }
      });
    });

    botManager.on('bot:health', (data: any) => {
      this.broadcast({
        type: 'bot_event',
        data: { event: 'health', ...data }
      });
    });

    botManager.on('bot:death', (data: any) => {
      this.broadcast({
        type: 'bot_event',
        data: { event: 'death', ...data }
      });
    });
  }

  private sendToClient(ws: any, message: WebSocketMessage) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: WebSocketMessage) {
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }

  close() {
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
    this.clients.clear();
  }
}

// Singleton instance
export const minecraftWebSocketServer = new MinecraftWebSocketServer();