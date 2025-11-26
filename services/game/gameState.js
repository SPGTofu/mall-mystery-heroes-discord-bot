/**
 * Game state management
 * Handles game state transitions and validation
 */

const GAME_STATES = {
  PRE_GAME: 'pre-game',
  ACTIVE: 'active',
  ENDED: 'ended',
};

/**
 * Gets the current game state
 * @param {string} roomId - The game room ID
 * @returns {Promise<string>} Current game state
 */
async function getGameState(roomId) {
  // TODO: Implement game state retrieval from database
  throw new Error('Get game state not yet implemented');
}

/**
 * Sets the game state
 * @param {string} roomId - The game room ID
 * @param {string} state - The new game state
 * @returns {Promise<void>}
 */
async function setGameState(roomId, state) {
  // TODO: Implement game state update in database
  if (!Object.values(GAME_STATES).includes(state)) {
    throw new Error(`Invalid game state: ${state}`);
  }
  throw new Error('Set game state not yet implemented');
}

/**
 * Checks if the game is in a specific state
 * @param {string} roomId - The game room ID
 * @param {string} state - The state to check
 * @returns {Promise<boolean>}
 */
async function isGameState(roomId, state) {
  const currentState = await getGameState(roomId);
  return currentState === state;
}

module.exports = {
  GAME_STATES,
  getGameState,
  setGameState,
  isGameState,
};

