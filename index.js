// index.js
const mineflayer = require('mineflayer');
const { startWandering, checkForNearbyPlayers, decideInteraction, wander, handleSocialInteraction } = require('./agent'); 
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { Ollama } = require('ollama'); // use LLM
const { addBot, removeBot } = require('./botManager');
const { decideAction } = require('./action');
const { perceiveAgentState, generateReflection, MemoryStream } = require('./memory.js');


// initialize ollama
const llm = new Ollama({
  models: ['llama3'], // Specify the model you intend to use
  hostname: 'localhost', // Default is 'api.openai.com'
  port: 5000 // Default port where Ollama might be running locally
});

// modify createbot 
const createBot = (options) => {
  const bot = mineflayer.createBot(options);
  bot.loadPlugin(pathfinder);
  bot.profession = options.profession;
  bot.personality = options.personality;
  bot.background = options.background;
  bot.conversationState = 'Listening'; // Possible states: 'Listening', 'Engaged', 'Action'
  bot.memoryStream = new MemoryStream(llm);
  
  bot.once('spawn', async () => {
    console.log(`${bot.username} has spawned`);
    addBot(bot); // add bot to array
    bot.agent_state = perceiveAgentState(bot); //perceive agent state after spawned

    // Add initial lore memories
    const initMemories = [
      `Personality Type: ${bot.personality}. This is part of who you are.`,
      `Role: ${bot.profession}. This defines your action`,
      `Background: ${bot.background}. This shapes your purpose.`,
      `Agent State: ${bot.agent_state}. This is your health, hunger bar, position, biome, and inventory.`
    ];
    for (const memory of initMemories) {
      await bot.memoryStream.addMemory(memory);
    }
    //all initial memories in lore
    bot.lore = initMemories;

    startWandering(bot, llm);

    //interval tick every 3 secs
    bot.stateInterval = setInterval(() => {
      console.log(`Interval tick. ${bot.username} state:`, bot.conversationState);
    }, 3000); 

    //generate reflection or action every 10 secs
    bot.stateInterval = setInterval(async () => {
      bot.memoryStream.logAllMemories();
      if (bot.conversationState === 'Listening') {
        await generateReflection(bot, llm);
        await decideAction(bot, llm);
      }
    }, 20000); 

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

  return bot;
};


// Initialize both bots using the createBot function
const bot1 = createBot({
  host: 'localhost',
  port: 58132,
  username: 'Hunter',
  agent_state: '',
  personality: 'INTJ-A',
  profession: 'Hunter: Your job is to keep people safe from mobs and hostile players',
  background: 'You are a hunter in a society in Minecraft'
});

const bot2 = createBot({
  host: 'localhost',
  port: 58132,
  username: 'Farmer',
  agent_state: '',
  personality: 'ENFP-A',
  profession: 'Farmer: Your job is to grow and harvest crops to keep the people in your society fed',
  background: 'You are a farmer in a society in Minecraft'
});
