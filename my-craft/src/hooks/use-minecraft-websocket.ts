'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface BotEvent {
  event: string;
  botId: string;
  [key: string]: any;
}

interface UseMinecraftWebSocketOptions {
  onBotEvent?: (event: BotEvent) => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
}

export function useMinecraftWebSocket(options: UseMinecraftWebSocketOptions = {}) {
  const {
    onBotEvent,
    onError,
    autoReconnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    try {
      // Initialize WebSocket server first
      fetch('/api/websocket/init', { method: 'POST' }).catch(console.error);

      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3001/minecraft-ws`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'bot_event':
              onBotEvent?.(message.data);
              break;
            case 'error':
              onError?.(message.data.message);
              break;
            case 'initial_state':
              // Handle initial state if needed
              console.log('Received initial state:', message.data);
              break;
            default:
              console.log('Received message:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        if (autoReconnect && reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
        onError?.('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError('Failed to connect to WebSocket');
    }
  }, [onBotEvent, onError, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // WebSocket command helpers
  const startBot = useCallback((config: {
    host: string;
    port: number;
    username: string;
    password?: string;
  }) => {
    return sendMessage({
      type: 'start_bot',
      data: config
    });
  }, [sendMessage]);

  const stopBot = useCallback((botId: string) => {
    return sendMessage({
      type: 'stop_bot',
      data: { botId }
    });
  }, [sendMessage]);

  const sendCommand = useCallback((botId: string, command: string, args: any) => {
    return sendMessage({
      type: 'send_command',
      data: { botId, command, args }
    });
  }, [sendMessage]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    startBot,
    stopBot,
    sendCommand
  };
}