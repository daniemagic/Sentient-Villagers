function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
function generateRandomPosition(bot, range) {
    const x = bot.entity.position.x + (Math.random() * 2 - 1) * range;
    const z = bot.entity.position.z + (Math.random() * 2 - 1) * range;
    const y = bot.entity.position.y;
    return { x, y, z };
  }

  module.exports = { cosineSimilarity, generateRandomPosition };
  