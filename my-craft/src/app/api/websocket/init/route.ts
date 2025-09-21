import { NextResponse } from 'next/server';
import { minecraftWebSocketServer } from '@/lib/websocket-server';

export async function POST() {
  try {
    minecraftWebSocketServer.init();
    return NextResponse.json({
      success: true,
      message: 'WebSocket server initialized'
    });
  } catch (error) {
    console.error('Error initializing WebSocket server:', error);
    return NextResponse.json(
      { error: 'Failed to initialize WebSocket server' },
      { status: 500 }
    );
  }
}