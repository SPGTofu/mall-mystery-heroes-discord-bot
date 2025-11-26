/**
 * Game constants
 * Centralized constants for roles, statuses, and game configuration
 */

// Player statuses
const PLAYER_STATUS = {
  ALIVE: 'alive',
  DEAD: 'dead',
  INACTIVE: 'inactive',
};

// Game states
const GAME_STATE = {
  PRE_GAME: 'pre-game',
  ACTIVE: 'active',
  ENDED: 'ended',
};

// Task types
const TASK_TYPE = {
  STANDARD: 'standard',
  PHOTO: 'photo',
  SPECIAL: 'special',
};

// Role names (Discord roles)
const ROLES = {
  GAME_MASTER: 'Game Master',
  PLAYER: 'Player',
  ALIVE: 'Alive',
  DEAD: 'Dead',
};

// Channel names (Discord channels)
const CHANNELS = {
  GENERAL: 'general',
  GAME_MASTERS: 'game-masters',
  DMS: 'dms',
};

// Target assignment limits
const MAX_TARGETS = {
  SMALL: 1,   // ≤5 players
  MEDIUM: 2,  // 6-15 players
  LARGE: 3,   // 15+ players
};

// Point calculation constants
const POINT_CONFIG = {
  KILL_TRANSFER_RATE: 0.5, // 50% of victim's points transferred
  MIN_POINTS: 0,
};

module.exports = {
  PLAYER_STATUS,
  GAME_STATE,
  TASK_TYPE,
  ROLES,
  CHANNELS,
  MAX_TARGETS,
  POINT_CONFIG,
};

