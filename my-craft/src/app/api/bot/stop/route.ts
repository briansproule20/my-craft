import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/bot-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId } = body;

    if (!botId) {
      return NextResponse.json(
        { error: 'Missing required field: botId' },
        { status: 400 }
      );
    }

    const result = await botManager.stopBot(botId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Bot stopped successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error stopping bot:', error);
    return NextResponse.json(
      { error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const botId = searchParams.get('botId');

  if (!botId) {
    return NextResponse.json(
      { error: 'Missing required parameter: botId' },
      { status: 400 }
    );
  }

  try {
    const result = await botManager.stopBot(botId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Bot stopped successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error stopping bot:', error);
    return NextResponse.json(
      { error: 'Failed to stop bot' },
      { status: 500 }
    );
  }
}