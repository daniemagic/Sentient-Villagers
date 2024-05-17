// botsManager.js
const bots = [];

function addBot(bot) {
  bots.push(bot);
}

function removeBot(bot) {
  const index = bots.indexOf(bot);
  if (index > -1) {
    bots.splice(index, 1);
  }
}

function findBotByUsername(username) {
  return bots.find(bot => bot.username === username);
}

module.exports = { bots, addBot, removeBot, findBotByUsername };
