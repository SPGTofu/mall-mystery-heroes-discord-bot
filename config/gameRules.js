/**
 * Game configuration and rules
 * Centralized game rules and configuration
 */

const GAME_RULES = {
  // Target assignment rules
  MAX_TARGETS: {
    SMALL: 1,   // ≤5 players
    MEDIUM: 2,  // 6-15 players
    LARGE: 3,   // 15+ players
  },
  
  // Point system
  POINTS: {
    KILL_TRANSFER_RATE: 1.0, // 100% of victim's points transferred
    MIN_POINTS: 0,
    DEFAULT_STARTING_POINTS: 0,
  },
  
  // Task rules
  TASK: {
    DEFAULT_MAX_COMPLETERS: 1,
    DEFAULT_POINTS: 10,
  },
  
  // Game state rules
  MIN_PLAYERS_TO_START: 3,
  // MAX_PLAYERS: 100, -- NO LIMIT
};

module.exports = GAME_RULES;


