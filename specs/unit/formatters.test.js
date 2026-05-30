const {
  formatPlayerStatus,
  formatPoints,
  formatPlayerList,
} = require('../../utils/formatters');

describe('formatPlayerStatus', () => {
  it('formats alive status', () => {
    expect(formatPlayerStatus('alive')).toBe('🟢 Alive');
  });

  it('formats dead status', () => {
    expect(formatPlayerStatus('dead')).toBe('🔴 Dead');
  });

  it('formats inactive status', () => {
    expect(formatPlayerStatus('inactive')).toBe('⚪ Inactive');
  });

  it('returns the raw value for unknown statuses', () => {
    expect(formatPlayerStatus('unknown')).toBe('unknown');
  });
});

describe('formatPoints', () => {
  it('uses singular for 1 point', () => {
    expect(formatPoints(1)).toBe('1 point');
  });

  it('uses plural for 0 points', () => {
    expect(formatPoints(0)).toBe('0 points');
  });

  it('uses plural for values greater than 1', () => {
    expect(formatPoints(10)).toBe('10 points');
  });
});

describe('formatPlayerList', () => {
  it('returns a message for an empty array', () => {
    expect(formatPlayerList([])).toBe('No players found.');
  });

  it('returns a message for null input', () => {
    expect(formatPlayerList(null)).toBe('No players found.');
  });

  it('formats a single player by name and points', () => {
    const players = [{ name: 'Alice', points: 50 }];
    expect(formatPlayerList(players)).toBe('1. Alice - 50 points');
  });

  it('formats multiple players with correct numbering', () => {
    const players = [
      { name: 'Alice', points: 50 },
      { name: 'Bob', points: 1 },
    ];
    const result = formatPlayerList(players);
    expect(result).toContain('1. Alice - 50 points');
    expect(result).toContain('2. Bob - 1 point');
  });

  it('falls back to player id when name is missing', () => {
    const players = [{ id: 'player123', points: 0 }];
    expect(formatPlayerList(players)).toContain('player123');
  });
});
