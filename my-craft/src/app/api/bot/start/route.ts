import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/bot-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverHost, serverPort, botName, username, password } = body;

    if (!serverHost || !serverPort || !botName) {
      return NextResponse.json(
        { error: 'Missing required fields: serverHost, serverPort, botName' },
        { status: 400 }
      );
    }

    const result = await botManager.startBot({
      host: serverHost,
      port: parseInt(serverPort),
      username: botName,
      password: password || undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        botId: result.botId,
        message: 'Bot started successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error starting bot:', error);
    return NextResponse.json(
      { error: 'Failed to start bot' },
      { status: 500 }
    );
  }
}