import { BigNumber, utils } from 'ethers';
import { waffle, ethers } from 'hardhat';
import { expect } from 'chai';

import { MAX_UINT_AMOUNT, SECONDSPERDAY } from './utils/constants';
import { advanceTimeTo, toTimestamp } from './utils/time';
import { StakingAsset, StakingPoolV2 } from '../typechain';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.retrieveResidue', () => {
  // Note! the reward and the staking asset are the same.
  // In testEnv, the rewardAsset and stakingAsset of the staking pool are different.
  let asset: StakingAsset;
  let stakingPool: StakingPoolV2

  const provider = waffle.provider;
  const [deployer, depositor] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month = BigNumber.from(7);
  const day = BigNumber.from(7);
  const duration = BigNumber.from(1).mul(SECONDSPERDAY);

  const startTimestamp = toTimestamp(year, month, day, BigNumber.from(10));
  // const endTimestamp = startTimestamp.add(duration);

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
      await expect(stakingPool.connect(depositor).retrieveResidue()).to.be.revertedWith(
        'OnlyAdmin'
      );
    });

    it('should retrieve the asset as much as the reward amount', async () => {
      // The pool is initialized but has not started yet.
      await asset.connect(deployer).approve(stakingPool.address, MAX_UINT_AMOUNT);
      await asset.connect(deployer).faucet();

      // This also sends the reward asset which amounts to rewardPerSecond * duration 
      await stakingPool
        .connect(deployer)
        .initNewPool(rewardPerSecond, startTimestamp, duration);

      const stakeAmount = BigNumber.from(utils.parseEther('100'));

      // The staking starts
      await advanceTimeTo(startTimestamp);

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