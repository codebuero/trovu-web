import Env from './Env.js';

let env;

describe('Env', () => {
  beforeEach(() => {
    env = new Env();
  });
  describe('getDefaultLanguageAndCountry', () => {
    test('browser returns language and country', () => { 
      env.getNavigatorLanguage = jest.fn(() => 'en-DE');
      expect(env.getDefaultLanguageAndCountry()).resolves.toEqual({
        language: 'en',
        country: 'de'
      });
    });
    test('browser returns only language', () => {
      env.getNavigatorLanguage = jest.fn(() => 'en');
      expect(env.getDefaultLanguageAndCountry()).resolves.toEqual({
        language: 'en',
        country: 'us'
      });
    });
  });
  describe('getUrlParams', () => {
    test('should return correctly resolved url hash', () => {
      Env.getUrlHash = jest.fn().mockReturnValue('foo=bar&baz=boo');
      expect(Env.getUrlParams()).toEqual({ foo: 'bar', baz: 'boo' });
    });
  });
});
