// action.js
const { Biome } = require('prismarine-biome')('1.16');  // Use the appropriate Minecraft version
const registry = require('prismarine-registry')('1.8')
const { Item } = require('prismarine-item')('1.16');  // Ensure you use the correct Minecraft version
const Vec3 = require('vec3');
const skillLibrary = require('./skillLibrary');

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
        const prompt = `Given the following details: ${context}, what should your plan be for today's Minecraft day (20 minutes)? Do not preface your answer. Please outline a list of 3 tasks you aim to accomplish. The tasks should be listed in the order you want to accomplish them. Each task must make sense for you and be something you can realistically accomplish in Minecraft given your current information. Your answer should be less than 100 characters and start with 1. (task)`;

        try {
            const response = await llm.generate({
                model: 'llama3',
                prompt: prompt,
                max_tokens: 100,
                stop: ["\n"]
            });

            if (response && response.response) {
                bot.plan = response.response.trim();
                const timestamp = new Date().toLocaleDateString();

                tasks = separatePlanIntoTasks(bot.plan);
                console.log(`${bot.username}'s Plan for ${timestamp}: ${bot.plan}`);
                bot.memoryStream.addMemory(`${timestamp} Task 1: ${tasks[0]}`);
                bot.memoryStream.addMemory(`${timestamp} Task 2: ${tasks[1]}`);
                bot.memoryStream.addMemory(`${timestamp} Task 3: ${tasks[2]}`);
            }
            }
        catch (err) {
            console.error("Failed to generate plan:", err);
            bot.dailyPlan = "Error generating plan, please try again.";
        }
        }
}

function separatePlanIntoTasks(plan) {
    const tasks = plan.split('\n').map(task => task.trim()).filter(task => task !== '');
    return tasks;
}

async function decideAction(bot, llm) {
    const context = bot.memoryStream.getRelevantMemories('What are tasks you want to accomplish today?', 3); // Retrieve the top 10 relevant memories
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
        bot.memoryStream.addMemory(`You decided to: ${action}`);
      }
    } catch (err) {
      console.error("Failed to decide action:", err);
    }
  }

async function getPlan(bot){
    const singleTask = await bot.memoryStream.getRelevantMemories('What is the task you should conduct?', 1);
    return singleTask[0].memory;
  }

async function generateCode(bot, singlePlan, llm){

    const initialPrompt = `You are a helpful assistant that writes Mineflayer javascript code to
    complete any Minecraft task specified by me.
    
    Here are some useful programs written with Mineflayer APIs .
    /*
    Explore until find an iron_ore , use Vec3 (0, -1, 0) because iron ores
    are usually underground
    await exploreUntil (bot , new Vec3 (0, -1, 0) , 60, () => {
    const iron_ore = bot. findBlock ({
    matching : mcData . blocksByName [" iron_ore "].id ,
    maxDistance : 32,
    });
    return iron_ore ;
    });
    Explore until find a pig , use Vec3 (1, 0, 1) because pigs are usually
    on the surface
    let pig = await exploreUntil (bot , new Vec3 (1, 0, 1) , 60, () => {
    const pig = bot. nearestEntity (( entity ) => {
    return (
    entity . name === "pig" &&
    entity . position . distanceTo (bot. entity . position ) < 32
    );
    });
    return pig;
    });
    */
    async function exploreUntil (bot , direction , maxTime = 60, callback ) {
    /*
    Implementation of this function is omitted .
    direction : Vec3 , can only contain value of -1, 0 or 1
    maxTime : number , the max time for exploration
    callback : function , early stop condition , will be called each
    second , exploration will stop if return value is not null
    Return : null if explore timeout , otherwise return the return value
    of callback
    */
    }
    // Mine 3 cobblestone : mineBlock (bot , " stone ", 3);
    async function mineBlock (bot , name , count = 1) {
    const blocks = bot. findBlocks ({
    matching : ( block ) => {
    return block . name === name ;
    },
    maxDistance : 32,
    count : count ,
    });
    const targets = [];
    for ( let i = 0; i < Math .min ( blocks . length , count ); i ++) {
    targets . push (bot. blockAt ( blocks [i]));
    }
    await bot . collectBlock . collect ( targets , { ignoreNoPath : true });
    }
    // Craft 8 oak_planks from 2 oak_log (do the recipe 2 times ):
    craftItem (bot , " oak_planks ", 2);
    // You must place a crafting table before calling this function
    async function craftItem (bot , name , count = 1) {
    const item = mcData . itemsByName [ name ];
    const craftingTable = bot . findBlock ({
    matching : mcData . blocksByName . crafting_table .id ,
    maxDistance : 32,
    });
    await bot . pathfinder . goto (
    new GoalLookAtBlock ( craftingTable . position , bot. world )
    );
    const recipe = bot. recipesFor ( item .id , null , 1, craftingTable ) [0];
    await bot . craft (recipe , count , craftingTable );
    }
    // Place a crafting_table near the player , Vec3 (1, 0, 0) is just an
    example , you shouldn ’t always use that : placeItem (bot , "
    crafting_table ", bot. entity . position . offset (1, 0, 0));
    async function placeItem (bot , name , position ) {
    const item = bot. inventory . findInventoryItem ( mcData . itemsByName [
    name ]. id);
    // find a reference block
    const faceVectors = [
    new Vec3 (0, 1, 0) ,
    new Vec3 (0, -1, 0) ,
    new Vec3 (1, 0, 0) ,
    new Vec3 (-1, 0, 0) ,
    new Vec3 (0, 0, 1) ,
    new Vec3 (0, 0, -1) ,
    ];
    let referenceBlock = null ;
    let faceVector = null ;
    for ( const vector of faceVectors ) {
    const block = bot. blockAt ( position . minus ( vector ));
    if ( block ?. name !== "air ") {
    referenceBlock = block ;
    faceVector = vector ;
    break ;
    }
    }
    // You must first go to the block position you want to place
    await bot . pathfinder . goto (new GoalPlaceBlock ( position , bot.world ,
    {}) );
    // You must equip the item right before calling placeBlock
    await bot . equip (item , " hand ");
    await bot . placeBlock ( referenceBlock , faceVector );
    }
    // Smelt 1 raw_iron into 1 iron_ingot using 1 oak_planks as fuel :
    smeltItem (bot , " raw_iron ", " oak_planks ");
    // You must place a furnace before calling this function
    async function smeltItem (bot , itemName , fuelName , count = 1) {
    const item = mcData . itemsByName [ itemName ];
    const fuel = mcData . itemsByName [ fuelName ];
    const furnaceBlock = bot . findBlock ({
    matching : mcData . blocksByName . furnace .id ,
    maxDistance : 32,
    });
    await bot . pathfinder . goto (
    new GoalLookAtBlock ( furnaceBlock . position , bot. world )
    );
    const furnace = await bot. openFurnace ( furnaceBlock );
    for ( let i = 0; i < count ; i++) {
    await furnace . putFuel ( fuel .id , null , 1);
    await furnace . putInput ( item .id , null , 1);
    // Wait 12 seconds for the furnace to smelt the item
    await bot . waitForTicks (12 * 20);
    await furnace . takeOutput ();
    }
    await furnace . close ();
    }
    // Kill a pig and collect the dropped item : killMob (bot , "pig", 300) ;
    async function killMob (bot , mobName , timeout = 300) {
    const entity = bot. nearestEntity (
    ( entity ) =>
    entity . name === mobName &&
    entity . position . distanceTo (bot. entity . position ) < 32
    );
    await bot .pvp. attack ( entity );
    await bot . pathfinder . goto (
    new GoalBlock ( entity . position .x, entity . position .y, entity .
    position .z)
    );
    }
    // Get a torch from chest at (30 , 65, 100) : getItemFromChest (bot , new
    Vec3 (30 , 65, 100) , {" torch ": 1}) ;
    // This function will work no matter how far the bot is from the chest
    .
    async function getItemFromChest (bot , chestPosition , itemsToGet ) {
    await moveToChest (bot , chestPosition );
    const chestBlock = bot . blockAt ( chestPosition );
    const chest = await bot . openContainer ( chestBlock );
    for ( const name in itemsToGet ) {
    const itemByName = mcData . itemsByName [ name ];
    const item = chest . findContainerItem ( itemByName .id);
    await chest . withdraw ( item .type , null , itemsToGet [ name ]);
    }
    await closeChest (bot , chestBlock );
    }
    // Deposit a torch into chest at (30 , 65, 100) : depositItemIntoChest (
    bot , new Vec3 (30 , 65, 100) , {" torch ": 1});
    // This function will work no matter how far the bot is from the chest
    .
    async function depositItemIntoChest (bot , chestPosition , itemsToDeposit
    ) {
    await moveToChest (bot , chestPosition );
    const chestBlock = bot . blockAt ( chestPosition );
    const chest = await bot . openContainer ( chestBlock );
    for ( const name in itemsToDeposit ) {
    const itemByName = mcData . itemsByName [ name ];
    const item = bot. inventory . findInventoryItem ( itemByName .id);
    await chest . deposit ( item .type , null , itemsToDeposit [ name ]);
    }
    await closeChest (bot , chestBlock );
    }
    // Check the items inside the chest at (30 , 65, 100) :
    checkItemInsideChest (bot , new Vec3 (30 , 65, 100) );
    // You only need to call this function once without any action to
    finish task of checking items inside the chest .
    async function checkItemInsideChest (bot , chestPosition ) {
    await moveToChest (bot , chestPosition );
    const chestBlock = bot . blockAt ( chestPosition );
    await bot . openContainer ( chestBlock );
    // You must close the chest after opening it if you are asked to
    open a chest
    await closeChest (bot , chestBlock );
    }
    await bot . pathfinder . goto ( goal ); // A very useful function . This
    function may change your main - hand equipment .
    // Following are some Goals you can use:
    new GoalNear (x, y, z, range ); // Move the bot to a block within the
    specified range of the specified block . ‘x‘, ‘y‘, ‘z‘, and ‘range ‘
    are ‘number ‘
    new GoalXZ (x, z); // Useful for long - range goals that don ’t have a
    specific Y level . ‘x‘ and ‘z‘ are ‘number ‘
    new GoalGetToBlock (x, y, z); // Not get into the block , but get
    directly adjacent to it. Useful for fishing , farming , filling
    bucket , and beds . ‘x‘, ‘y‘, and ‘z‘ are ‘number ‘
    new GoalFollow (entity , range ); // Follow the specified entity within
    the specified range . ‘entity ‘ is ‘Entity ‘, ‘range ‘ is ‘number ‘
    new GoalPlaceBlock ( position , bot.world , {}); // Position the bot in
    order to place a block . ‘position ‘ is ‘Vec3 ‘
    new GoalLookAtBlock ( position , bot.world , {}); // Path into a position
    where a blockface of the block at position is visible . ‘position ‘
    is ‘Vec3 ‘
    // These are other Mineflayer functions you can use:
    bot . isABed ( bedBlock ); // Return true if ‘bedBlock ‘ is a bed
    bot . blockAt ( position ); // Return the block at ‘position ‘. ‘position ‘
    is ‘Vec3 ‘
    // These are other Mineflayer async functions you can use:
    await bot . equip (item , destination ); // Equip the item in the specified
    destination . ‘item ‘ is ‘Item ‘, ‘destination ‘ can only be " hand ",
    " head ", " torso ", " legs ", " feet ", "off - hand "
    await bot . consume (); // Consume the item in the bot ’s hand . You must
    equip the item to consume first . Useful for eating food , drinking
    potions , etc.
    await bot . fish (); // Let bot fish . Before calling this function , you
    must first get to a water block and then equip a fishing rod. The
    bot will automatically stop fishing when it catches a fish
    await bot . sleep ( bedBlock ); // Sleep until sunrise . You must get to a
    bed block first
    await bot . activateBlock ( block ); // This is the same as right - clicking
    a block in the game . Useful for buttons , doors , using hoes , etc.
    You must get to the block first
    await bot . lookAt ( position ); // Look at the specified position . You
    must go near the position before you look at it. To fill bucket
    with water , you must lookAt first . ‘position ‘ is ‘Vec3 ‘
    await bot . activateItem (); // This is the same as right - clicking to use
    the item in the bot ’s hand . Useful for using buckets , etc. You
    must equip the item to activate first
    await bot . useOn ( entity ); // This is the same as right - clicking an
    entity in the game . Useful for shearing sheep , equipping harnesses
    , etc . You must get to the entity first

    This is the task: ${singlePlan}

    You should only respond in the format as described below:
    Explain: ...
    Plan:
    1) ...
    2) ...
    3) ...
    Code:
    ‘‘‘ javascript
    // helper functions ( only if needed , try to avoid them )
        // main function after the helper functions
    async function yourMainFunctionName (bot) {
    // ...
    }
    ‘‘‘

    `;
  
    let prompt = initialPrompt;
    let skillAdded = false;

    while (!skillAdded) {
        try {
            const response = await llm.generate({
                model: 'llama3',
                prompt: prompt,
                max_tokens: 500,
                stop: ["\n"]
            });

            if (response && response.response) {
                const skillCode = response.response.trim();
                console.log(`Generated Code: ${skillCode}`);

                // Evaluate the generated code
                try {
                    eval(skillCode);

                    // If no errors, add the function to the skill library
                    const functionName = skillCode.match(/async function (\w+)\s*\(/)[1];
                    skillLibrary[functionName] = eval(`(${skillCode})`);
                    console.log(`Added ${functionName} to skill library.`);
                    bot.memoryStream.addSkill(`${functionName}`);
                    skillAdded = true;

                    // Execute the added skill
                    await skillLibrary[functionName](bot);

                } catch (executionError) {
                    console.error("Error executing code:", executionError);
                    // Append the error message to the prompt for correction
                    prompt = `${initialPrompt}\nThe code resulted in the following error:\n${executionError}\nPlease fix the code.`;
                }
            }
        } catch (err) {
            console.error("Failed to generate or execute code:", err);
        }
    }

}

function giveItemToBot(itemName, count, bot) {
  /*const mcData = require('minecraft-data')(bot.version);
  const item = new Item(mcData.itemsByName[itemName].id, count);
  
  // Adding item to bot's inventory
  bot.inventory.slots[36] = item; // The main inventory slots start at index 36

  console.log(`Gave the bot ${count} ${itemName}(s).`); */
}
  
  
module.exports = { giveItemToBot, generateCode, getPlan, decideAction, generatePlan, perceiveAgentState };
  