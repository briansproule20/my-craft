'use client';

import { useState, useEffect } from 'react';
import { Server, CheckCircle, XCircle, Loader2, Plus, Trash2 } from 'lucide-react';

interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  version?: string;
  description?: string;
  lastChecked?: Date;
  isOnline?: boolean;
}

interface ServerConfigProps {
  className?: string;
  onServerSelect?: (server: ServerConfig) => void;
}

export default function ServerConfig({ className = '', onServerSelect }: ServerConfigProps) {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingServer, setTestingServer] = useState<string | null>(null);

  useEffect(() => {
    // Load saved servers from localStorage
    const savedServers = localStorage.getItem('minecraft-servers');
    if (savedServers) {
      setServers(JSON.parse(savedServers));
    } else {
      // Default localhost server
      const defaultServer: ServerConfig = {
        id: 'localhost',
        name: 'Local Server',
        host: 'localhost',
        port: 25565,
        version: '1.21.1'
      };
      setServers([defaultServer]);
    }
  }, []);

  useEffect(() => {
    // Save servers to localStorage whenever servers change
    localStorage.setItem('minecraft-servers', JSON.stringify(servers));
  }, [servers]);

  const testConnection = async (server: ServerConfig) => {
    setTestingServer(server.id);
    try {
      const response = await fetch(`/api/minecraft/connect?host=${server.host}&port=${server.port}`);
      const data = await response.json();

      setServers(prev => prev.map(s =>
        s.id === server.id
          ? {
              ...s,
              lastChecked: new Date(),
              isOnline: data.connected,
              description: data.serverInfo?.description?.text || s.description
            }
          : s
      ));
    } catch (error) {
      console.error('Error testing connection:', error);
      setServers(prev => prev.map(s =>
        s.id === server.id
          ? { ...s, lastChecked: new Date(), isOnline: false }
          : s
      ));
    } finally {
      setTestingServer(null);
    }
  };

  const addServer = (serverData: Omit<ServerConfig, 'id'>) => {
    const newServer: ServerConfig = {
      ...serverData,
      id: `server-${Date.now()}`
    };
    setServers(prev => [...prev, newServer]);
    setShowAddForm(false);
  };

  const deleteServer = (serverId: string) => {
    setServers(prev => prev.filter(s => s.id !== serverId));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Server Configuration</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Server</span>
        </button>
      </div>

      {showAddForm && (
        <AddServerForm
          onAdd={addServer}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="grid gap-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Server className="w-6 h-6 text-gray-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{server.name}</h3>
                  <p className="text-sm text-gray-500">
                    {server.host}:{server.port}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {server.isOnline !== undefined && (
                  <div className="flex items-center space-x-1">
                    {server.isOnline ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${server.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {server.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => testConnection(server)}
                  disabled={testingServer === server.id}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  {testingServer === server.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Test'
                  )}
                </button>

                {onServerSelect && (
                  <button
                    onClick={() => onServerSelect(server)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Select
                  </button>
                )}

                {server.id !== 'localhost' && (
                  <button
                    onClick={() => deleteServer(server.id)}
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {server.version && (
                <div>
                  <span className="text-gray-500">Version:</span>
                  <p>{server.version}</p>
                </div>
              )}

              {server.lastChecked && (
                <div>
                  <span className="text-gray-500">Last Checked:</span>
                  <p>{server.lastChecked.toLocaleTimeString()}</p>
                </div>
              )}

              {server.description && (
                <div className="col-span-2 md:col-span-1">
                  <span className="text-gray-500">Description:</span>
                  <p className="truncate">{server.description}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AddServerFormProps {
  onAdd: (server: Omit<ServerConfig, 'id'>) => void;
  onCancel: () => void;
}

function AddServerForm({ onAdd, onCancel }: AddServerFormProps) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('25565');
  const [version, setVersion] = useState('1.21.1');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && host && port) {
      onAdd({
        name,
        host,
        port: parseInt(port),
        version: version || undefined,
        description: description || undefined
      });
    }
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Add New Server</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Minecraft Server"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Host *
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="localhost or server.example.com"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port *
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="25565"
              min="1"
              max="65535"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.21.1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Server description"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Server
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}