/**
 * Role name constants
 * Centralized role name definitions
 */

const ROLES = {
  GAME_MASTER: 'Game Master',
  PLAYER: 'Player',
  ALIVE: 'Alive',
  DEAD: 'Dead',
  OPEN_SEASON: 'Open Season'
};

/**
 * Role color constants (Discord color integers)
 * Colors for visual distinction in member list
 */
const ROLE_COLORS = {
  GAME_MASTER: 0x9b59b6, // Purple
  PLAYER: 0x3498db,      // Blue
  ALIVE: 0x2ecc71,       // Green
  DEAD: 0xe74c3c,        // Red
  OPEN_SEASON: 0xf39c12, // Orange
};

module.exports = {
  ROLES,
  ROLE_COLORS,
};


