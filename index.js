// index.js
const mineflayer = require('mineflayer');
const { startWandering, checkForNearbyPlayers, decideInteraction, wander, handleSocialInteraction } = require('./agent'); 
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { Ollama } = require('ollama'); // use LLM
const { addBot, removeBot } = require('./botManager');
const { giveItemToBot, decideAction, getPlan, generateCode, generatePlan, perceiveAgentState } = require('./action');
const { generateReflection, MemoryStream } = require('./memory.js');
const armorManager = require('mineflayer-armor-manager')
const pvp = require('mineflayer-pvp').plugin


// initialize ollama
const llm = new Ollama({
  models: ['llama3'], // Specify the model you intend to use
  hostname: 'localhost', // Default is 'api.openai.com'
  port: 5000 // Default port where Ollama might be running locally
});

// modify createbot 
const createBot = (options) => {
  const bot = mineflayer.createBot(options);
  //load plugins after bot object is created
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp)
  bot.loadPlugin(armorManager)

  bot.plan = options.plan; //keep blank so they can generate their own plan
  bot.profession = options.profession;
  bot.personality = options.personality;
  bot.background = options.background;

  //set health and food to given values
  bot.health = options.current_health; //make it so people can set health
  bot.food = options.current_hunger;
  bot.current_inventory = options.current_inventory;

  bot.current_position = options.current_position; //cant perceive before created, leave blank
  bot.current_biome = options.current_biome;

  bot.conversationState = 'Listening'; // Possible states: 'Listening', 'Engaged', 'Action'
  bot.memoryStream = new MemoryStream(llm);
  
  bot.once('spawn', async () => {
    console.log(`${bot.username} has spawned`);
    bot.chat('/gamemode survival');
    addBot(bot); // add bot to array
    
    //initial items given to bot
    /*if(bot.username === 'Hunter'){
      giveItemToBot('diamond_sword', 1, bot);
    }
    if(bot.username === 'Farmer'){
      giveItemToBot('diamond_hoe', 1, bot);
    }*/

    bot.agent_state = perceiveAgentState(bot); //perceive agent state after spawned

    // Add initial lore memories
    const initMemories = [
      `Your Personality Type: ${bot.personality}.`,
      `Your profession: ${bot.profession}.`,
      `Your background: ${bot.background}.`,
      `Agent State: ${bot.agent_state}. This is your current player state in Minecraft.`
    ];
    for (const memory of initMemories) {
      await bot.memoryStream.addMemory(memory);
    }
    //all initial memories in lore
    bot.lore = initMemories;

    startWandering(bot, llm);
    //every day generate a new plan
    bot.stateInterval2 = setInterval(() => {
      bot.plan = ''; //reset plan
      console.log(`Generating plan for ${bot.username}..`)
      generatePlan(bot, llm);
      generateCode(bot, getPlan(bot), llm);

    }, 1200000); 

    generatePlan(bot, llm);
    generateCode(bot, getPlan(bot), llm);

    //interval tick every 3 secs
    bot.stateInterval = setInterval(() => {
      console.log(`Interval tick. ${bot.username} state:`, bot.conversationState);
    }, 3000); 

    /* generate reflection or action every 10 secs
    bot.stateInterval = setInterval(async () => {
      bot.memoryStream.logAllMemories();
      if (bot.conversationState === 'Listening') {
        await generateReflection(bot, llm);
        await decideAction(bot, llm);
      }
    }, 50000); */

    // code to add agent state to memory 
    //bot.memoryStream.addMemory(`Agent State: ${JSON.stringify(perceiveAgentState(bot))}`);

  });

  //once bot disconnects remove bot
  bot.once('end', () => {
    console.log(`${bot.username} has disconnected`);
    removeBot(bot); // Remove bot from the array on disconnect
  });

  bot.on('chat', (username, message) => {
    if (message === 'stop') {
      bot.quit('Stopping as requested.');
    }
  });

  //collect items that drop
  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector !== bot.entity) return

    setTimeout(() => {
      const sword = bot.inventory.items().find(item => item.name.includes('sword'))
      if (sword) bot.equip(sword, 'hand')
    }, 150)

    setTimeout(() => {
      const shield = bot.inventory.items().find(item => item.name.includes('shield'))
      if (shield) bot.equip(shield, 'off-hand')
    }, 250)
  })
  

  return bot;
};


// Initialize both bots using the createBot function
const bot1 = createBot({
  host: 'localhost',
  port: 60857,
  username: 'Hunter',
  current_health: 20,
  current_hunger: 20,
  current_position: '',
  current_biome: '',
  current_inventory: '',
  agent_state: '',
  personality: 'INTJ-A',
  profession: 'Hunter: Your job is to keep people safe from mobs and hostile players',
  background: 'You are a hunter in a society in Minecraft',
  plan: ''
});

const bot2 = createBot({
  host: 'localhost',
  port: 60857,
  username: 'Farmer',
  current_health: 20,
  current_hunger: 20,
  current_position: '',
  current_biome: '',
  current_inventory: '',
  agent_state: '',
  personality: 'ENFP-A',
  profession: 'Farmer: Your job is to grow and harvest crops to keep the people in your society fed',
  background: 'You are a farmer in a society in Minecraft',
  plan: ''
});
