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
  dimension: string | null;
  serverInfo: {
    host: string;
    port: number;
    username: string;
  };
  lastError?: string;
  lastActivity?: string;
  createdAt?: string;
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
        // Tab will switch automatically when bot connects successfully
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

  const retryBot = async (botId: string) => {
    const bot = bots.find(b => b.botId === botId);
    if (!bot) return;

    setLoading(true);
    try {
      // First stop the existing bot
      await fetch('/api/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });

      // Wait a moment, then start a new bot with same config
      setTimeout(async () => {
        try {
          const response = await fetch('/api/bot/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverHost: bot.serverInfo.host,
              serverPort: bot.serverInfo.port,
              botName: bot.serverInfo.username
            })
          });

          if (response.ok) {
            await fetchBots();
          }
        } catch (error) {
          console.error('Error retrying bot:', error);
        } finally {
          setLoading(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Error stopping bot for retry:', error);
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
          onRetryBot={retryBot}
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
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

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

  const runDiagnostics = async () => {
    setDiagnosing(true);
    setDiagnostics(null);
    try {
      const response = await fetch('/api/minecraft/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port })
      });
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setDiagnosing(false);
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
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={diagnosing || !host || !port}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {diagnosing ? 'Diagnosing...' : 'Run Diagnostics'}
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

          {/* Diagnostics Results */}
          {diagnostics && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h5 className="font-medium text-gray-900 mb-3">Diagnostic Results</h5>
              <p className="text-sm text-gray-700 mb-3">{diagnostics.summary}</p>
              <div className="space-y-2">
                {diagnostics.tests.map((test: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{test.name}:</span>
                    <span className={`font-medium ${
                      test.status === 'pass' ? 'text-green-600' :
                      test.status === 'fail' ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {test.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
  onRetryBot: (botId: string) => void;
  loading: boolean;
}

function ManageBotsView({ bots, selectedBot, onSelectBot, onStopBot, onRetryBot, loading }: ManageBotsViewProps) {
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
                {bot.connected ? (
                  <div className="mt-2 flex space-x-4 text-xs text-gray-600">
                    <span>❤️ {bot.health}/20</span>
                    <span>🍖 {bot.food}/20</span>
                  </div>
                ) : bot.status === 'error' && bot.lastError ? (
                  <div className="mt-2 text-xs text-red-600 truncate">
                    Error: {bot.lastError}
                  </div>
                ) : bot.status === 'disconnected' ? (
                  <div className="mt-2 text-xs text-gray-500">
                    Not connected to server
                  </div>
                ) : null}
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
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBotData.status)}`}>
                    {selectedBotData.status}
                  </span>
                  {(selectedBotData.status === 'disconnected' || selectedBotData.status === 'error') && (
                    <button
                      onClick={() => onRetryBot(selectedBotData.botId)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 inline mr-1" />
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => onStopBot(selectedBotData.botId)}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 inline mr-1" />
                    Stop Bot
                  </button>
                </div>
              </div>

              {/* Connection Status */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Connection Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Server:</span>
                    <p className="font-mono">{selectedBotData.serverInfo.host}:{selectedBotData.serverInfo.port}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Username:</span>
                    <p>{selectedBotData.serverInfo.username}</p>
                  </div>
                  {selectedBotData.lastActivity && (
                    <div>
                      <span className="text-gray-500">Last Activity:</span>
                      <p>{new Date(selectedBotData.lastActivity).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedBotData.createdAt && (
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p>{new Date(selectedBotData.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Error Details */}
                {selectedBotData.status === 'error' && selectedBotData.lastError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <h5 className="font-medium text-red-900 mb-1">Error Details:</h5>
                    <p className="text-red-700 text-sm">{selectedBotData.lastError}</p>
                  </div>
                )}

                {/* Troubleshooting for disconnected bots */}
                {(selectedBotData.status === 'disconnected' || selectedBotData.status === 'error') && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h5 className="font-medium text-yellow-900 mb-2">Troubleshooting Tips:</h5>
                    <ul className="text-yellow-800 text-sm space-y-1">
                      <li>• Make sure Minecraft world is open to LAN</li>
                      <li>• Check if server allows offline mode (online-mode=false)</li>
                      <li>• Verify the port number matches your LAN world</li>
                      <li>• Try a different bot username</li>
                      <li>• Check if server has whitelist or plugins blocking connections</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Game Stats (only if connected) */}
              {selectedBotData.connected && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Game Stats</h4>
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
                      <div>
                        <span className="text-gray-500">Position:</span>
                        <p className="font-mono text-xs mt-1">
                          X: {Math.round(selectedBotData.position.x)}<br/>
                          Y: {Math.round(selectedBotData.position.y)}<br/>
                          Z: {Math.round(selectedBotData.position.z)}
                        </p>
                      </div>
                    )}

                    {selectedBotData.dimension && (
                      <div>
                        <span className="text-gray-500">Dimension:</span>
                        <p className="text-xs mt-1 capitalize">
                          {selectedBotData.dimension.replace('minecraft:', '')}
                        </p>
                      </div>
                    )}
                  </div>
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