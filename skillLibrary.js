//skillLibrary.js

const skillLibrary = {
    attack: (bot, target) => {
      // Example skill: Attack a target
      if (!target) {
        console.log('No target specified for attack.');
        return;
      }
      bot.pvp.attack(target);
    },


}

module.exports = { skillLibrary };
  