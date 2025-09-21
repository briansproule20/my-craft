'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Activity, MessageSquare, Settings } from 'lucide-react';

interface Bot {
  botId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connected: boolean;
  health: number;
  food: number;
  position: { x: number; y: number; z: number } | null;
  dimension: string | null;
  serverInfo: {
    host: string;
    port: number;
    username: string;
  };
}

interface BotDashboardProps {
  className?: string;
}

export default function BotDashboard({ className = '' }: BotDashboardProps) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bot/status');
      const data = await response.json();
      if (data.bots) {
        setBots(data.bots);
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const startBot = async (config: { host: string; port: number; username: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverHost: config.host,
          serverPort: config.port,
          botName: config.username
        })
      });

      if (response.ok) {
        await fetchBots();
      } else {
        console.error('Failed to start bot');
      }
    } catch (error) {
      console.error('Error starting bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopBot = async (botId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });

      if (response.ok) {
        await fetchBots();
        setSelectedBot(null);
      } else {
        console.error('Failed to stop bot');
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Bot['status']) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: Bot['status']) => {
    switch (status) {
      case 'connected': return <Activity className="w-4 h-4 text-green-600" />;
      case 'connecting': return <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />;
      case 'disconnected': return <Square className="w-4 h-4 text-gray-600" />;
      case 'error': return <Square className="w-4 h-4 text-red-600" />;
      default: return <Square className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Minecraft Bots</h2>
        <QuickStartForm onStart={startBot} loading={loading} />
      </div>

      {bots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bots running</h3>
          <p className="text-gray-500">Start your first Minecraft bot to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bots.map((bot) => (
            <div
              key={bot.botId}
              className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow ${
                selectedBot === bot.botId ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedBot(bot.botId)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(bot.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {bot.serverInfo.username}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {bot.serverInfo.host}:{bot.serverInfo.port}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${getStatusColor(bot.status)}`}>
                    {bot.status}
                  </span>
                  {bot.status === 'connected' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        stopBot(bot.botId);
                      }}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>

              {bot.connected && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Health:</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(bot.health / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">{bot.health}/20</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500">Food:</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full"
                          style={{ width: `${(bot.food / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">{bot.food}/20</span>
                    </div>
                  </div>

                  {bot.position && (
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <p className="font-mono text-xs">
                        {Math.round(bot.position.x)}, {Math.round(bot.position.y)}, {Math.round(bot.position.z)}
                      </p>
                    </div>
                  )}

                  {bot.dimension && (
                    <div>
                      <span className="text-gray-500">Dimension:</span>
                      <p className="text-xs capitalize">{bot.dimension.replace('minecraft:', '')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedBot && (
        <BotControls
          botId={selectedBot}
          onClose={() => setSelectedBot(null)}
        />
      )}
    </div>
  );
}

interface QuickStartFormProps {
  onStart: (config: { host: string; port: number; username: string }) => void;
  loading: boolean;
}

function QuickStartForm({ onStart, loading }: QuickStartFormProps) {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('25565');
  const [username, setUsername] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (host && port && username) {
      onStart({ host, port: parseInt(port), username });
      setShowForm(false);
      setUsername('');
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Play className="w-4 h-4" />
        <span>Start Bot</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        placeholder="Host"
        value={host}
        onChange={(e) => setHost(e.target.value)}
        className="w-24 px-2 py-1 border rounded text-sm"
        required
      />
      <input
        type="number"
        placeholder="Port"
        value={port}
        onChange={(e) => setPort(e.target.value)}
        className="w-20 px-2 py-1 border rounded text-sm"
        required
      />
      <input
        type="text"
        placeholder="Bot name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-24 px-2 py-1 border rounded text-sm"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        Start
      </button>
      <button
        type="button"
        onClick={() => setShowForm(false)}
        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
      >
        Cancel
      </button>
    </form>
  );
}

interface BotControlsProps {
  botId: string;
  onClose: () => void;
}

function BotControls({ botId, onClose }: BotControlsProps) {
  const [message, setMessage] = useState('');
  const [command, setCommand] = useState('');

  const sendChat = async () => {
    if (!message.trim()) return;

    try {
      await fetch('/api/minecraft/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          command: 'chat',
          args: { message }
        })
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending chat:', error);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;

    try {
      const [cmd, ...args] = command.split(' ');
      await fetch('/api/minecraft/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          command: cmd,
          args: { message: args.join(' ') }
        })
      });
      setCommand('');
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Bot Controls</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Send chat message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendChat()}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={sendChat}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Execute command (e.g., move 10 64 10)..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={executeCommand}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}