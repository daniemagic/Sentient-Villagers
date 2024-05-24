// action.js
const { Biome } = require('prismarine-biome')('1.16');  // Use the appropriate Minecraft version
const registry = require('prismarine-registry')('1.8')
const { Item } = require('prismarine-item')('1.16');  // Ensure you use the correct Minecraft version
const Vec3 = require('vec3');

function perceiveAgentState(bot) {

    bot.current_health = bot.health;
    bot.current_hunger = bot.food;
    bot.current_position = bot.entity.position;

    //find and set biome
    //bot.current_biome = bot.world.getBiome(bot.entity.position).name;

    bot.current_inventory = bot.inventory.items().map(item => ` ${item.name} x${item.count}`);
    
    const perception = {
      health_bar: bot.current_health,
      hunger_bar: bot.current_hunger,
      current_position: bot.current_position,
      //current_biome: bot.current_biome,
      current_inventory: bot.current_inventory,
    };


        console.log(`Agent State for ${bot.username}:`);
        console.log(`Health: ${bot.current_health}`);
        console.log(`Food: ${bot.current_hunger}`);
        console.log(`Position: ${bot.current_position}`);
        console.log(`Biome: ${bot.current_biome}`);
        console.log(`Inventory:${bot.current_inventory}`); 
        
    return JSON.stringify(perception);

    }
async function generatePlan(bot, llm) {
   //replace this with memory retrieval

   if(bot.plan === '') //create a new plan only if bot doesnt have a plan
        {
        console.log(`${bot.agent_state}`);
        const context = `Information about you in the Minecraft world: ${bot.agent_state}, your background: ${bot.background}.`;
        const prompt = `Given the following details: ${context}, what should your plan be for today's Minecraft day (20 minutes)? Do not preface your answer. Please outline a list of 3 tasks you aim to accomplish. Each task must make sense for you and be something you can realistically accomplish in Minecraft given your current information. Your answer should be less than 100 characters and start with 1. (task)`;

        try {
            const response = await llm.generate({
                model: 'llama3',
                prompt: prompt,
                max_tokens: 100,
                stop: ["\n"]
            });

            if (response && response.response) {
                bot.dailyPlan = response.response.trim();
                console.log(`${bot.username}'s Plan: ${bot.dailyPlan}`);
            }
        } catch (err) {
            console.error("Failed to generate plan:", err);
            bot.dailyPlan = "Error generating plan, please try again.";
        }
        }
}

async function decideAction(bot, llm) {
    const context = bot.memoryStream.getRelevantMemories('', 3); // Retrieve the top 10 relevant memories
    const prompt = `Based on the context: ${context}, what should ${bot.username} do next?`;
  
    try {
      const response = await llm.generate({
        model: 'llama3',
        prompt: prompt,
        max_tokens: 50,
        stop: ["\n"]
      });
  
      if (response && response.response) {
        const action = response.response.trim();
        bot.chat(action); // Perform the action
        bot.memoryStream.addMemory(`Decided to: ${action}`);
      }
    } catch (err) {
      console.error("Failed to decide action:", err);
    }
  }
  
function giveItemToBot(itemName, count, bot) {
  /*const mcData = require('minecraft-data')(bot.version);
  const item = new Item(mcData.itemsByName[itemName].id, count);
  
  // Adding item to bot's inventory
  bot.inventory.slots[36] = item; // The main inventory slots start at index 36

  console.log(`Gave the bot ${count} ${itemName}(s).`); */
}
  
  
  module.exports = { giveItemToBot, decideAction, generatePlan, perceiveAgentState };
  