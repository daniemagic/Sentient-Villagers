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
  

  
  
  module.exports = { decideAction };
  