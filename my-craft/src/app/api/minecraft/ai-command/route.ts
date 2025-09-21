import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/bot-manager';
import { generateText } from 'ai';
import { openai } from '@/echo';

// Helper function for getting items - always tries creative first, then inventory
async function getItemForPlacement(bot: any, blockName: string) {
  console.log(`Looking for block: "${blockName}"`);
  
  // Always try creative mode first (works if creative, fails silently if not)
  try {
    const mcData = require('minecraft-data')(bot.version);
    console.log(`Minecraft version: ${bot.version}`);
    
    // Try multiple name variations
    const blockNameLower = blockName.toLowerCase();
    const namespacedName = `minecraft:${blockNameLower}`;
    
    // Try exact matches with and without namespace
    let blockType = mcData.blocksByName[blockNameLower] || 
                   mcData.blocksByName[namespacedName] ||
                   mcData.itemsByName[blockNameLower] ||
                   mcData.itemsByName[namespacedName];
    
    if (!blockType) {
      // Try partial matching (both ways)
      blockType = Object.values(mcData.blocksByName).find((block: any) => 
        block.name.includes(blockNameLower) ||
        blockNameLower.includes(block.name) ||
        block.name.includes(namespacedName) ||
        namespacedName.includes(block.name)
      ) || Object.values(mcData.itemsByName).find((item: any) => 
        item.name.includes(blockNameLower) ||
        blockNameLower.includes(item.name) ||
        item.name.includes(namespacedName) ||
        namespacedName.includes(item.name)
      );
    }
    
    console.log(`Found block type:`, blockType ? blockType.name : 'not found');
    console.log(`Bot has creative API:`, !!bot.creative);
    
    if (blockType) {
      console.log(`Found blockType:`, blockType);
      
      if (bot.creative) {
        // Try to use creative inventory
        console.log(`Attempting to set creative inventory slot 36 with ${blockType.name} (ID: ${blockType.id})`);
        try {
          await bot.creative.setInventorySlot(36, blockType, 64); // Try with more items
          const creativeItem = bot.inventory.slots[36];
          if (creativeItem) {
            console.log(`✅ Got item from creative inventory: ${creativeItem.name}`);
            return creativeItem;
          } else {
            console.log(`❌ Creative inventory slot 36 is empty after setting`);
          }
        } catch (creativeError) {
          console.log(`Creative setInventorySlot failed:`, creativeError.message);
        }
      } else {
        console.log(`No creative API available, but found blockType. Trying to create item manually...`);
        
        // Try to create the item directly in creative mode
        try {
          // In creative mode, we might be able to just create the item
          const Item = require('prismarine-item')(bot.version);
          const item = new Item(blockType.id, 1);
          
          // Try to put it in an empty slot
          const emptySlot = bot.inventory.firstEmptySlotRange(36, 44); // Hotbar slots
          if (emptySlot !== null) {
            bot.inventory.slots[emptySlot] = item;
            console.log(`✅ Manually created item in slot ${emptySlot}`);
            return item;
          }
        } catch (manualError) {
          console.log(`Manual item creation failed:`, manualError.message);
        }
      }
    }
  } catch (error) {
    console.log('Creative inventory attempt failed:', error.message);
  }
  
  // Fall back to searching existing inventory
  console.log('Searching regular inventory...');
  const inventoryItems = bot.inventory.items();
  console.log('Available inventory items:', inventoryItems.map(i => i.name));
  
  const blockNameLower = blockName.toLowerCase();
  const namespacedName = `minecraft:${blockNameLower}`;
  
  const foundItem = inventoryItems.find((item: any) => {
    const itemNameLower = item.name.toLowerCase();
    const itemDisplayLower = item.displayName?.toLowerCase() || '';
    
    return itemNameLower.includes(blockNameLower) || 
           itemDisplayLower.includes(blockNameLower) ||
           blockNameLower.includes(itemNameLower) ||
           itemNameLower === namespacedName ||
           itemNameLower.includes(namespacedName) ||
           namespacedName.includes(itemNameLower);
  });
  
  console.log(`Found in inventory:`, foundItem ? foundItem.name : 'not found');
  
  // Last resort: if we're in creative and found the block type, just fake it
  if (!foundItem) {
    console.log('Last resort: attempting to create basic blocks...');
    try {
      const mcData = require('minecraft-data')(bot.version);
      const basicBlocks = ['stone', 'dirt', 'cobblestone', 'oak_planks', 'glass'];
      
      for (const basicBlock of basicBlocks) {
        if (blockName.toLowerCase().includes(basicBlock) || basicBlock.includes(blockName.toLowerCase())) {
          const blockType = mcData.blocksByName[basicBlock] || mcData.itemsByName[basicBlock];
          if (blockType) {
            console.log(`Creating basic block: ${basicBlock}`);
            const Item = require('prismarine-item')(bot.version);
            return new Item(blockType.id, 1);
          }
        }
      }
    } catch (lastResortError) {
      console.log('Last resort failed:', lastResortError.message);
    }
  }
  
  return foundItem;
}

const MINECRAFT_COMMAND_SYSTEM_PROMPT = `You are a Minecraft bot command translator. Your job is to convert natural language instructions into a series of executable Minecraft bot commands.

Available Commands:
- chat <message> - Send a chat message
- move <x> <y> <z> - Move to coordinates
- look <yaw> <pitch> - Look in direction (yaw: 0-360, pitch: -90 to 90)
- attack - Attack nearby mobs
- dig <x> <y> <z> - Dig single block at coordinates
- digHere - Dig the block directly in front of the bot
- digBelow - Dig the block directly below the bot
- place <x> <y> <z> <blockName> - Place block at coordinates
- placeHere <blockName> - Place block in front of the bot
- placeBelow <blockName> - Place block below the bot
- moveTo <x> <y> <z> - Move to position then continue next command
- lookAt <x> <y> <z> - Look at specific coordinates
- observe - Look around and describe what the bot sees nearby
- remember <key> <value> - Store information in bot's memory
- recall <key> - Retrieve information from bot's memory
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

User: "Dig the block in front of you"
Response: [{"command": "digHere", "args": {}}]

User: "Dig below your feet"
Response: [{"command": "digBelow", "args": {}}]

User: "Look at that mountain and move there"
Response: [
  {"command": "lookAt", "args": {"x": "current.x + 20", "y": "current.y + 10", "z": "current.z + 5"}},
  {"command": "moveTo", "args": {"x": "current.x + 20", "y": "current.y + 10", "z": "current.z + 5"}}
]

User: "Move forward, then dig the block in front"
Response: [
  {"command": "moveTo", "args": {"x": "current.x + 1", "y": "current.y", "z": "current.z"}},
  {"command": "digHere", "args": {}}
]

User: "Dig that specific block"
Response: [{"command": "dig", "args": {"x": "current.x + 2", "y": "current.y", "z": "current.z + 1"}}]

User: "Place a stone block in front of you"
Response: [{"command": "placeHere", "args": {"blockName": "stone"}}]

User: "Build a wall with cobblestone"
Response: [
  {"command": "placeHere", "args": {"blockName": "cobblestone"}},
  {"command": "moveTo", "args": {"x": "current.x + 1", "y": "current.y", "z": "current.z"}},
  {"command": "placeHere", "args": {"blockName": "cobblestone"}},
  {"command": "moveTo", "args": {"x": "current.x + 1", "y": "current.y", "z": "current.z"}},
  {"command": "placeHere", "args": {"blockName": "cobblestone"}}
]

User: "Place dirt below your feet"
Response: [{"command": "placeBelow", "args": {"blockName": "dirt"}}]

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
    console.log('AI Command - Looking for botId:', botId);
    console.log('AI Command - All bots:', botManager.getAllBots().map(b => ({ id: b.id, status: b.status, hasBot: !!b.bot })));

    const bot = botManager.getBot(botId);
    console.log('AI Command - Found bot:', bot ? { id: bot.id, status: bot.status, hasBot: !!bot.bot } : 'null');

    if (!bot || !bot.bot) {
      return NextResponse.json(
        {
          error: 'Bot not found or not connected',
          debug: {
            botId,
            botFound: !!bot,
            botHasMinecraftBot: bot ? !!bot.bot : false,
            allBots: botManager.getAllBots().map(b => ({ id: b.id, status: b.status }))
          }
        },
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

    // Use Echo AI SDK integration
    let aiContent: string;
    try {
      const result = await generateText({
        model: openai('gpt-4o'),
        system: MINECRAFT_COMMAND_SYSTEM_PROMPT,
        prompt: contextPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      aiContent = result.text;

      if (!aiContent) {
        return NextResponse.json(
          { error: 'No response from AI' },
          { status: 500 }
        );
      }

    } catch (error) {
      console.error('Echo API error:', error);
      return NextResponse.json(
        { error: 'AI service unavailable' },
        { status: 503 }
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
            try {
              if (bot.bot && !bot.bot.ended) {
                const Vec3 = require('vec3').Vec3;
                const targetPos = new Vec3(
                  Math.floor(processedArgs.x), 
                  Math.floor(processedArgs.y), 
                  Math.floor(processedArgs.z)
                );
                const block = bot.bot.blockAt(targetPos);
                
                if (block && block.name !== 'air') {
                  // Use callback-based dig to avoid crashing
                  bot.bot.dig(block, (err: any) => {
                    if (err) {
                      console.log('Dig completed with minor error:', err.message);
                    }
                  });
                  result = { success: true, data: { block: block.name, position: targetPos } };
                } else {
                  result = { success: false, error: 'No block to dig at that location' };
                }
              } else {
                result = { success: false, error: 'Bot not available or disconnected' };
              }
            } catch (error) {
              result = { success: false, error: `Dig failed: ${(error as Error).message}` };
            }
            break;
          case 'digHere':
            try {
              if (bot.bot && !bot.bot.ended) {
                const pos = bot.bot.entity.position;
                const yaw = bot.bot.entity.yaw;
                
                // Calculate block in front of bot
                const dx = -Math.sin(yaw);
                const dz = -Math.cos(yaw);
                
                const Vec3 = require('vec3').Vec3;
                const targetPos = new Vec3(
                  Math.floor(pos.x + dx), 
                  Math.floor(pos.y), 
                  Math.floor(pos.z + dz)
                );
                const block = bot.bot.blockAt(targetPos);
                
                if (block && block.name !== 'air') {
                  bot.bot.dig(block, (err: any) => {
                    if (err) console.log('DigHere error:', err.message);
                  });
                  result = { success: true, data: { block: block.name, position: targetPos } };
                } else {
                  result = { success: false, error: 'No block in front to dig' };
                }
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: `DigHere failed: ${(error as Error).message}` };
            }
            break;
          case 'digBelow':
            try {
              if (bot.bot && !bot.bot.ended) {
                const pos = bot.bot.entity.position;
                const Vec3 = require('vec3').Vec3;
                const targetPos = new Vec3(Math.floor(pos.x), Math.floor(pos.y - 1), Math.floor(pos.z));
                const block = bot.bot.blockAt(targetPos);
                
                if (block && block.name !== 'air') {
                  bot.bot.dig(block, (err: any) => {
                    if (err) console.log('DigBelow error:', err.message);
                  });
                  result = { success: true, data: { block: block.name, position: targetPos } };
                } else {
                  result = { success: false, error: 'No block below to dig' };
                }
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: `DigBelow failed: ${(error as Error).message}` };
            }
            break;
          case 'lookAt':
            try {
              if (bot.bot && !bot.bot.ended) {
                const targetX = processedArgs.x;
                const targetY = processedArgs.y;
                const targetZ = processedArgs.z;
                const Vec3 = require('vec3').Vec3;
                const target = new Vec3(targetX, targetY, targetZ);
                
                await bot.bot.lookAt(target);
                result = { success: true, data: { lookedAt: { x: targetX, y: targetY, z: targetZ } } };
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: `LookAt failed: ${(error as Error).message}` };
            }
            break;
          case 'moveTo':
            try {
              if (bot.bot && !bot.bot.ended) {
                const targetX = processedArgs.x;
                const targetY = processedArgs.y; 
                const targetZ = processedArgs.z;
                
                // Use pathfinder to move to position
                const Vec3 = require('vec3').Vec3;
                const goals = require('mineflayer-pathfinder').goals;
                await bot.bot.pathfinder.goto(new goals.GoalBlock(targetX, targetY, targetZ));
                
                result = { success: true, data: { movedTo: { x: targetX, y: targetY, z: targetZ } } };
                currentPos = { x: targetX, y: targetY, z: targetZ };
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: `MoveTo failed: ${(error as Error).message}` };
            }
            break;
          case 'place':
            try {
              if (bot.bot && !bot.bot.ended) {
                const Vec3 = require('vec3').Vec3;
                const targetPos = new Vec3(
                  Math.floor(processedArgs.x), 
                  Math.floor(processedArgs.y), 
                  Math.floor(processedArgs.z)
                );
                const blockName = processedArgs.blockName || processedArgs.block;
                
                if (!blockName) {
                  result = { success: false, error: 'Block name required for place command' };
                  break;
                }
                
                // Get the item (handles both creative and survival mode)
                const item = await getItemForPlacement(bot.bot, blockName);
                
                if (!item) {
                  const availableItems = bot.bot.inventory.items().map(i => i.name).join(', ');
                  result = { success: false, error: `Block '${blockName}' not found. Available in inventory: ${availableItems}` };
                  break;
                }
                
                // Note: Removed position checking - allow building on top of existing blocks
                
                // Equip the item
                await bot.bot.equip(item, 'hand');
                
                // Find a reference block to place against (check all adjacent positions)
                let referenceBlock = null;
                let faceVector = null;
                
                const adjacentOffsets = [
                  { offset: [0, -1, 0], face: [0, 1, 0] },  // Below -> place on top
                  { offset: [1, 0, 0], face: [-1, 0, 0] },  // East -> place on west face
                  { offset: [-1, 0, 0], face: [1, 0, 0] },  // West -> place on east face
                  { offset: [0, 0, 1], face: [0, 0, -1] },  // South -> place on north face
                  { offset: [0, 0, -1], face: [0, 0, 1] },  // North -> place on south face
                  { offset: [0, 1, 0], face: [0, -1, 0] }   // Above -> place on bottom
                ];
                
                for (const { offset, face } of adjacentOffsets) {
                  const checkPos = targetPos.offset(offset[0], offset[1], offset[2]);
                  const checkBlock = bot.bot.blockAt(checkPos);
                  
                  if (checkBlock && checkBlock.name !== 'air') {
                    referenceBlock = checkBlock;
                    faceVector = new Vec3(face[0], face[1], face[2]);
                    break;
                  }
                }
                
                if (!referenceBlock) {
                  result = { success: false, error: 'No adjacent block found to place against' };
                  break;
                }
                
                // Place the block
                await bot.bot.placeBlock(referenceBlock, faceVector);
                result = { success: true, data: { 
                  block: blockName, 
                  position: targetPos,
                  placedAgainst: referenceBlock.name,
                  itemUsed: item.name
                } };
                
              } else {
                result = { success: false, error: 'Bot not available or disconnected' };
              }
            } catch (error) {
              result = { success: false, error: `Place failed: ${(error as Error).message}` };
            }
            break;
          case 'placeHere':
            try {
              if (bot.bot && !bot.bot.ended) {
                const pos = bot.bot.entity.position;
                const yaw = bot.bot.entity.yaw;
                const blockName = processedArgs.blockName || processedArgs.block;
                
                if (!blockName) {
                  result = { success: false, error: 'Block name required for placeHere command' };
                  break;
                }
                
                // Calculate position in front of bot
                const dx = -Math.sin(yaw);
                const dz = -Math.cos(yaw);
                const targetPos = {
                  x: Math.floor(pos.x + dx), 
                  y: Math.floor(pos.y), 
                  z: Math.floor(pos.z + dz)
                };
                
                // Simple placement like dig commands
                const Vec3 = require('vec3').Vec3;
                const targetVec3 = new Vec3(targetPos.x, targetPos.y, targetPos.z);
                
                // Find item in inventory with namespace handling
                const blockNameLower = blockName.toLowerCase();
                const namespacedName = `minecraft:${blockNameLower}`;
                
                const item = bot.bot.inventory.items().find(item => {
                  const itemNameLower = item.name.toLowerCase();
                  const itemDisplayLower = item.displayName?.toLowerCase() || '';
                  
                  return itemNameLower.includes(blockNameLower) || 
                         itemDisplayLower.includes(blockNameLower) ||
                         blockNameLower.includes(itemNameLower) ||
                         itemNameLower === namespacedName ||
                         itemNameLower.includes(namespacedName) ||
                         namespacedName.includes(itemNameLower);
                });
                
                if (!item) {
                  const available = bot.bot.inventory.items().map(i => i.name).join(', ');
                  result = { success: false, error: `Block '${blockName}' not found. Available: ${available}` };
                  break;
                }
                
                // Equip and place (simple like dig)
                await bot.bot.equip(item, 'hand');
                
                // Find ground to place on
                const groundBlock = bot.bot.blockAt(targetVec3.offset(0, -1, 0));
                if (groundBlock && groundBlock.name !== 'air') {
                  await bot.bot.placeBlock(groundBlock, new Vec3(0, 1, 0));
                  result = { success: true, data: { block: blockName, position: targetPos } };
                } else {
                  result = { success: false, error: 'No ground to place on' };
                }
                
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: `PlaceHere failed: ${(error as Error).message}` };
            }
            break;
          case 'placeBelow':
            try {
              if (bot.bot && !bot.bot.ended) {
                const pos = bot.bot.entity.position;
                const blockName = processedArgs.blockName || processedArgs.block;
                
                if (!blockName) {
                  result = { success: false, error: 'Block name required for placeBelow command' };
                  break;
                }
                
                const Vec3 = require('vec3').Vec3;
                const targetPos = new Vec3(Math.floor(pos.x), Math.floor(pos.y - 1), Math.floor(pos.z));
                
                // Allow building on top of existing blocks
                
                const item = await getItemForPlacement(bot.bot, blockName);
                
                if (!item) {
                  result = { success: false, error: `Block '${blockName}' not found` };
                  break;
                }
                
                await bot.bot.equip(item, 'hand');
                
                // Try to place against an adjacent block
                const adjacentBlock = bot.bot.blockAt(targetPos.offset(0, -1, 0)) ||
                                    bot.bot.blockAt(targetPos.offset(1, 0, 0)) ||
                                    bot.bot.blockAt(targetPos.offset(-1, 0, 0)) ||
                                    bot.bot.blockAt(targetPos.offset(0, 0, 1)) ||
                                    bot.bot.blockAt(targetPos.offset(0, 0, -1));
                
                if (adjacentBlock && adjacentBlock.name !== 'air') {
                  await bot.bot.placeBlock(adjacentBlock, new Vec3(0, 1, 0));
                  result = { success: true, data: { block: blockName, position: targetPos, placedBelow: true } };
                } else {
                  result = { success: false, error: 'No adjacent block found to place against' };
                }
                
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: `PlaceBelow failed: ${(error as Error).message}` };
            }
            break;
          case 'inventory':
            try {
              if (bot.bot && !bot.bot.ended) {
                const items = bot.bot.inventory.items().map(item => ({
                  name: item.name,
                  displayName: item.displayName,
                  count: item.count,
                  slot: item.slot
                }));
                result = { success: true, data: { items, totalItems: items.length } };
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
            break;
          case 'status':
            try {
              if (bot.bot && !bot.bot.ended) {
                const pos = bot.bot.entity.position;
                const gameMode = bot.bot.game.gameMode;
                const gameModeNames = {
                  0: 'Survival',
                  1: 'Creative', 
                  2: 'Adventure',
                  3: 'Spectator'
                };
                
                const status = {
                  position: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
                  health: bot.bot.health,
                  food: bot.bot.food,
                  experience: bot.bot.experience,
                  gameMode: gameMode,
                  gameModeName: gameModeNames[gameMode] || `Unknown (${gameMode})`,
                  dimension: bot.bot.game.dimension,
                  time: bot.bot.time.timeOfDay,
                  weather: {
                    raining: bot.bot.isRaining,
                    thundering: bot.bot.thunderState > 0
                  },
                  inventorySlots: bot.bot.inventory.items().length,
                  hasCreativeInventory: !!bot.bot.creative
                };
                result = { success: true, data: status };
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
            break;
          case 'observe':
            try {
              if (bot.bot && !bot.bot.ended) {
                const observeResult = await botManager.observeWorld(botId);
                if (observeResult.success) {
                  const obs = observeResult.data;
                  const description = `I can see ${obs.nearbyBlocks.length} blocks nearby including: ${obs.nearbyBlocks.slice(0,5).map(b => b.name).join(', ')}. ${obs.nearbyEntities.length} entities nearby. My inventory has: ${obs.inventory.map(i => `${i.count} ${i.name}`).join(', ')}.`;
                  result = { success: true, data: { observation: description, details: obs } };
                } else {
                  result = observeResult;
                }
              } else {
                result = { success: false, error: 'Bot not available' };
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
            break;
          case 'remember':
            try {
              const key = processedArgs.key;
              const value = processedArgs.value;
              if (key && value) {
                const memResult = await botManager.addMemory(botId, key, value);
                result = memResult.success ? { success: true, data: { remembered: key } } : memResult;
              } else {
                result = { success: false, error: 'Key and value required for remember command' };
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
            break;
          case 'recall':
            try {
              const key = processedArgs.key;
              if (key) {
                const memResult = await botManager.getMemory(botId, key);
                result = memResult.success ? { success: true, data: { recalled: key, value: memResult.data } } : memResult;
              } else {
                const allMem = await botManager.getMemory(botId);
                result = allMem.success ? { success: true, data: { allMemories: allMem.data } } : allMem;
              }
            } catch (error) {
              result = { success: false, error: (error as Error).message };
            }
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