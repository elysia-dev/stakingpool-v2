import { expect } from 'chai';
import { waffle } from 'hardhat';
import { TestEnv } from './../types/TestEnv';
import { setTestEnv } from './testEnv';
import { getTimestamp } from './time';

const { loadFixture } = waffle;

describe('time utils', () => {
  let testEnv: TestEnv;

  async function fixture() {
    return await setTestEnv();
  }

  beforeEach(async () => {
    testEnv = await loadFixture(fixture);
  });

  describe('getTimestamp', () => {
    it('should return the block which includes the tx', async () => {
      const tx1 = await testEnv.rewardAsset.faucet();
      const tx2 = await testEnv.rewardAsset.faucet();
      expect(await getTimestamp(tx1)).not.equal(await getTimestamp(tx2));
    });
  });
});
