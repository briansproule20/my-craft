import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/bot-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (botId) {
      // Get status for specific bot
      const bot = botManager.getBot(botId);
      if (!bot) {
        return NextResponse.json(
          { error: 'Bot not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        botId,
        status: bot.status,
        connected: bot.bot?.player?.username ? true : false,
        health: bot.bot?.health || 0,
        food: bot.bot?.food || 0,
        position: bot.bot?.entity?.position || null,
        dimension: bot.bot?.game?.dimension || null,
        serverInfo: bot.serverInfo
      });
    } else {
      // Get status for all bots
      const allBots = botManager.getAllBots();
      const botStatuses = allBots.map(bot => ({
        botId: bot.id,
        status: bot.status,
        connected: bot.bot?.player?.username ? true : false,
        health: bot.bot?.health || 0,
        food: bot.bot?.food || 0,
        position: bot.bot?.entity?.position || null,
        dimension: bot.bot?.game?.dimension || null,
        serverInfo: bot.serverInfo
      }));

      return NextResponse.json({
        bots: botStatuses,
        totalBots: allBots.length
      });
    }
  } catch (error) {
    console.error('Error getting bot status:', error);
    return NextResponse.json(
      { error: 'Failed to get bot status' },
      { status: 500 }
    );
  }
}