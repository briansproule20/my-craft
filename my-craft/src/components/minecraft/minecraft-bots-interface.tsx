'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Plus, MessageSquare, Settings, Activity, Server, Users } from 'lucide-react';

interface Bot {
  botId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connected: boolean;
  health: number;
  food: number;
  position: { x: number; y: number; z: number } | null;
  serverInfo: {
    host: string;
    port: number;
    username: string;
  };
}

export default function MinecraftBotsInterface() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'connect' | 'manage'>('connect');
  const [loading, setLoading] = useState(false);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bot/status');
      const data = await response.json();
      if (data.bots) {
        setBots(data.bots);
        if (data.bots.length > 0 && currentStep === 'connect') {
          setCurrentStep('manage');
        }
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 3000);
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
        setCurrentStep('manage');
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
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Minecraft Bots</h1>
        <p className="text-gray-600">Create and manage your Minecraft bots</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setCurrentStep('connect')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentStep === 'connect'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Connect Bot
        </button>
        <button
          onClick={() => setCurrentStep('manage')}
          disabled={bots.length === 0}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentStep === 'manage'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Manage Bots ({bots.length})
        </button>
      </div>

      {/* Content */}
      {currentStep === 'connect' ? (
        <ConnectBotForm onStart={startBot} loading={loading} />
      ) : (
        <ManageBotsView
          bots={bots}
          selectedBot={selectedBot}
          onSelectBot={setSelectedBot}
          onStopBot={stopBot}
          loading={loading}
        />
      )}
    </div>
  );
}

interface ConnectBotFormProps {
  onStart: (config: { host: string; port: number; username: string }) => void;
  loading: boolean;
}

function ConnectBotForm({ onStart, loading }: ConnectBotFormProps) {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('25565');
  const [username, setUsername] = useState('');
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch(`/api/minecraft/connect?host=${host}&port=${port}`);
      const data = await response.json();
      setConnectionStatus(data.connected ? 'success' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (host && port && username) {
      onStart({ host, port: parseInt(port), username });
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <Server className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Connect to Minecraft Server</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Server Address
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost or play.hypixel.net"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="25565"
                min="1"
                max="65535"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing || !host || !port}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {connectionStatus === 'success' && (
              <span className="text-green-600 text-sm flex items-center">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Server online
              </span>
            )}
            {connectionStatus === 'error' && (
              <span className="text-red-600 text-sm flex items-center">
                <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                Cannot connect
              </span>
            )}
          </div>

          {/* Bot Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="MyBot"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Choose a unique username for your bot
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !host || !port || !username}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Bot
              </>
            )}
          </button>
        </form>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Setup:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Start Minecraft and create/join a world</li>
            <li>2. Open to LAN (ESC → Open to LAN → Start LAN World)</li>
            <li>3. Use "localhost" and the port shown (usually 25565)</li>
            <li>4. Enter a bot name and click "Start Bot"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

interface ManageBotsViewProps {
  bots: Bot[];
  selectedBot: string | null;
  onSelectBot: (botId: string | null) => void;
  onStopBot: (botId: string) => void;
  loading: boolean;
}

function ManageBotsView({ bots, selectedBot, onSelectBot, onStopBot, loading }: ManageBotsViewProps) {
  const [message, setMessage] = useState('');

  const sendChat = async (botId: string) => {
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

  const getStatusColor = (status: Bot['status']) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'connecting': return 'bg-yellow-100 text-yellow-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedBotData = bots.find(bot => bot.botId === selectedBot);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Bots List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Active Bots</h3>
          </div>
          <div className="divide-y">
            {bots.map((bot) => (
              <div
                key={bot.botId}
                onClick={() => onSelectBot(bot.botId)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedBot === bot.botId ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{bot.serverInfo.username}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bot.status)}`}>
                    {bot.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {bot.serverInfo.host}:{bot.serverInfo.port}
                </div>
                {bot.connected && (
                  <div className="mt-2 flex space-x-4 text-xs text-gray-600">
                    <span>❤️ {bot.health}/20</span>
                    <span>🍖 {bot.food}/20</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bot Controls */}
      <div className="lg:col-span-2">
        {selectedBotData ? (
          <div className="space-y-6">
            {/* Bot Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedBotData.serverInfo.username}
                </h3>
                <button
                  onClick={() => onStopBot(selectedBotData.botId)}
                  disabled={loading}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  <Square className="w-4 h-4 inline mr-1" />
                  Stop Bot
                </button>
              </div>

              {selectedBotData.connected && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Health:</span>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(selectedBotData.health / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">{selectedBotData.health}/20</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500">Food:</span>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full"
                          style={{ width: `${(selectedBotData.food / 20) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">{selectedBotData.food}/20</span>
                    </div>
                  </div>

                  {selectedBotData.position && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Position:</span>
                      <p className="font-mono text-xs mt-1">
                        X: {Math.round(selectedBotData.position.x)},
                        Y: {Math.round(selectedBotData.position.y)},
                        Z: {Math.round(selectedBotData.position.z)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Control */}
            {selectedBotData.connected && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Send Chat Message</h4>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChat(selectedBotData.botId)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => sendChat(selectedBotData.botId)}
                    disabled={!message.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Bot</h3>
            <p className="text-gray-500">Choose a bot from the list to view details and controls</p>
          </div>
        )}
      </div>
    </div>
  );
}