import { load } from './DataManager';

describe('DataManager.load', () => {
  test('should return object with specific keys', () => {
    const result = load();
    expect(result).toEqual(
      expect.objectContaining({
        shortcuts: expect.anything(),
        types: expect.objectContaining({
          city: expect.anything()
        })
      })
    );
  });
});
