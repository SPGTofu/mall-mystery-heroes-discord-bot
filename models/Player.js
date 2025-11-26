/**
 * Player data model
 * Represents a player in the game
 */

class Player {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.points = data.points || 0;
    this.status = data.status || 'alive'; // alive, dead, inactive
    this.targets = data.targets || []; // Array of player IDs
    this.assassins = data.assassins || []; // Array of player IDs
    this.openSeason = data.openSeason || false;
    this.roomId = data.roomId || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Checks if the player is alive
   * @returns {boolean}
   */
  isAlive() {
    return this.status === 'alive';
  }

  /**
   * Checks if the player is dead
   * @returns {boolean}
   */
  isDead() {
    return this.status === 'dead';
  }

  /**
   * Converts player to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      points: this.points,
      status: this.status,
      targets: this.targets,
      assassins: this.assassins,
      openSeason: this.openSeason,
      roomId: this.roomId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Player;


