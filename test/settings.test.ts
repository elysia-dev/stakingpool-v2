import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { waffle } from 'hardhat';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { createTestActions, TestHelperActions } from './utils/helpers';
import { setTestEnv } from './utils/testEnv';
import { resetTimestampTo, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.settings', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, depositor] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const duration = 30 * SECONDSPERDAY;

  const startTimestamp = toTimestamp('2022.07.07 10:00:00Z');
  const endTimestamp = startTimestamp + duration;

  async function fixture() {
    return await setTestEnv();
  }

  beforeEach(async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
    await actions.faucetAndApproveTarget(depositor);
  });

  it('staking pool deployed', async () => {
    expect(await testEnv.stakingPool.stakingAsset()).to.be.equal(testEnv.stakingAsset.address);
    expect(await testEnv.stakingPool.rewardAsset()).to.be.equal(testEnv.rewardAsset.address);
  });

  describe('.initNewPoolAndTransfer', () => {
    context('when the staking pool is deployed', async () => {
      it('reverts if general account initiates the pool', async () => {
        await testEnv.rewardAsset.connect(depositor).faucet();
        await testEnv.rewardAsset.connect(depositor).approve(testEnv.stakingPool.address, RAY);
        await expect(
          testEnv.stakingPool
            .connect(depositor)
            .initNewPool(rewardPerSecond, startTimestamp, duration)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('succeeds if an owner initates the pool', async () => {
        await testEnv.rewardAsset.connect(deployer).faucet();
        await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
        await testEnv.stakingPool
          .connect(deployer)
          .initNewPool(rewardPerSecond, startTimestamp, duration);

        const poolData = await testEnv.stakingPool.getPoolData();

        expect(poolData.rewardPerSecond).to.be.equal(rewardPerSecond);
        expect(poolData.rewardIndex).to.be.equal(BigNumber.from('0'));
        expect(poolData.startTimestamp).to.be.equal(startTimestamp);
        expect(poolData.endTimestamp).to.be.equal(endTimestamp);
        expect(poolData.totalPrincipal).to.be.equal(0);
      });
    });
  });

  describe('isManager', async () => {
    it('always returns true for the owner', async () => {
      expect(await testEnv.stakingPool.isManager(deployer.address)).to.equal(true);
    });
  });

  describe('.revokeManager', async () => {
    it('is onlyOwner', async () => {
      await expect(
        testEnv.stakingPool.connect(depositor).revokeManager(depositor.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('.setManager', async () => {
    it('is onlyOwner', async () => {
      await expect(
        testEnv.stakingPool.connect(depositor).setManager(depositor.address)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('.extendPool', async () => {
    beforeEach('init a new pool and jump to the start timestamp', async () => {
      await actions.faucetAndApproveReward(deployer);
      await actions.initNewPoolAndTransfer(deployer, rewardPerSecond, startTimestamp, duration);
      await resetTimestampTo(startTimestamp);
    });

    it('reverts if the message sender is not a manager', async () => {
      await expect(
        testEnv.stakingPool
          .connect(depositor)
          .extendPool(BigNumber.from(utils.parseEther('2')), BigNumber.from(30).mul(SECONDSPERDAY))
      ).to.be.revertedWith('OnlyManager()');
    });

    it('succeeds when he/she becomes a manager', async () => {
      await expect(testEnv.stakingPool.connect(deployer).setManager(depositor.address)).to.emit(
        testEnv.stakingPool,
        'SetManager'
      );
      await expect(
        testEnv.stakingPool.connect(depositor).extendPool(rewardPerSecond, duration)
      ).to.emit(testEnv.stakingPool, 'ExtendPool');
    });
  });
});
