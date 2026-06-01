const {
  isValidUserId,
  isValidRoomId,
  isValidPlayerName,
  isValidTaskName,
  isValidPoints,
} = require('../../utils/validators');

describe('isValidUserId', () => {
  it('accepts a valid 18-digit Discord ID', () => {
    expect(isValidUserId('123456789012345678')).toBe(true);
  });

  it('accepts a 17-digit ID', () => {
    expect(isValidUserId('12345678901234567')).toBe(true);
  });

  it('accepts a 19-digit ID', () => {
    expect(isValidUserId('1234567890123456789')).toBe(true);
  });

  it('rejects a 16-digit ID (too short)', () => {
    expect(isValidUserId('1234567890123456')).toBe(false);
  });

  it('rejects a 20-digit ID (too long)', () => {
    expect(isValidUserId('12345678901234567890')).toBe(false);
  });

  it('rejects an ID with non-numeric characters', () => {
    expect(isValidUserId('12345678901234567a')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUserId('')).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(isValidUserId(123456789012345678)).toBe(false);
  });
});

describe('isValidRoomId', () => {
  it('accepts a non-empty string', () => {
    expect(isValidRoomId('room-abc')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidRoomId('')).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(isValidRoomId(123)).toBe(false);
  });
});

describe('isValidPlayerName', () => {
  it('accepts a normal name', () => {
    expect(isValidPlayerName('Alice')).toBe(true);
  });

  it('accepts a single character', () => {
    expect(isValidPlayerName('A')).toBe(true);
  });

  it('accepts exactly 32 characters', () => {
    expect(isValidPlayerName('A'.repeat(32))).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidPlayerName('')).toBe(false);
  });

  it('rejects a name longer than 32 characters', () => {
    expect(isValidPlayerName('A'.repeat(33))).toBe(false);
  });

  it('rejects a non-string', () => {
    expect(isValidPlayerName(null)).toBe(false);
  });
});

describe('isValidTaskName', () => {
  it('accepts a normal task name', () => {
    expect(isValidTaskName('Find the key')).toBe(true);
  });

  it('accepts exactly 100 characters', () => {
    expect(isValidTaskName('A'.repeat(100))).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidTaskName('')).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    expect(isValidTaskName('A'.repeat(101))).toBe(false);
  });
});

describe('isValidPoints', () => {
  it('accepts 0', () => {
    expect(isValidPoints(0)).toBe(true);
  });

  it('accepts positive integers', () => {
    expect(isValidPoints(100)).toBe(true);
  });

  it('rejects negative numbers', () => {
    expect(isValidPoints(-1)).toBe(false);
  });

  it('rejects floats', () => {
    expect(isValidPoints(1.5)).toBe(false);
  });

  it('rejects strings', () => {
    expect(isValidPoints('10')).toBe(false);
  });

  it('rejects NaN', () => {
    expect(isValidPoints(NaN)).toBe(false);
  });
});
