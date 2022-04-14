import { BigNumber, utils } from 'ethers';
import { waffle, ethers } from 'hardhat';
import { expect } from 'chai';

import { setTestEnv } from './utils/testEnv';
import { MAX_UINT_AMOUNT, SECONDSPERDAY } from './utils/constants';
import { advanceTimeTo, toTimestamp, getTimestamp } from './utils/time';
import { StakingAsset, RewardAsset, StakingPoolV2 } from '../typechain';
import TestEnv from './types/TestEnv';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.retrieveResidue', () => {
  const provider = waffle.provider;
  const [deployer, staker] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month = BigNumber.from(7);
  const day = BigNumber.from(7);
  const duration = BigNumber.from(1).mul(SECONDSPERDAY);

  const startTimestamp = toTimestamp(year, month, day, BigNumber.from(10));
  context('when the reward asset and the staking asset are different', () => {
    let testEnv: TestEnv;
    let stakingPool: StakingPoolV2;
    let stakingAsset: StakingAsset;
    let rewardAsset: RewardAsset;

    async function fixture() {
      return await setTestEnv();
    }

    after(async () => {
      await loadFixture(fixture);
    });

    beforeEach('deploy staking pool', async () => {
      testEnv = await loadFixture(fixture);
      stakingPool = testEnv.stakingPool;
      stakingAsset = testEnv.stakingAsset;
      rewardAsset = testEnv.rewardAsset;
    });

    describe('retrieveResidue', () => {
      it('should retrieve the asset as much as the reward amount', async () => {
        // The pool is initialized but has not started yet.
        await rewardAsset.connect(deployer).approve(stakingPool.address, MAX_UINT_AMOUNT);
        await rewardAsset.connect(deployer).faucet();

        // This also sends the reward asset which amounts to rewardPerSecond * duration 
        const initNewPoolTx = await stakingPool
          .connect(deployer)
          .initNewPool(rewardPerSecond, startTimestamp, duration);

        const stakeAmount = BigNumber.from(utils.parseEther('100'));

        // The staking starts
        await advanceTimeTo(await getTimestamp(initNewPoolTx), startTimestamp);

        // A staker stakes
        await stakingAsset.connect(staker).faucet();
        await stakingAsset.connect(staker).approve(stakingPool.address, MAX_UINT_AMOUNT);
        await stakingPool.connect(staker).stake(stakeAmount);
        const rewardInPool = await rewardAsset.balanceOf(stakingPool.address);

        // A deployer retrieves the residue
        const tx = await stakingPool.connect(deployer).retrieveResidue();

        await expect(tx)
          .to.emit(rewardAsset, 'Transfer')
          .withArgs(stakingPool.address, deployer.address, rewardInPool);
      })
    });
  });

  context('when the reward asset and the staking asset are the same', () => {
    // Note! the reward and the staking asset are the same.
    // In testEnv, the rewardAsset and stakingAsset of the staking pool are different.
    let asset: StakingAsset;
    let stakingPool: StakingPoolV2

    before(async () => {
      const stakingAssetFactory = await ethers.getContractFactory('StakingAsset');
      const elysiaToken = await stakingAssetFactory.deploy() as StakingAsset;
      const stakingPoolFactory = await ethers.getContractFactory(
        'StakingPoolV2',
      );

      stakingPool = await stakingPoolFactory.deploy(
        elysiaToken.address,
        elysiaToken.address,
      ) as StakingPoolV2;
      asset = elysiaToken;
    });

    describe('retrieveResidue', async () => {
      it('reverts if general account call', async () => {
        await expect(stakingPool.connect(staker).retrieveResidue()).to.be.revertedWith(
          'OnlyAdmin'
        );
      });

      it('should retrieve the asset as much as the reward amount', async () => {
        // The pool is initialized but has not started yet.
        await asset.connect(deployer).approve(stakingPool.address, MAX_UINT_AMOUNT);
        await asset.connect(deployer).faucet();

        // This also sends the reward asset which amounts to rewardPerSecond * duration 
        const initNewPoolTx = await stakingPool
          .connect(deployer)
          .initNewPool(rewardPerSecond, startTimestamp, duration);

        const stakeAmount = BigNumber.from(utils.parseEther('100'));

        // The staking starts
        await advanceTimeTo(await getTimestamp(initNewPoolTx), startTimestamp);

        // deployer stakes
        await stakingPool.connect(deployer).stake(stakeAmount);
        const poolBalance = await asset.balanceOf(stakingPool.address);

        const tx = await stakingPool.connect(deployer).retrieveResidue();
        const rewardAmount = poolBalance.sub(stakeAmount)

        await expect(tx)
          .to.emit(asset, 'Transfer')
          .withArgs(stakingPool.address, deployer.address, rewardAmount);
      });
    });
  });
});
