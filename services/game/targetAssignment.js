/**
 * Target assignment service
 * Contains the target assignment algorithm based on TargetGenerator.js
 * Can be called from commands or database services
 */

const GAME_RULES = require('../../config/gameRules');

/**
 * Randomizes the order of an array
 * @param {Array} array - Array to randomize
 * @returns {Array} Randomized array
 */
function randomizeArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculates the maximum number of targets based on player count
 * @param {number} playerCount - Number of players
 * @returns {number} Maximum targets per player
 */
function calculateMaxTargets(playerCount) {
  if (playerCount <= 5) {
    return GAME_RULES.MAX_TARGETS.SMALL;
  } else if (playerCount <= 15) {
    return GAME_RULES.MAX_TARGETS.MEDIUM;
  } else {
    return GAME_RULES.MAX_TARGETS.LARGE;
  }
}

/**
 * Generates target assignments for all players
 * Based on TargetGenerator.js from the frontend
 * @param {Array<string>} playerIds - Array of player IDs
 * @returns {Object} Object containing targetMap and playerData
 *   - targetMap: Map of playerId -> array of target IDs
 *   - playerData: Object with player tracking data (assassins, etc.)
 */
function generateTargets(playerIds) {
  const playerList = randomizeArray([...playerIds]);
  const MAX_TARGETS = calculateMaxTargets(playerIds.length);
  
  // Initialize player data tracking (matching TargetGenerator.js structure)
  const newTargetMap = new Map();
  const newPlayerData = {};
  
  // Initialize player data structure
  // lastTargetIndex is set to the player's index in the randomized list
  for (let i = 0; i < playerIds.length; i++) {
    const playerId = playerIds[i];
    const data = {
      numOfAssassins: 0,
      lastTargetIndex: playerList.indexOf(playerId),
      prevTargets: [],
      assassins: []
    };
    newPlayerData[playerId] = data;
  }
  
  // Loop through every player to assign targets (matching TargetGenerator.js)
  for (let playerDex = 0; playerDex < playerIds.length; playerDex++) {
    const currPlayer = playerList[playerDex];
    newTargetMap.set(currPlayer, []);
    
    // Assign MAX_TARGETS targets to each player
    for (let targetCount = 0; targetCount < MAX_TARGETS; targetCount++) {
      let targetIndex = (newPlayerData[currPlayer].lastTargetIndex + 1) % playerIds.length;
      let target = playerList[targetIndex];
      const originalDex = targetIndex;      

      // Skip player if they already have MAX_TARGETS assassins,
      // if they are targeting themselves, or if there's a circular dependency
      // (matching TargetGenerator.js condition exactly)
      while (
        newPlayerData[target].numOfAssassins === MAX_TARGETS ||
        target === currPlayer ||
        newPlayerData[currPlayer].assassins.includes(target)
      ) {
        targetIndex = (targetIndex + 1) % playerIds.length;
        target = playerList[targetIndex];
        
        // Stop if we've looped through the entire array
        if (targetIndex === originalDex) {
          break;
        }
      }
      
      // Only assign if we found a valid target (matching TargetGenerator.js)
      if (
        newPlayerData[target].numOfAssassins !== MAX_TARGETS &&
        target !== currPlayer &&
        !newPlayerData[currPlayer].assassins.includes(target)
      ) {
        // Assign target to currPlayer
        newTargetMap.get(currPlayer).push(target);
        
        // Update player data (matching TargetGenerator.js)
        newPlayerData[currPlayer].lastTargetIndex = targetIndex;
        newPlayerData[currPlayer].prevTargets.push(target);
        newPlayerData[target].numOfAssassins += 1;
        newPlayerData[target].assassins.push(currPlayer);
      }
    }
  }
  
  return {
    targetMap: newTargetMap,
    playerData: newPlayerData
  };
}

module.exports = {
  randomizeArray,
  calculateMaxTargets,
  generateTargets,
};
