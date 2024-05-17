// agent.js
const mineflayer = require('mineflayer');
const { GoalNear } = require('mineflayer-pathfinder').goals
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { findBotByUsername, bots } = require('./botManager'); // Import the shared state module
const { generateRandomPosition } = require('./utils'); // Import the utility function


//global dialogue variable to store dialogue
let dialogue = "";

// BOT TO BOT handle LLM-based social interactions between bots
async function botToBotSocialInteraction(bot, otherBot, llm, lastMessage = "") {

    const botMemories = await bot.memoryStream.getRelevantMemories('You just saw a person named ${otherBot.username} and decided you wanted to talk to them. What do you want to say to them?', 3);
    console.log('Memories retrieved:', botMemories);
    let prompt = `You are ${bot.username}, a person living in Minecraft. These are your most relevant memories: ${botMemories}.`;
    //if the conversation is not starting from scratch
    if (lastMessage) {
        prompt += `${otherBot.username} said this to you: '${lastMessage}'. A transcript of the full dialogue is the following: ${dialogue}. How do you respond?`;
    } 
    //if conversation is starting from scratch
    else {
        dialogue = "";
        //CONTEXT maybe substitute this out for a generic variable that can be whatever context is
        prompt += ` You just saw a person named ${otherBot.username} and decided you wanted to talk to them. What do you want to say to them?`;
    }
    prompt += " Keep your message brief, concise, and less than 100 characters.";

    try {
        const response = await llm.generate({
            model: 'llama3',
            prompt: prompt,
            max_tokens: 50,
            stop: ["\n"]
        });

        if (response && response.response) {
            const message = response.response.trim();
            bot.chat(message);
            console.log(`${bot.username} says to ${otherBot.username}: ${message}`);
            dialogue += `\n${bot.username}: ${message}\n`;

            // see if the other bot should respond to the message
            console.log(`Dialogue so far to determine whether things should continue: ${dialogue}`)
            const continuePrompt = `Dialogue: ${dialogue}. Given the dialogue so far between ${bot.username} and ${otherBot.username}, should ${otherBot.username} continue the conversation? Return with a yes or no`;
            const decision = await llm.generate({
                model: 'llama3',
                prompt: continuePrompt,
                max_tokens: 10
            });

            if (decision.response.trim().toLowerCase() === "yes") {
                botToBotSocialInteraction(otherBot, bot, llm, message);
            } else {
                otherBot.chat('*decides not to continue conversation*');
                console.log("Conversation ends.");
                otherBot.conversationState = 'Listening';
                bot.conversationState = 'Listening';
                startWandering(bot, llm);
                startWandering(otherBot, llm);
            }
        } else {
            console.log("No valid response or unexpected response structure.");
            bot.conversationState = 'Listening';
            otherBot.conversationState = 'Listening';
            startWandering(bot, llm);
            startWandering(otherBot, llm);
        }
    } catch (err) {
        console.error("Failed to generate dialogue:", err);
        bot.conversationState = 'Listening';
        otherBot.conversationState = 'Listening';
        startWandering(bot, llm);
        startWandering(otherBot, llm);
    }
}

async function botToHumanSocialInteraction(bot, otherBot, llm, lastMessage = "") {
    // Ensure both bots are in 'Engaged' state during the conversation
    bot.conversationState = 'Engaged';
    const botMemories = await bot.memoryStream.getRelevantMemories('You just saw a person named ${otherBot.username} and decided you wanted to talk to them. What do you want to say to them?', 3);
    
    let prompt = `You are ${bot.username}, a person living in Minecraft. This is your background: ${botMemories}.`;
    if (lastMessage) {
        prompt += `${otherBot.username} said this to you: '${lastMessage}'. A transcript of the full dialogue is the following: ${dialogue}. How do you respond?`;
    } else {
        dialogue = "";
        prompt += ` You just saw a person named ${otherBot.username} and decided you wanted to talk to them. What do you want to say to them?`;
    }
    prompt += " Keep your message brief, concise, and less than 100 characters.";

    try {
        const response = await llm.generate({
            model: 'llama3',
            prompt: prompt,
            max_tokens: 50,
            stop: ["\n"]
        });

        if (response && response.response) {
            const message = response.response.trim();
            bot.chat(message);
            console.log(`${bot.username} says to ${otherBot.username}: ${message}`);
            dialogue += `\n${bot.username}: ${message}\n`;
            
            const playerResponse = await returnPlayerResponse(bot, otherBot, 20);

            // Add the player's response to the dialogue (empty string if no response)
            console.log(`${otherBot.username} responded with: ${playerResponse}`);
            dialogue += `\n${otherBot.username}: ${playerResponse}\n`;

            console.log(`Dialogue so far to determine whether things should continue: \n${dialogue}\n`)
            const continuePrompt = `Dialogue: ${dialogue}. Given the dialogue so far between ${bot.username} and ${otherBot.username}, should ${bot.username} continue the conversation? Respond with yes or no.`;
            const decision = await llm.generate({
                model: 'llama3',
                prompt: continuePrompt,
                max_tokens: 10
            });

            if (decision.response.trim().toLowerCase() === "yes") {
                botToHumanSocialInteraction(bot, otherBot, llm, message);
            } else {
                console.log("Conversation ends.");
                bot.chat('*decides not to continue conversation*');
                bot.conversationState = 'Listening';
                startWandering(bot, llm);
            }
        } else {
            console.log("No valid response or unexpected response structure.");
            bot.conversationState = 'Listening';
            startWandering(bot, llm);
        }
    } catch (err) {
        console.error("Failed to generate dialogue:", err);
        bot.conversationState = 'Listening';
        startWandering(bot, llm);
    }
}

function humanToBotSocialInteraction(){


}

//determine whether or not to initiate conversation when agent is observed
async function decideInteraction(bot, playerEntity, llm) {
    if (!playerEntity) {
        console.log(`No other players found near ${bot.username}`);
        return;
    }
    //stop movement
    stopWander(bot);

    //set bot to deciding
    bot.conversationState = 'Deciding';

    //if entity found is another mineflayer bot
    if (isBot(playerEntity) === true) {
        //have the bots look at each other
        //bot.lookAt(playerEntity.position.offset(0, playerEntity.height, 0), true);
        //playerEntity.lookAt(bot.position.offset(0, bot.height, 0), true);
        
        //stop other bot from wandering off
        stopWander(playerEntity)

        console.log(`${bot.username} is close enough to start a conversation with ${playerEntity.username}`);
        const prompt = `You are ${bot.username}. Your background is ${bot.lore}. You just saw ${playerEntity.username}. Do you want to initiate a conversation with ${playerEntity.username}? Answer with yes or no.`;
        
        llm.generate({
            model: 'llama3',
            prompt: prompt,
            max_tokens: 5,
            stop: ["\n"]
        }).then(response => {
            if (response && response.response.trim().toLowerCase() === 'yes') {
                
                // check if the other bot is engaged so the first interaction supercedes 
                bot.conversationState = 'Engaged';
                playerEntity.conversationState = 'Engaged';
                console.log(`${bot.username} decides to speak with ${playerEntity.username}`)
                botToBotSocialInteraction(bot, playerEntity, llm);

                
            } else {
                console.log(`${bot.username} decides not to speak with ${playerEntity.username}`);
                //no convo is started so both bots go back to what they're doing
                bot.conversationState = 'Listening';
                playerEntity.conversationState = 'Listening';
                startWandering(bot, llm)
                startWandering(playerEntity, llm)
            }
        }).catch(err => {
            console.error("Failed to decide on conversation initiation:", err);
        });
    } else if (bot.entity.position.distanceTo(playerEntity.position) > 10) {
        console.log(`${bot.username} is too far from ${playerEntity.username} to start a conversation`);
    }

    //if entity found is a real person
    if (isBot(playerEntity) === false) {
        bot.lookAt(playerEntity.position.offset(0, playerEntity.height, 0), true);
        console.log(`${bot.username} is close enough to start a conversation with ${playerEntity.username}`);
        const prompt = `Should ${bot.username} initiate a conversation with ${playerEntity.username}? Answer with yes or no based on the agent's memory.`;
        
        llm.generate({
            model: 'llama3',
            prompt: prompt,
            max_tokens: 5,
            stop: ["\n"]
        }).then(response => {
            if (response && response.response.trim().toLowerCase() === 'yes') {
                console.log(`${bot.username} decides to speak with ${playerEntity.username}`)
                botToHumanSocialInteraction(bot, playerEntity, llm);
            } else {
                console.log(`${bot.username} decides not to speak with ${playerEntity.username}`);
                bot.conversationState = 'Listening';
                startWandering(bot, llm)
            }
        }).catch(err => {
            console.error("Failed to decide on conversation initiation:", err);
        });
    } 

}



function wander(bot) {
    if (!bot.entity) {
      console.error(`Bot ${bot.username} entity is undefined or null`)
      return
    }
  
    // Generate a random position within 10 blocks of the bot's current position
    const { x, y, z } = generateRandomPosition(bot, 10);
  
    // Set a random goal near this position
    const goal = new GoalNear(x, y, z, 1)
    bot.pathfinder.setGoal(goal)
  }

function stopWander(bot) {
    clearInterval(bot.wanderingInterval);
    console.log(`${bot.username} stopped wandering`);
}

function startWandering(bot, llm) {
    console.log(`${bot.username} started wandering`);

    bot.wanderingInterval = setInterval(() => {
        if (bot.conversationState === 'Listening') {
            wander(bot);
            checkForNearbyPlayers(bot, 10, llm); // Check for nearby players within 10 blocks
        }
    }, 3000); // The interval is set for every 3 seconds
}

function isBot(bot){
    if (bot.username === 'iceMagix'){
        return false
        console.log(`Player detected.`)
    }
    else{
        console.log(`Bot detected.`)
        return true
    }
}


function returnPlayerResponse(bot, otherBot, waitTimeInSeconds) {
    return new Promise((resolve) => {
        // Set a timeout that returns an empty string after the given time
        const timeout = setTimeout(() => {
            bot.removeListener('chat', chatListener);
            resolve("");
        }, waitTimeInSeconds * 1000);

        // Listen for the specific player's chat message
        const chatListener = (username, message) => {
            if (username === otherBot.username) {
                clearTimeout(timeout);
                bot.removeListener('chat', chatListener);
                resolve(message);
            }
        };

        // Attach the chat listener to the bot
        bot.on('chat', chatListener);
    });
}

function checkForNearbyPlayers(bot, distance, llm) {
    const playerEntity = bot.nearestEntity(entity => entity.type === 'player' && entity.username !== bot.username);

    if (playerEntity && bot.entity.position.distanceTo(playerEntity.position) <= distance) {
    
        if(isBot(playerEntity)) //decideInteraction with Bot thats not ENGAGED
            {
            const otherBot = findBotByUsername(playerEntity.username);
            if(otherBot.conversationState === 'Listening')
                {
                    console.log(`${bot.username} can engage with ${playerEntity.username} at distance ${bot.entity.position.distanceTo(playerEntity.position)}`);
                    decideInteraction(bot, otherBot, llm);  
                }
            else{
                //bot is already engaged
                console.log(`${playerEntity.username} is already in conversation`);
            }
            }
        else if (!isBot(playerEntity)){ //decideInteraction with PLAYER
            console.log(`${bot.username} can engage with ${playerEntity.username} at distance ${bot.entity.position.distanceTo(playerEntity.position)}`);
            decideInteraction(bot, playerEntity, llm);  
        }
    }

}


module.exports = { checkForNearbyPlayers, decideInteraction, wander, botToBotSocialInteraction, botToHumanSocialInteraction, startWandering, stopWander };
