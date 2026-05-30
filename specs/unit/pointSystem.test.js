const {
  calculateKillPoints,
  calculateTaskPoints,
} = require('../../services/game/pointSystem');

describe('calculateKillPoints', () => {
  it('returns all of the victim points', () => {
    expect(calculateKillPoints(100, 80)).toBe(80);
  });

  it('returns 0 when victim has 0 points', () => {
    expect(calculateKillPoints(50, 0)).toBe(0);
  });

  it('killer points do not affect the result', () => {
    expect(calculateKillPoints(0, 100)).toBe(calculateKillPoints(999, 100));
  });
});

describe('calculateTaskPoints', () => {
  it('returns the task points value', () => {
    const task = { points: 25 };
    expect(calculateTaskPoints(task, 1)).toBe(25);
  });

  it('returns 0 when task has no points field', () => {
    const task = {};
    expect(calculateTaskPoints(task, 1)).toBe(0);
  });

  it('returns 0 when task points is 0', () => {
    const task = { points: 0 };
    expect(calculateTaskPoints(task, 1)).toBe(0);
  });
});
