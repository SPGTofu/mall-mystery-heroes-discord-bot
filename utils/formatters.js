/**
 * Message formatting helpers
 * Utilities for formatting messages, embeds, and data displays
 */

/**
 * Formats a player's status for display
 * @param {string} status - Player status (alive, dead, etc.)
 * @returns {string} Formatted status string
 */
function formatPlayerStatus(status) {
  const statusMap = {
    alive: '🟢 Alive',
    dead: '🔴 Dead',
    inactive: '⚪ Inactive',
  };
  return statusMap[status] || status;
}

/**
 * Formats points for display
 * @param {number} points - Points value
 * @returns {string} Formatted points string
 */
function formatPoints(points) {
  return `${points} point${points !== 1 ? 's' : ''}`;
}

/**
 * Formats a list of players for display
 * @param {Array} players - Array of player objects
 * @returns {string} Formatted player list
 */
function formatPlayerList(players) {
  if (!players || players.length === 0) {
    return 'No players found.';
  }
  return players.map((player, index) => {
    return `${index + 1}. ${player.name || player.id} - ${formatPoints(player.points || 0)}`;
  }).join('\n');
}

/**
 * Formats a timestamp for display
 * @param {Date|number} timestamp - Timestamp to format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString();
}

module.exports = {
  formatPlayerStatus,
  formatPoints,
  formatPlayerList,
  formatTimestamp,
};

