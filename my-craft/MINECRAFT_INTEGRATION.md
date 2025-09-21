# Minecraft Bot Integration

This project integrates mineflayer and mindcraft to create a web-based interface for controlling Minecraft bots using AI.

## Features

- **Bot Management**: Start, stop, and monitor multiple Minecraft bots
- **Real-time Communication**: WebSocket integration for live updates
- **Server Configuration**: Easy setup and testing of Minecraft servers
- **Activity Logging**: Live chat and event monitoring
- **AI Integration**: Ready for mindcraft AI bot capabilities

## Installation & Setup

### Prerequisites

1. **Minecraft Java Edition** (version 1.21.1 recommended)
2. **Node.js** (version 18 or higher)
3. **A Minecraft server** (local or remote)

### Quick Start

1. **Install dependencies** (already done):
   ```bash
   pnpm install
   ```

2. **Configure environment** (check `.env.local`):
   ```env
   MINECRAFT_DEFAULT_HOST=localhost
   MINECRAFT_DEFAULT_PORT=25565
   MINECRAFT_DEFAULT_VERSION=1.21.1
   MINECRAFT_BOT_TIMEOUT=30000
   MINECRAFT_MAX_BOTS=5
   WEBSOCKET_PORT=3001
   ```

3. **Start the development server**:
   ```bash
   pnpm run dev
   ```

4. **Navigate to the Bots page**: Click "Bots" in the navigation

## Testing with Local Minecraft Server

### Option 1: Single Player World (LAN)

1. **Create a Minecraft world**
2. **Open to LAN**:
   - Press `Esc` → "Open to LAN"
   - Set port to `25565` (or note the assigned port)
   - Enable "Allow Cheats" (recommended for testing)
   - Click "Start LAN World"

3. **Test connection in the app**:
   - Go to Server Configuration
   - Use `localhost:25565` (or your LAN port)
   - Click "Test" to verify connection

4. **Start a bot**:
   - Click "Start Bot" in Bot Dashboard
   - Use host: `localhost`, port: `25565`
   - Enter a bot name (e.g., "TestBot")
   - Click "Start"

### Option 2: Dedicated Server

1. **Download Minecraft Server**:
   ```bash
   wget https://piston-data.mojang.com/v1/objects/145ff0858209bcfc164859ba735d4199aafa1eea/server.jar
   ```

2. **Start server**:
   ```bash
   java -Xmx1024M -Xms1024M -jar server.jar nogui
   ```

3. **Configure server.properties**:
   ```properties
   online-mode=false
   enable-command-block=true
   op-permission-level=4
   ```

4. **Connect bot through the web interface**

## API Endpoints

### Bot Management
- `POST /api/bot/start` - Start a new bot
- `POST /api/bot/stop` - Stop a bot
- `GET /api/bot/status` - Get bot status

### Minecraft Commands
- `POST /api/minecraft/command` - Execute bot commands
- `GET /api/minecraft/connect` - Test server connection

### WebSocket
- `POST /api/websocket/init` - Initialize WebSocket server
- WebSocket endpoint: `ws://localhost:3001/minecraft-ws`

## Bot Commands

Available commands through the web interface:

### Chat Commands
```javascript
// Send chat message
{
  command: 'chat',
  args: { message: 'Hello world!' }
}
```

### Movement Commands
```javascript
// Move to coordinates
{
  command: 'move',
  args: { x: 10, y: 64, z: 10 }
}

// Look at specific direction
{
  command: 'look',
  args: { yaw: 0, pitch: 0 }
}
```

### Interaction Commands
```javascript
// Attack nearby mobs
{
  command: 'attack',
  args: {}
}

// Dig block at coordinates
{
  command: 'dig',
  args: { x: 10, y: 64, z: 10 }
}

// Place block
{
  command: 'place',
  args: { x: 10, y: 64, z: 10, blockName: 'dirt' }
}

// Get inventory
{
  command: 'inventory',
  args: {}
}

// Get bot status
{
  command: 'status',
  args: {}
}
```

## Real-time Features

### WebSocket Events

The application provides real-time updates through WebSocket:

- **Bot Events**: spawn, death, health changes
- **Chat Messages**: All chat from the server
- **Errors**: Connection issues and bot errors
- **Status Updates**: Health, food, position updates

### Activity Log

The activity log shows:
- Chat messages from players and bots
- Bot health and food status
- Death and respawn events
- Connection/disconnection events
- Command execution results

## AI Integration (Mindcraft)

The integration is ready for mindcraft AI capabilities:

1. **Configure AI providers** in `.env.local`:
   ```env
   OPENAI_API_KEY=your_key_here
   ANTHROPIC_API_KEY=your_key_here
   ```

2. **Mindcraft files** are available in `./mindcraft/` directory

3. **Extend bot manager** to integrate mindcraft decision-making

## Troubleshooting

### Common Issues

1. **Bot won't connect**:
   - Check server is running and accessible
   - Verify port and host settings
   - Ensure server allows connections (online-mode=false for testing)

2. **WebSocket connection fails**:
   - Check port 3001 is available
   - Restart the development server
   - Check browser console for errors

3. **Bot gets kicked**:
   - Server may have anti-bot measures
   - Try different usernames
   - Check server logs for kick reasons

### Debug Mode

Enable debug logging by setting:
```javascript
// In bot-manager.ts
console.log('Debug info:', debugData);
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── bot/          # Bot management endpoints
│   │   ├── minecraft/    # Minecraft server interaction
│   │   └── websocket/    # WebSocket initialization
│   └── bots/             # Bot management page
├── components/
│   └── minecraft/        # UI components for bot control
├── hooks/
│   └── use-minecraft-websocket.ts  # WebSocket client hook
└── lib/
    ├── bot-manager.ts    # Core bot management logic
    ├── websocket-server.ts  # WebSocket server
    └── config.ts         # Environment configuration
```

## Next Steps

1. **Test with live server**: Connect to a real Minecraft server
2. **Add AI behaviors**: Integrate mindcraft decision-making
3. **Extend commands**: Add more sophisticated bot actions
4. **Multi-bot coordination**: Implement team-based bot behaviors
5. **Persistent storage**: Save bot configurations and logs

## Contributing

When adding new features:

1. Update API documentation
2. Add appropriate error handling
3. Include WebSocket events for real-time updates
4. Test with both local and remote servers
5. Update this README with new capabilities