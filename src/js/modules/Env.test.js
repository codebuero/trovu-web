import Env from './Env.js';

describe('Env', () => {
  describe('getDefaultLanguageAndCountry', () => {
    test('browser returns language and country', () => {
      const env = new Env();
      env.getNavigatorLanguage = jest.fn(() => 'en-DE');
      expect(env.getDefaultLanguageAndCountry()).resolves.toEqual({
        language: 'en',
        country: 'de'
      });
    });
    test('browser returns only language', () => {
      const env = new Env();
      env.getNavigatorLanguage = jest.fn(() => 'en');
      expect(env.getDefaultLanguageAndCountry()).resolves.toEqual({
        language: 'en',
        country: 'us'
      });
    });
  });
  describe('getUrlParams', () => {
    Env.getUrlHash = jest.fn().mockReturnValue('foo=bar&baz=boo');
    expect(Env.getUrlParams()).toEqual({ foo: 'bar', baz: 'boo' });
  });
});
