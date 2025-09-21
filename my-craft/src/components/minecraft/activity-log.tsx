'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Heart, Skull, MapPin, AlertCircle, Bot } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'chat' | 'health' | 'death' | 'spawn' | 'error' | 'disconnect' | 'connect' | 'command';
  botId: string;
  botName: string;
  data: any;
}

interface ActivityLogProps {
  className?: string;
  botId?: string; // If provided, show logs for specific bot only
}

export default function ActivityLog({ className = '', botId }: ActivityLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing logs from localStorage
    const savedLogs = localStorage.getItem('minecraft-bot-logs');
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
      setLogs(parsedLogs);
    }
  }, []);

  useEffect(() => {
    // Save logs to localStorage whenever logs change
    localStorage.setItem('minecraft-bot-logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Simulate real-time log updates (in a real app, this would come from WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      // This would be replaced with actual WebSocket events from the bot manager
      // For now, we'll just simulate some activity
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const addLogEntry = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    setLogs(prev => {
      const updated = [...prev, newEntry];
      // Keep only last 1000 entries to prevent memory issues
      return updated.slice(-1000);
    });
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('minecraft-bot-logs');
  };

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (botId && log.botId !== botId) return false;
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'chat': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'health': return <Heart className="w-4 h-4 text-red-600" />;
      case 'death': return <Skull className="w-4 h-4 text-red-800" />;
      case 'spawn': return <MapPin className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'disconnect': return <Bot className="w-4 h-4 text-gray-600" />;
      case 'connect': return <Bot className="w-4 h-4 text-green-600" />;
      case 'command': return <Bot className="w-4 h-4 text-blue-600" />;
      default: return <Bot className="w-4 h-4 text-gray-600" />;
    }
  };

  const getLogContent = (log: LogEntry) => {
    switch (log.type) {
      case 'chat':
        return (
          <span>
            <span className="font-medium">{log.data.username || 'Unknown'}:</span> {log.data.message}
          </span>
        );
      case 'health':
        return (
          <span>
            Health: {log.data.health}/20, Food: {log.data.food}/20
          </span>
        );
      case 'death':
        return <span className="text-red-600">Bot died</span>;
      case 'spawn':
        return <span className="text-green-600">Bot spawned in world</span>;
      case 'error':
        return <span className="text-red-600">Error: {log.data.error}</span>;
      case 'disconnect':
        return <span className="text-gray-600">Disconnected: {log.data.reason}</span>;
      case 'connect':
        return <span className="text-green-600">Connected to server</span>;
      case 'command':
        return (
          <span>
            Executed command: <code className="bg-gray-100 px-1 rounded">{log.data.command}</code>
          </span>
        );
      default:
        return <span>{JSON.stringify(log.data)}</span>;
    }
  };

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Activity Log {botId && '(Selected Bot)'}
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Events</option>
              <option value="chat">Chat</option>
              <option value="health">Health</option>
              <option value="death">Deaths</option>
              <option value="spawn">Spawns</option>
              <option value="error">Errors</option>
              <option value="command">Commands</option>
            </select>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Total: {filteredLogs.length} events</span>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span>Auto-scroll</span>
          </label>
        </div>
      </div>

      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="h-96 overflow-y-auto p-4 space-y-2"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-8 h-8 mx-auto mb-2" />
            <p>No activity logs yet</p>
            <p className="text-sm">Start a bot to see real-time activity</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded"
            >
              <div className="flex-shrink-0 mt-0.5">
                {getLogIcon(log.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium text-gray-900">{log.botName}</span>
                  <span className="text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  {getLogContent(log)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* Test buttons for demonstration */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600">Test log entries:</span>
          <button
            onClick={() => addLogEntry({
              type: 'chat',
              botId: 'test-bot',
              botName: 'TestBot',
              data: { username: 'Player1', message: 'Hello from Minecraft!' }
            })}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Chat
          </button>
          <button
            onClick={() => addLogEntry({
              type: 'health',
              botId: 'test-bot',
              botName: 'TestBot',
              data: { health: 18, food: 15 }
            })}
            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Health
          </button>
          <button
            onClick={() => addLogEntry({
              type: 'spawn',
              botId: 'test-bot',
              botName: 'TestBot',
              data: {}
            })}
            className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Spawn
          </button>
        </div>
      </div>
    </div>
  );
}