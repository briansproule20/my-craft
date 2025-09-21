import mineflayer, { Bot } from 'mineflayer';
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
import { loader as autoEat } from 'mineflayer-auto-eat';
import { plugin as collectBlock } from 'mineflayer-collectblock';
import { v4 as uuidv4 } from 'uuid';
import { Vec3 } from 'vec3';

export interface BotConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  version?: string;
}

export interface ManagedBot {
  id: string;
  bot: Bot | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  serverInfo: BotConfig;
  createdAt: Date;
  lastActivity: Date;
  eventListeners: Array<{ event: string; listener: Function }>;
}

class BotManager {
  private bots: Map<string, ManagedBot> = new Map();
  private eventHandlers: Map<string, Set<Function>> = new Map();

  async startBot(config: BotConfig): Promise<{ success: boolean; botId?: string; error?: string }> {
    try {
      const botId = uuidv4();

      // Create managed bot entry
      const managedBot: ManagedBot = {
        id: botId,
        bot: null,
        status: 'connecting',
        serverInfo: config,
        createdAt: new Date(),
        lastActivity: new Date(),
        eventListeners: []
      };

      this.bots.set(botId, managedBot);

      // Create the bot
      console.log(`Creating bot with config:`, {
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version || '1.21.1'
      });

      const bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        version: config.version || '1.21.1',
        auth: 'offline',  // Force offline mode
        timeout: 30000,   // 30 second timeout
        skipValidation: true  // Skip protocol validation
      });

      // Load plugins
      bot.loadPlugin(pathfinder);
      bot.loadPlugin(autoEat);
      bot.loadPlugin(collectBlock);

      managedBot.bot = bot;

      // Set up event listeners
      this.setupBotEvents(botId, bot);

      return { success: true, botId };
    } catch (error) {
      console.error('Error creating bot:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async stopBot(botId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const managedBot = this.bots.get(botId);
      if (!managedBot) {
        return { success: false, error: 'Bot not found' };
      }

      if (managedBot.bot) {
        // Remove event listeners
        managedBot.eventListeners.forEach(({ event, listener }) => {
          managedBot.bot?.off(event as any, listener);
        });

        // Disconnect the bot
        managedBot.bot.quit();
        managedBot.bot.end();
      }

      managedBot.status = 'disconnected';
      this.bots.delete(botId);

      return { success: true };
    } catch (error) {
      console.error('Error stopping bot:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getBot(botId: string): ManagedBot | undefined {
    return this.bots.get(botId);
  }

  getAllBots(): ManagedBot[] {
    return Array.from(this.bots.values());
  }

  private setupBotEvents(botId: string, bot: Bot) {
    const managedBot = this.bots.get(botId);
    if (!managedBot) return;

    const events = [
      {
        event: 'spawn',
        listener: () => {
          console.log(`Bot ${botId} spawned in the world`);
          managedBot.status = 'connected';
          managedBot.lastActivity = new Date();
          this.emitEvent('bot:spawn', { botId, bot });
        }
      },
      {
        event: 'error',
        listener: (err: Error) => {
          console.error(`Bot ${botId} error:`, err);
          managedBot.status = 'error';
          managedBot.lastActivity = new Date();

          // Store the error message for the UI
          const errorMessage = err.message || err.toString();
          (managedBot as any).lastError = errorMessage;

          this.emitEvent('bot:error', { botId, error: errorMessage });
        }
      },
      {
        event: 'end',
        listener: (reason: string) => {
          console.log(`Bot ${botId} disconnected:`, reason);
          managedBot.status = 'disconnected';
          managedBot.lastActivity = new Date();
          this.emitEvent('bot:disconnect', { botId, reason });
        }
      },
      {
        event: 'chat',
        listener: (username: string, message: string) => {
          managedBot.lastActivity = new Date();
          this.emitEvent('bot:chat', { botId, username, message });
        }
      },
      {
        event: 'health',
        listener: () => {
          managedBot.lastActivity = new Date();
          this.emitEvent('bot:health', {
            botId,
            health: bot.health,
            food: bot.food
          });
        }
      },
      {
        event: 'death',
        listener: () => {
          console.log(`Bot ${botId} died`);
          managedBot.lastActivity = new Date();
          this.emitEvent('bot:death', { botId });
        }
      }
    ];

    events.forEach(({ event, listener }) => {
      bot.on(event as any, listener);
      managedBot.eventListeners.push({ event, listener });
    });
  }

  // Event system for real-time updates
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emitEvent(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Bot commands
  async sendChatMessage(botId: string, message: string): Promise<{ success: boolean; error?: string }> {
    const managedBot = this.bots.get(botId);
    if (!managedBot || !managedBot.bot) {
      return { success: false, error: 'Bot not found or not connected' };
    }

    try {
      managedBot.bot.chat(message);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async moveBot(botId: string, x: number, y: number, z: number): Promise<{ success: boolean; error?: string }> {
    const managedBot = this.bots.get(botId);
    if (!managedBot || !managedBot.bot) {
      return { success: false, error: 'Bot not found or not connected' };
    }

    try {
      const bot = managedBot.bot;
      const movements = new Movements(bot);
      bot.pathfinder.setMovements(movements);

      await bot.pathfinder.goto(new goals.GoalBlock(x, y, z));
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

// Singleton instance
export const botManager = new BotManager();