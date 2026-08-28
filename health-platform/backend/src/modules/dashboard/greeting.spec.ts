import { greetingKey } from './greeting';

describe('greetingKey', () => {
  it('picks morning between 05:00 and 10:59', () => {
    expect(greetingKey(5)).toBe('greeting.morning');
    expect(greetingKey(10)).toBe('greeting.morning');
  });

  it('picks day between 11:00 and 17:59', () => {
    expect(greetingKey(11)).toBe('greeting.day');
    expect(greetingKey(17)).toBe('greeting.day');
  });

  it('picks evening otherwise', () => {
    expect(greetingKey(18)).toBe('greeting.evening');
    expect(greetingKey(3)).toBe('greeting.evening');
  });
});
