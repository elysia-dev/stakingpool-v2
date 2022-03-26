import { BigNumber, ContractTransaction, utils } from 'ethers';
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

  const day_ = BigNumber.from(20);


  const startTimestamp_1 = toTimestamp(year, month, day, BigNumber.from(10));
  const startTimestamp_2 = toTimestamp(year, month, day_, BigNumber.from(10));
  const endTimestamp_1 = startTimestamp_1.add(duration);
  const endTimestamp_2 = startTimestamp_2.add(duration);

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach(async () => {
    testEnv = await loadFixture(fixture);
    await testEnv.stakingAsset.connect(depositor).faucet();
    await testEnv.rewardAsset.connect(deployer).faucet();
    await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
  });

  it('staking pool deployed', async () => {
    expect(await testEnv.stakingPool.stakingAsset()).to.be.equal(testEnv.stakingAsset.address);
  });

  context('when the staking pool deployed', async () => {
    it('reverts if general account initiate the pool', async () => {
      await testEnv.rewardAsset.connect(depositor).faucet();
      await testEnv.rewardAsset.connect(depositor).approve(testEnv.stakingPool.address, RAY);
      await expect(
        testEnv.stakingPool
          .connect(depositor)
          .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address)
      ).to.be.revertedWith('OnlyAdmin');
    });

    it('success', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address);

      const poolData = await testEnv.stakingPool.getPoolData(1);

      expect(poolData.rewardPerSecond).to.be.equal(rewardPerSecond);
      expect(poolData.rewardIndex).to.be.equal(WAD);
      expect(poolData.startTimestamp).to.be.equal(startTimestamp_1);
      expect(poolData.endTimestamp).to.be.equal(endTimestamp_1);
      expect(poolData.totalPrincipal).to.be.equal(0);
      expect(poolData.lastUpdateTimestamp).to.be.equal(startTimestamp_1);
      expect(await testEnv.stakingPool.currentPoolID()).to.be.equal(1);
    });
    it('success when pool is opened at the same time', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address);

      const poolData = await testEnv.stakingPool.getPoolData(2);

      expect(poolData.rewardPerSecond).to.be.equal(rewardPerSecond);
      expect(poolData.rewardIndex).to.be.equal(WAD);
      expect(poolData.startTimestamp).to.be.equal(startTimestamp_1);
      expect(poolData.endTimestamp).to.be.equal(endTimestamp_1);
      expect(poolData.totalPrincipal).to.be.equal(0);
      expect(poolData.lastUpdateTimestamp).to.be.equal(startTimestamp_1);
      expect(await testEnv.stakingPool.currentPoolID()).to.be.equal(2);
    });

    it('success when pool is opened at the different time', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address);

      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_2, duration, testEnv.rewardAsset.address);

      const poolData = await testEnv.stakingPool.getPoolData(2);

      expect(poolData.rewardPerSecond).to.be.equal(rewardPerSecond);
      expect(poolData.rewardIndex).to.be.equal(WAD);
      expect(poolData.startTimestamp).to.be.equal(startTimestamp_2);
      expect(poolData.endTimestamp).to.be.equal(endTimestamp_2);
      expect(poolData.totalPrincipal).to.be.equal(0);
      expect(poolData.lastUpdateTimestamp).to.be.equal(startTimestamp_2);
      expect(await testEnv.stakingPool.currentPoolID()).to.be.equal(2);
    });
  });

  context('when the current pool ID is over', async () => {
    let initTx: ContractTransaction;
    const nextYear = year.add(1);
    const nextStartTimestamp = toTimestamp(nextYear, month, day, BigNumber.from(10));
    const nextEndTimestamp = nextStartTimestamp.add(duration);

    beforeEach('init the first pool and time passes', async () => {
      initTx = await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address);
      await advanceTimeTo(await getTimestamp(initTx), endTimestamp_1);
    });

    it('init the next pool, success', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, nextStartTimestamp, duration, testEnv.rewardAsset.address);

      const poolData = await testEnv.stakingPool.getPoolData(2);
      expect(poolData.rewardPerSecond).to.be.equal(rewardPerSecond);
      expect(poolData.rewardIndex).to.be.equal(WAD);
      expect(poolData.startTimestamp).to.be.equal(nextStartTimestamp);
      expect(poolData.endTimestamp).to.be.equal(nextEndTimestamp);
      expect(poolData.totalPrincipal).to.be.equal(0);
      expect(poolData.lastUpdateTimestamp).to.be.equal(nextStartTimestamp);
      expect(await testEnv.stakingPool.currentPoolID()).to.be.equal(2);
    });

    it('not initiated pool data should be 0', async () => {
      const poolData = await testEnv.stakingPool.getPoolData(3);
      expect(poolData.rewardPerSecond).to.be.equal(0);
      expect(poolData.rewardIndex).to.be.equal(0);
      expect(poolData.startTimestamp).to.be.equal(0);
      expect(poolData.endTimestamp).to.be.equal(0);
      expect(poolData.totalPrincipal).to.be.equal(0);
      expect(poolData.lastUpdateTimestamp).to.be.equal(0);
    });
  });

  context('retrieveResidue', async () => {
    beforeEach('set', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp_1, duration, testEnv.rewardAsset.address);
    });

    it('reverts if general account call', async () => {
      await expect(testEnv.stakingPool.connect(depositor).retrieveResidue(1)).to.be.revertedWith(
        'OnlyAdmin'
      );
    });

    it('success', async () => {
      const tx = await testEnv.stakingPool.connect(deployer).retrieveResidue(1);
      expect(tx)
        .to.emit(testEnv.rewardAsset, 'Transfer')
        .withArgs(testEnv.stakingPool.address, deployer.address, RAY);
    });
  });
});
