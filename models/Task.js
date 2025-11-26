/**
 * Task data model
 * Represents a task in the game
 */

class Task {
  constructor(data) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.type = data.type || 'standard'; // standard, photo, etc.
    this.maxCompleters = data.maxCompleters || 1;
    this.points = data.points || 0;
    this.completers = data.completers || []; // Array of player IDs
    this.isComplete = data.isComplete || false;
    this.roomId = data.roomId || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Checks if the task is complete
   * @returns {boolean}
   */
  isCompleted() {
    return this.isComplete;
  }

  /**
   * Checks if the task can accept more completers
   * @returns {boolean}
   */
  canAcceptCompleters() {
    return this.completers.length < this.maxCompleters;
  }

  /**
   * Checks if a player has completed this task
   * @param {string} playerId - The player ID to check
   * @returns {boolean}
   */
  hasCompleter(playerId) {
    return this.completers.includes(playerId);
  }

  /**
   * Converts task to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      maxCompleters: this.maxCompleters,
      points: this.points,
      completers: this.completers,
      isComplete: this.isComplete,
      roomId: this.roomId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Task;


