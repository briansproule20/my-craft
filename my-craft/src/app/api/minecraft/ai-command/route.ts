import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/bot-manager';

const MINECRAFT_COMMAND_SYSTEM_PROMPT = `You are a Minecraft bot command translator. Your job is to convert natural language instructions into a series of executable Minecraft bot commands.

Available Commands:
- chat <message> - Send a chat message
- move <x> <y> <z> - Move to coordinates
- look <yaw> <pitch> - Look in direction (yaw: 0-360, pitch: -90 to 90)
- attack - Attack nearby mobs
- dig <x> <y> <z> - Dig block at coordinates
- place <x> <y> <z> <blockName> - Place block at coordinates
- inventory - Check inventory
- status - Get bot status

Rules:
1. Convert user instructions into a JSON array of commands
2. Each command should be: {"command": "commandName", "args": {...}}
3. Use relative positioning when possible (current bot position + offset)
4. Be creative but safe - don't make the bot do dangerous things
5. If instruction is unclear, ask for clarification
6. For movement, use reasonable coordinates based on context

Examples:
User: "Go forward 5 blocks"
Response: [{"command": "move", "args": {"x": "current.x", "y": "current.y", "z": "current.z + 5"}}]

User: "Say hello and then attack any mobs nearby"
Response: [
  {"command": "chat", "args": {"message": "Hello everyone!"}},
  {"command": "attack", "args": {}}
]

User: "Dig a 2x2 hole in front of me"
Response: [
  {"command": "dig", "args": {"x": "current.x + 1", "y": "current.y - 1", "z": "current.z"}},
  {"command": "dig", "args": {"x": "current.x + 2", "y": "current.y - 1", "z": "current.z"}},
  {"command": "dig", "args": {"x": "current.x + 1", "y": "current.y - 1", "z": "current.z + 1"}},
  {"command": "dig", "args": {"x": "current.x + 2", "y": "current.y - 1", "z": "current.z + 1"}}
]

Always respond with valid JSON array of commands, or ask for clarification if the instruction is ambiguous.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, instruction } = body;

    if (!botId || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields: botId, instruction' },
        { status: 400 }
      );
    }

    // Get bot current status for context
    const bot = botManager.getBot(botId);
    if (!bot || !bot.bot) {
      return NextResponse.json(
        { error: 'Bot not found or not connected' },
        { status: 404 }
      );
    }

    const currentPosition = bot.bot.entity.position;
    const currentHealth = bot.bot.health;
    const currentFood = bot.bot.food;

    // Prepare context for the AI
    const contextPrompt = `
Current Bot Status:
- Position: x=${Math.round(currentPosition.x)}, y=${Math.round(currentPosition.y)}, z=${Math.round(currentPosition.z)}
- Health: ${currentHealth}/20
- Food: ${currentFood}/20
- Username: ${bot.serverInfo.username}

User Instruction: "${instruction}"

Convert this instruction into Minecraft bot commands:`;

    // Call Echo LLM API
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_ECHO_API_URL || 'https://api.echo.dev'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ECHO_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: MINECRAFT_COMMAND_SYSTEM_PROMPT },
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!aiResponse.ok) {
      console.error('Echo API error:', await aiResponse.text());
      return NextResponse.json(
        { error: 'AI service unavailable' },
        { status: 503 }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content;

    if (!aiContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse AI response
    let commands;
    try {
      // Extract JSON from AI response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        commands = JSON.parse(jsonMatch[0]);
      } else {
        // AI might have responded with clarification text
        return NextResponse.json({
          success: false,
          clarification: aiContent,
          message: 'AI needs clarification for this instruction'
        });
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      );
    }

    // Execute commands
    const results = [];
    let currentPos = { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z };

    for (const cmd of commands) {
      try {
        // Replace relative coordinates with actual coordinates
        const processedArgs = { ...cmd.args };

        if (processedArgs.x && typeof processedArgs.x === 'string' && processedArgs.x.includes('current')) {
          processedArgs.x = eval(processedArgs.x.replace('current.x', currentPos.x.toString()));
        }
        if (processedArgs.y && typeof processedArgs.y === 'string' && processedArgs.y.includes('current')) {
          processedArgs.y = eval(processedArgs.y.replace('current.y', currentPos.y.toString()));
        }
        if (processedArgs.z && typeof processedArgs.z === 'string' && processedArgs.z.includes('current')) {
          processedArgs.z = eval(processedArgs.z.replace('current.z', currentPos.z.toString()));
        }

        // Execute the command
        let result;
        switch (cmd.command) {
          case 'chat':
            result = await botManager.sendChatMessage(botId, processedArgs.message);
            break;
          case 'move':
            result = await botManager.moveBot(botId, processedArgs.x, processedArgs.y, processedArgs.z);
            if (result.success) {
              currentPos = { x: processedArgs.x, y: processedArgs.y, z: processedArgs.z };
            }
            break;
          case 'look':
            try {
              if (bot.bot) {
                await bot.bot.look(processedArgs.yaw || 0, processedArgs.pitch || 0);
                result = { success: true };
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
            break;
          case 'attack':
            try {
              if (bot.bot) {
                const entity = bot.bot.nearestEntity(e =>
                  e.type === 'mob' && bot.bot!.entity.position.distanceTo(e.position) < 4
                );
                if (entity) {
                  await bot.bot.attack(entity);
                  result = { success: true, data: { attacked: entity.name } };
                } else {
                  result = { success: false, error: 'No nearby entities to attack' };
                }
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
            break;
          case 'dig':
          case 'place':
          case 'inventory':
          case 'status':
            result = { success: false, error: 'Command not yet implemented in AI mode' };
            break;
          default:
            result = { success: false, error: `Unknown command: ${cmd.command}` };
        }

        results.push({
          command: cmd.command,
          args: processedArgs,
          result
        });

        // Add small delay between commands
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.push({
          command: cmd.command,
          args: cmd.args,
          result: { success: false, error: (error as Error).message }
        });
      }
    }

    return NextResponse.json({
      success: true,
      instruction,
      aiResponse: aiContent,
      commands: results,
      totalCommands: commands.length,
      successfulCommands: results.filter(r => r.result.success).length
    });

  } catch (error) {
    console.error('Error processing AI command:', error);
    return NextResponse.json(
      { error: 'Failed to process AI command' },
      { status: 500 }
    );
  }
}