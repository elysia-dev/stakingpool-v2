import { BigNumber, ethers, utils } from 'ethers';
import hre, { waffle } from 'hardhat';
import { expect } from 'chai';
import { setTestNextVersionEnv } from './utils/testNextVersionEnv';
import TestEnv from './types/TestEnv';
import TestNextVersionEnv from './types/TestNextVersionEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterMigrate } from './utils/expect';
import { getPoolData, getUserData, getPoolData_, getUserData_ } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.migrate', () => {
  let testEnv: TestEnv;
  let testNextVersionEnv: TestNextVersionEnv;

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

  async function fixture_1() {
    return await setTestEnv();
  }

  async function fixture_2(){
    return await setTestNextVersionEnv();
  }

  after(async () => {
    await loadFixture(fixture_1);
    await loadFixture(fixture_2);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture_1);
    testNextVersionEnv = await loadFixture(fixture_2);
  });

  context('alice migrates asset to next version staking pool', async () => {
    beforeEach('init the pool and alice stakes', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testNextVersionEnv.rewardAsset.connect(deployer).faucet();
      await testNextVersionEnv.rewardAsset.connect(deployer).approve(testNextVersionEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          firstRoundStartTimestamp,
          duration
        );
      await testNextVersionEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          firstRoundStartTimestamp,
          duration
        );
      await testEnv.stakingAsset.connect(alice).faucet();
      const tx_1 = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx_1), firstRoundStartTimestamp);
      const tx_2 = await testNextVersionEnv.stakingAsset.connect(alice).approve(testNextVersionEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx_2), secondRoundStartTimestamp);
      await testEnv.stakingPool.connect(alice).stake(amount);
    });

    it('revert if a pertson not admin set next contract address', async () => {
      await expect(testEnv.stakingPool.connect(alice).setNextContractAddr(
        testNextVersionEnv.stakingPool.address)
        ).to.be.revertedWith('OnlyAdmin');
    });

    it('migrate asset to next version staking pool', async () => {
      await testEnv.stakingPool.connect(deployer).closePool();
      await testEnv.stakingPool
        .connect(deployer)
        .setNextContractAddr(testNextVersionEnv.stakingPool.address);
      const fromPoolDataBefore = await getPoolData(testEnv);
      const fromUserDataBefore = await getUserData(testEnv, alice);

      const toPoolDataBefore = await getPoolData_(testNextVersionEnv);
      const toUserDataBefore = await getUserData_(testNextVersionEnv, alice);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate();

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx)
      );

      const fromPoolDataAfter = await getPoolData(testEnv);
      const fromUserDataAfter = await getUserData(testEnv, alice);

      const toPoolDataAfter = await getPoolData_(testNextVersionEnv);
      const toUserDataAfter = await getUserData_(testNextVersionEnv, alice);


      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });
  });
});
