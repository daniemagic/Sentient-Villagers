// memory.js
const { cosineSimilarity } = require('./utils'); // Import cosine similarity utility function

class MemoryStream {
  constructor(llm) {
    this.memories = [];
    this.library = [];
    this.llm = llm;
  }

  async addMemory(memory) {
    const timestamp = new Date().toLocaleString();
    this.memories.push({ memory, timestamp });
  }
  async addSkill(skill){
    this.library.push({ skill} )
  }

  async getImportanceScore(memory) {
    const prompt = `On the scale of 1 to 10, where 1 is purely mundane (e.g., brushing teeth, making bed) and 10 is extremely poignant (e.g., a break up, college acceptance), rate the likely poignancy of the following piece of memory.\nMemory: ${memory} \n The only output you should give is a number.`;
    
    try {
      const ans = await this.llm.generate({
        model: 'llama3',
        prompt: prompt,
        max_tokens: 1,
        stop: ["\n"]
      });
      return Number(ans.response.trim());

    } catch (err) {
      console.error("Failed to get importance score:", err);
      return 1; // Default to mundane if LLM call fails
    }
  }

// Get embedding vector for the memory using the language model
  async getEmbedding(text) {
    try {
      const response = await this.llm.embeddings({
        model: 'llama3',
        prompt: text
      });
      return response.embedding;
    } catch (err) {
      console.error("Failed to get embedding:", err);
      return [];
    }
  }
  //get relevant memories with calculation from stanford simulacra paper
  async getRelevantMemories(context, limit = 3) {
    let scores = [];
    const importanceScoresPromises = this.memories.map(mem => this.getImportanceScore(mem.memory));
    const importanceScores = await Promise.all(importanceScoresPromises);


    if(!(context === '')){
        const contextEmbedding = await this.getEmbedding(context);

        // Fetch embeddings for all memories concurrently for efficiency
        const embeddingsPromises = this.memories.map(mem => this.getEmbedding(mem.memory));
        const embeddings = await Promise.all(embeddingsPromises);
        scores = await Promise.all(this.memories.map(async (mem, index) => {
            const memEmbedding = embeddings[index];
            
            const recencyScore = this.calculateRecency(mem.timestamp);
            const relevanceScore = this.calculateRelevance(memEmbedding, contextEmbedding);
            const importanceScore = Number(importanceScores[index]) / 10; // Normalize to [0, 1]

            const finalScore = recencyScore + relevanceScore + importanceScore;
            return { ...mem, finalScore };
          }));
    }
    else { //make it so if there is no context, no need for relevance to be included
        
        scores = await Promise.all(this.memories.map(async (mem, index) => {
        const recencyScore = this.calculateRecency(mem.timestamp);
        const importanceScore = Number(importanceScores[index]) / 10; // Normalize to [0, 1]
      
        const finalScore = recencyScore + importanceScore;
  
        return { ...mem, finalScore };
        }));

    }

    scores.sort((a, b) => b.finalScore - a.finalScore); // Sort by final score in descending order
    return scores.slice(0, limit);
  }

  calculateRecency(timestamp) {
    const hoursSince = (new Date() - timestamp) / 36e5;
    return Math.pow(0.995, hoursSince);
  }

  calculateRelevance(embedding1, embedding2) {
    return cosineSimilarity(embedding1, embedding2);
  }

  //print in console all memories
  logAllMemories() {
    console.log(`All memories for this bot:`);
    this.memories.forEach((mem, index) => {
      console.log(`Memory ${index + 1}: ${mem.memory}`);
    });
  }
}


  

async function generateReflection(bot, llm) {
    const relevantMemories = await bot.memoryStream.getRelevantMemories('', 3); // Get the 100 most recent memories
    const retrievedMemories = relevantMemories.map(mem => `Memory: ${mem.memory}, Timestamp: ${mem.timestamp}`);
  
    const prompt = `Based on these memories: ${retrievedMemories}, what is the most salient, high-level reflections for ${bot.username}? Do not preface your answers just start with your first reflection. Number your answer from 1-3. Keep each reflection less than 50 characters. For example: 1. (insert reflection here).`;
  
    try {
      const response = await llm.generate({
        model: 'llama3',
        prompt: prompt,
        max_tokens: 30,
        stop: ["\n"]
      });
  
      if (response && response.response) {
        const reflections = response.response.trim().split('\n').map(reflection => reflection.trim());
        console.log(`Generated reflections for ${bot.username}:`, reflections);
        reflections.forEach(reflection => bot.memoryStream.addMemory(`Reflection: ${reflection}`));
      }
    } catch (err) {
      console.error("Failed to generate reflection:", err);
    }
  }

  module.exports = { MemoryStream, generateReflection };
  