const {
  randomizeArray,
  calculateMaxTargets,
  generateTargets,
} = require('../../services/game/targetAssignment');

const GAME_RULES = require('../../config/gameRules');

describe('randomizeArray', () => {
  it('returns an array of the same length', () => {
    const input = [1, 2, 3, 4, 5];
    expect(randomizeArray(input)).toHaveLength(input.length);
  });

  it('contains the same elements as the input', () => {
    const input = ['a', 'b', 'c', 'd'];
    expect(randomizeArray(input).sort()).toEqual([...input].sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3];
    const copy = [...input];
    randomizeArray(input);
    expect(input).toEqual(copy);
  });

  it('handles an empty array', () => {
    expect(randomizeArray([])).toEqual([]);
  });

  it('handles a single element', () => {
    expect(randomizeArray(['x'])).toEqual(['x']);
  });
});

describe('calculateMaxTargets', () => {
  it('returns SMALL for 1 player', () => {
    expect(calculateMaxTargets(1)).toBe(GAME_RULES.MAX_TARGETS.SMALL);
  });

  it('returns SMALL for exactly 5 players', () => {
    expect(calculateMaxTargets(5)).toBe(GAME_RULES.MAX_TARGETS.SMALL);
  });

  it('returns MEDIUM for 6 players', () => {
    expect(calculateMaxTargets(6)).toBe(GAME_RULES.MAX_TARGETS.MEDIUM);
  });

  it('returns MEDIUM for exactly 15 players', () => {
    expect(calculateMaxTargets(15)).toBe(GAME_RULES.MAX_TARGETS.MEDIUM);
  });

  it('returns LARGE for 16 players', () => {
    expect(calculateMaxTargets(16)).toBe(GAME_RULES.MAX_TARGETS.LARGE);
  });

  it('returns LARGE for 100 players', () => {
    expect(calculateMaxTargets(100)).toBe(GAME_RULES.MAX_TARGETS.LARGE);
  });
});

describe('generateTargets', () => {
  const makeIds = (n) => Array.from({ length: n }, (_, i) => `player${i}`);

  it('returns a targetMap and playerData', () => {
    const result = generateTargets(makeIds(4));
    expect(result).toHaveProperty('targetMap');
    expect(result).toHaveProperty('playerData');
  });

  it('assigns targets to every player', () => {
    const ids = makeIds(6);
    const { targetMap } = generateTargets(ids);
    for (const id of ids) {
      expect(targetMap.has(id)).toBe(true);
    }
  });

  it('no player targets themselves', () => {
    const ids = makeIds(8);
    const { targetMap } = generateTargets(ids);
    for (const [playerId, targets] of targetMap) {
      expect(targets).not.toContain(playerId);
    }
  });

  it('no player appears twice in their own target list', () => {
    const ids = makeIds(8);
    const { targetMap } = generateTargets(ids);
    for (const targets of targetMap.values()) {
      expect(new Set(targets).size).toBe(targets.length);
    }
  });

  it('each player receives the correct number of targets for small games (≤5)', () => {
    const ids = makeIds(5);
    const { targetMap } = generateTargets(ids);
    const expected = GAME_RULES.MAX_TARGETS.SMALL;
    for (const targets of targetMap.values()) {
      expect(targets.length).toBeLessThanOrEqual(expected);
    }
  });

  it('each player receives the correct number of targets for medium games (6-15)', () => {
    const ids = makeIds(10);
    const { targetMap } = generateTargets(ids);
    const expected = GAME_RULES.MAX_TARGETS.MEDIUM;
    for (const targets of targetMap.values()) {
      expect(targets.length).toBeLessThanOrEqual(expected);
    }
  });

  it('no player has more assassins than MAX_TARGETS', () => {
    const ids = makeIds(10);
    const { playerData } = generateTargets(ids);
    const max = calculateMaxTargets(ids.length);
    for (const data of Object.values(playerData)) {
      expect(data.numOfAssassins).toBeLessThanOrEqual(max);
    }
  });

  it('target relationships are symmetric (if A targets B, B is in assassins list)', () => {
    const ids = makeIds(8);
    const { targetMap, playerData } = generateTargets(ids);
    for (const [playerId, targets] of targetMap) {
      for (const targetId of targets) {
        expect(playerData[targetId].assassins).toContain(playerId);
      }
    }
  });

  it('handles minimum player count (3 players)', () => {
    const ids = makeIds(3);
    const { targetMap } = generateTargets(ids);
    expect(targetMap.size).toBe(3);
  });

  it('handles large player count (20 players)', () => {
    const ids = makeIds(20);
    const { targetMap } = generateTargets(ids);
    expect(targetMap.size).toBe(20);
    for (const [playerId, targets] of targetMap) {
      expect(targets).not.toContain(playerId);
    }
  });
});
