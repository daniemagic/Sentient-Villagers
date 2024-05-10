// index.js
const mineflayer = require('mineflayer');
const { startWandering, checkForNearbyPlayers, decideInteraction, wander, handleSocialInteraction } = require('./agent'); 
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { Ollama } = require('ollama'); // use LLM

// initialize ollama
const llm = new Ollama({
  models: ['llama3'], // Specify the model you intend to use
  hostname: 'localhost', // Default is 'api.openai.com'
  port: 5000 // Default port where Ollama might be running locally
});

// modify createbot 
const createBot = (options, lore) => {
  const bot = mineflayer.createBot(options);
  bot.loadPlugin(pathfinder);
  bot.lore = lore;
  bot.conversationState = 'Listening'; // Possible states: 'Listening', 'Engaged', 'Action'

  bot.once('spawn', () => {
    console.log(`${bot.username} has spawned`);
    startWandering(bot, llm);

    bot.stateInterval = setInterval(() => {
      console.log(`Interval tick. ${bot.username} state:`, bot.conversationState);
  }, 3000); 

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
  port: 61760,
  username: 'Hunter',
  lore: "You are a hunter in a society in Minecraft. Your job is to keep the people safe from mobs and hostile players"
}, "");

const bot2 = createBot({
  host: 'localhost',
  port: 61760,
  username: 'Farmer',
  lore: "You are a farmer in a society in Minecraft. Your job is to keep the people fed."
}, "");
