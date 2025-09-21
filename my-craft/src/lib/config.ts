export const config = {
  minecraft: {
    defaultHost: process.env.MINECRAFT_DEFAULT_HOST || 'localhost',
    defaultPort: parseInt(process.env.MINECRAFT_DEFAULT_PORT || '25565'),
    defaultVersion: process.env.MINECRAFT_DEFAULT_VERSION || '1.21.1',
    botTimeout: parseInt(process.env.MINECRAFT_BOT_TIMEOUT || '30000'),
    maxBots: parseInt(process.env.MINECRAFT_MAX_BOTS || '5')
  },
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3001')
  },
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY
  }
} as const;

export type Config = typeof config;