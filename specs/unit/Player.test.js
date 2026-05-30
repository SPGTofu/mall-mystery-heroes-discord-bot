const Player = require('../../models/Player');

const baseData = {
  id: 'player1',
  name: 'Alice',
  points: 100,
  status: 'alive',
  targets: ['player2'],
  assassins: ['player3'],
  roomId: 'room1',
};

describe('Player constructor', () => {
  it('sets all provided fields', () => {
    const player = new Player(baseData);
    expect(player.id).toBe('player1');
    expect(player.name).toBe('Alice');
    expect(player.points).toBe(100);
    expect(player.status).toBe('alive');
    expect(player.targets).toEqual(['player2']);
    expect(player.assassins).toEqual(['player3']);
    expect(player.roomId).toBe('room1');
  });

  it('defaults missing fields correctly', () => {
    const player = new Player({ id: 'p1' });
    expect(player.name).toBe('');
    expect(player.points).toBe(0);
    expect(player.status).toBe('alive');
    expect(player.targets).toEqual([]);
    expect(player.assassins).toEqual([]);
    expect(player.openSeason).toBe(false);
    expect(player.roomId).toBe('');
  });
});

describe('Player.isAlive', () => {
  it('returns true when status is alive', () => {
    const player = new Player({ ...baseData, status: 'alive' });
    expect(player.isAlive()).toBe(true);
  });

  it('returns false when status is dead', () => {
    const player = new Player({ ...baseData, status: 'dead' });
    expect(player.isAlive()).toBe(false);
  });
});

describe('Player.isDead', () => {
  it('returns true when status is dead', () => {
    const player = new Player({ ...baseData, status: 'dead' });
    expect(player.isDead()).toBe(true);
  });

  it('returns false when status is alive', () => {
    const player = new Player({ ...baseData, status: 'alive' });
    expect(player.isDead()).toBe(false);
  });
});

describe('Player.toObject', () => {
  it('returns a plain object with all expected keys', () => {
    const player = new Player(baseData);
    const obj = player.toObject();
    const expectedKeys = ['id', 'name', 'points', 'status', 'targets', 'assassins', 'openSeason', 'roomId', 'createdAt', 'updatedAt'];
    for (const key of expectedKeys) {
      expect(obj).toHaveProperty(key);
    }
  });

  it('round-trips data correctly', () => {
    const player = new Player(baseData);
    const obj = player.toObject();
    expect(obj.id).toBe(baseData.id);
    expect(obj.name).toBe(baseData.name);
    expect(obj.points).toBe(baseData.points);
    expect(obj.targets).toEqual(baseData.targets);
  });
});
