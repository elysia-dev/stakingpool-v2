import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterMigrate } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.migrate', () => {
  let testEnv: TestEnv;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);
  
  const month_2 = BigNumber.from(9);
  const day_2 = BigNumber.from(7);

  const firstRoundStartTimestamp = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const secondRoundStartTimestamp = toTimestamp(year, month_2, day_2,BigNumber.from(10));

  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool and init the pool', async () => {
    await testEnv.rewardAsset.connect(deployer).faucet();
    await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(
        rewardPersecond,
        firstRoundStartTimestamp,
        duration
      );
    await testEnv.stakingAsset.connect(alice).faucet();
    const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
  });

  //TODO migrate test
});
