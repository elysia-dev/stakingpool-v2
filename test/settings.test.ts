import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';

import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY, WAD } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.settings', () => {
  let testEnv: TestEnv;

  const provider = waffle.provider;
  const [deployer, depositor] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month = BigNumber.from(7);
  const day = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const startTimestamp = toTimestamp(year, month, day, BigNumber.from(10));
  const endTimestamp = startTimestamp.add(duration);

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach(async () => {
    testEnv = await loadFixture(fixture);
    await testEnv.stakingAsset.connect(depositor).faucet();
  });

  it('staking pool deployed', async () => {
    expect(await testEnv.stakingPool.stakingAsset()).to.be.equal(testEnv.stakingAsset.address);
    expect(await testEnv.stakingPool.rewardAsset()).to.be.equal(testEnv.rewardAsset.address);
  });

  context('when the staking pool deployed', async () => {
    it('reverts if general account initiate the pool', async () => {
      await testEnv.rewardAsset.connect(depositor).faucet();
      await testEnv.rewardAsset.connect(depositor).approve(testEnv.stakingPool.address, RAY);
      await expect(
        testEnv.stakingPool
          .connect(depositor)
          .initNewPool(rewardPerSecond, startTimestamp, duration)
      ).to.be.revertedWith('OnlyAdmin');
    });

    it('success', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp, duration);

      const poolData = await testEnv.stakingPool.getPoolData();

      expect(poolData.rewardPerSecond).to.be.equal(rewardPerSecond);
      expect(poolData.rewardIndex).to.be.equal(WAD);
      expect(poolData.startTimestamp).to.be.equal(startTimestamp);
      expect(poolData.endTimestamp).to.be.equal(endTimestamp);
      expect(poolData.totalPrincipal).to.be.equal(0);
    });
     
  });

  context('reset the pool', async () => {
    it('revert if a person not admin try reset the pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp, duration);
  
      await expect(
        testEnv.stakingPool.connect(depositor).extendPool(BigNumber.from(utils.parseEther('1')), BigNumber.from(30).mul(SECONDSPERDAY))
      ).to.be.revertedWith('OnlyAdmin');
    });
  });

  context('in case of emergency', async () => {
    beforeEach('init the pool and alice stakes', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPerSecond,
          startTimestamp,
          duration
        );
      await testEnv.stakingAsset.connect(depositor).faucet();
      const tx = await testEnv.stakingAsset.connect(depositor).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
      await testEnv.stakingPool.connect(depositor).stake(ethers.utils.parseEther('1'));
    });

    it('revert if a person not admin set emergency', async () => {
      await expect(
        testEnv.stakingPool.connect(depositor).setEmergency(true)
      ).to.be.revertedWith('OnlyAdmin');
    });
  });

});

