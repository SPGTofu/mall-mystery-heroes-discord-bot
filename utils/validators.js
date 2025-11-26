/**
 * Input validation utilities
 * Validates user input for commands and operations
 */

/**
 * Validates a Discord user ID
 * @param {string} userId - The user ID to validate
 * @returns {boolean}
 */
function isValidUserId(userId) {
  return typeof userId === 'string' && /^\d{17,19}$/.test(userId);
}

/**
 * Validates a room/game ID
 * @param {string} roomId - The room ID to validate
 * @returns {boolean}
 */
function isValidRoomId(roomId) {
  return typeof roomId === 'string' && roomId.length > 0;
}

/**
 * Validates a player name
 * @param {string} name - The name to validate
 * @returns {boolean}
 */
function isValidPlayerName(name) {
  return typeof name === 'string' && name.length >= 1 && name.length <= 32;
}

/**
 * Validates a task name
 * @param {string} taskName - The task name to validate
 * @returns {boolean}
 */
function isValidTaskName(taskName) {
  return typeof taskName === 'string' && taskName.length >= 1 && taskName.length <= 100;
}

/**
 * Validates points value
 * @param {number} points - The points value to validate
 * @returns {boolean}
 */
function isValidPoints(points) {
  return typeof points === 'number' && points >= 0 && Number.isInteger(points);
}

module.exports = {
  isValidUserId,
  isValidRoomId,
  isValidPlayerName,
  isValidTaskName,
  isValidPoints,
};

