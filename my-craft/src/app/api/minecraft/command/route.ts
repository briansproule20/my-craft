import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/bot-manager';
import { Vec3 } from 'vec3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, command, args } = body;

    if (!botId || !command) {
      return NextResponse.json(
        { error: 'Missing required fields: botId, command' },
        { status: 400 }
      );
    }

    const bot = botManager.getBot(botId);
    if (!bot || !bot.bot) {
      return NextResponse.json(
        { error: 'Bot not found or not connected' },
        { status: 404 }
      );
    }

    let result: { success: boolean; data?: any; error?: string } = { success: false };

    switch (command) {
      case 'chat':
        if (!args?.message) {
          return NextResponse.json(
            { error: 'Message is required for chat command' },
            { status: 400 }
          );
        }
        result = await botManager.sendChatMessage(botId, args.message);
        break;

      case 'move':
        if (!args?.x || !args?.y || !args?.z) {
          return NextResponse.json(
            { error: 'Coordinates (x, y, z) are required for move command' },
            { status: 400 }
          );
        }
        result = await botManager.moveBot(botId, args.x, args.y, args.z);
        break;

      case 'look':
        if (!args?.yaw && !args?.pitch) {
          return NextResponse.json(
            { error: 'Yaw or pitch is required for look command' },
            { status: 400 }
          );
        }
        try {
          if (!bot.bot) {
            result = { success: false, error: 'Bot not available' };
            break;
          }
          await bot.bot.look(args.yaw || 0, args.pitch || 0);
          result = { success: true };
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
        break;

      case 'attack':
        try {
          if (!bot.bot) {
            result = { success: false, error: 'Bot not available' };
            break;
          }
          const entity = bot.bot.nearestEntity(e =>
            e.type === 'mob' && bot.bot!.entity.position.distanceTo(e.position) < 4
          );
          if (entity) {
            await bot.bot.attack(entity);
            result = { success: true, data: { attacked: entity.name } };
          } else {
            result = { success: false, error: 'No nearby entities to attack' };
          }
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
        break;

      case 'dig':
        if (!args?.x || !args?.y || !args?.z) {
          return NextResponse.json(
            { error: 'Coordinates (x, y, z) are required for dig command' },
            { status: 400 }
          );
        }
        try {
          if (!bot.bot) {
            result = { success: false, error: 'Bot not available' };
            break;
          }
          const block = bot.bot.blockAt(new Vec3(args.x, args.y, args.z));
          if (block) {
            await bot.bot.dig(block);
            result = { success: true, data: { dug: block.name } };
          } else {
            result = { success: false, error: 'No block found at specified coordinates' };
          }
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
        break;

      case 'place':
        if (!args?.x || !args?.y || !args?.z || !args?.blockName) {
          return NextResponse.json(
            { error: 'Coordinates (x, y, z) and blockName are required for place command' },
            { status: 400 }
          );
        }
        try {
          if (!bot.bot) {
            result = { success: false, error: 'Bot not available' };
            break;
          }
          const item = bot.bot.inventory.items().find(item =>
            item.name.includes(args.blockName)
          );
          if (item) {
            const referenceBlock = bot.bot.blockAt(new Vec3(args.x, args.y - 1, args.z));
            if (referenceBlock) {
              await bot.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
              result = { success: true, data: { placed: args.blockName } };
            } else {
              result = { success: false, error: 'No reference block found for placement' };
            }
          } else {
            result = { success: false, error: `No ${args.blockName} found in inventory` };
          }
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
        break;

      case 'inventory':
        try {
          if (!bot.bot) {
            result = { success: false, error: 'Bot not available' };
            break;
          }
          const items = bot.bot.inventory.items().map(item => ({
            name: item.name,
            count: item.count,
            slot: item.slot
          }));
          result = { success: true, data: { items } };
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
        break;

      case 'status':
        try {
          if (!bot.bot) {
            result = { success: false, error: 'Bot not available' };
            break;
          }
          result = {
            success: true,
            data: {
              health: bot.bot.health,
              food: bot.bot.food,
              position: bot.bot.entity.position,
              dimension: bot.bot.game.dimension,
              username: bot.bot.username,
              experience: {
                level: bot.bot.experience.level,
                points: bot.bot.experience.points,
                progress: bot.bot.experience.progress
              }
            }
          };
        } catch (error) {
          result = { success: false, error: (error as Error).message };
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown command: ${command}` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        command,
        result: result.data || 'Command executed successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error executing command:', error);
    return NextResponse.json(
      { error: 'Failed to execute command' },
      { status: 500 }
    );
  }
}