/**
 * Game data model
 * Represents a game instance
 */

class Game {
  constructor(data) {
    this.roomId = data.roomId || '';
    this.state = data.state || 'pre-game'; // pre-game, active, ended
    this.players = data.players || []; // Array of player IDs
    this.tasks = data.tasks || []; // Array of task IDs
    this.settings = data.settings || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.startedAt = data.startedAt || null;
    this.endedAt = data.endedAt || null;
  }

  /**
   * Checks if the game is active
   * @returns {boolean}
   */
  isActive() {
    return this.state === 'active';
  }

  /**
   * Checks if the game has ended
   * @returns {boolean}
   */
  hasEnded() {
    return this.state === 'ended';
  }

  /**
   * Checks if the game is in pre-game state
   * @returns {boolean}
   */
  isPreGame() {
    return this.state === 'pre-game';
  }

  /**
   * Converts game to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      roomId: this.roomId,
      state: this.state,
      players: this.players,
      tasks: this.tasks,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
    };
  }
}

module.exports = Game;


