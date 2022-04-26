import { BigNumber, utils } from 'ethers';
import { waffle, ethers } from 'hardhat';
import { expect } from 'chai';

import { MAX_UINT_AMOUNT, SECONDSPERDAY } from './utils/constants';
import { advanceTimeTo, resetTimestampTo, toTimestamp } from './utils/time';
import { setERC20Metadata } from './utils/testEnv';
import { StakingAsset, StakingPoolV2 } from '../typechain';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.retrieveResidue', () => {
  const provider = waffle.provider;
  const [deployer, staker] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const duration = BigNumber.from(1).mul(SECONDSPERDAY);

  const startTimestamp = toTimestamp("2022.07.07 10:00:00Z")

  // TODO: Test when the reward != staking asset

  context('when the reward asset and the staking asset are the same', () => {
    // Note! the reward and the staking asset are the same.
    // In testEnv, the rewardAsset and stakingAsset of the staking pool are different.
    let asset: StakingAsset;
    let stakingPool: StakingPoolV2

    before(async () => {
      const erc20MetadataLibrary = await setERC20Metadata();
      const stakingAssetFactory = await ethers.getContractFactory('StakingAsset');
      const elysiaToken = await stakingAssetFactory.deploy('Elysia', 'EL') as StakingAsset;
      const stakingPoolFactory = await ethers.getContractFactory(
        'StakingPoolV2',
        {
          libraries: {
            ERC20Metadata: erc20MetadataLibrary.address
          }
        }
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
          'Ownable: caller is not the owner'
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
        await resetTimestampTo(startTimestamp);

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
