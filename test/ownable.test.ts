import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { setTestEnv } from './utils/testEnv';
import { StakingPoolV2 } from '../typechain';

const { loadFixture } = waffle;

describe('StakingPoolV2', async () => {
  let testEnv: TestEnv;
  let contract: StakingPoolV2;
  const provider = waffle.provider;
  const [_, user] = provider.getWallets();

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach(async () => {
    testEnv = await loadFixture(fixture);
    contract = testEnv.stakingPool;
  });

  context('Ownable', async () => {
    it('supports transferOwnership', async () => {
      await contract.transferOwnership(user.address);
      expect(await contract.owner()).to.equal(user.address)
    });
  });
});
