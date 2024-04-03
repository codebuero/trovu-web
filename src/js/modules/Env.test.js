import Env from './Env.js';

let env;
let language = ''
global.navigator = {
  language
};

describe('Env', () => {
  beforeEach(() => {
    env = new Env();
  });
  describe('getDefaultLanguageAndCountry', () => {
    test('browser returns language and country', () => { 
      language = 'en-DE';
      expect(env.getDefaultLanguageAndCountry()).resolves.toEqual({
        language: 'en',
        country: 'de'
      });
    });
    test('browser returns only language', () => {
      language = 'en';
      expect(env.getDefaultLanguageAndCountry()).resolves.toEqual({
        language: 'en',
        country: 'de'
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
