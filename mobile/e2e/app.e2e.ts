import { element, by, expect } from 'detox';

describe('Poker Bankroll Guardian', () => {
  it('launches and shows dashboard screen', async () => {
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
  });
});
