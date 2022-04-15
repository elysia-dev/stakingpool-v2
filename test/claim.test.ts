import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTime, advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterClaim, updatePoolData, expectDataAfterStake } from './utils/expect';
import { createTestActions, getPoolData, getUserData, TestHelperActions } from './utils/helpers';
import TestEnv from './types/TestEnv';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.claim', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, alice, bob] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const month_2 = BigNumber.from(7);
  const day_2 = BigNumber.from(8);

  const month_3 = BigNumber.from(8);
  const day_3 = BigNumber.from(20);

  const firstRoundStartTimestamp = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const secondRoundStartTimestamp = toTimestamp(year, month_2, day_2, BigNumber.from(10));
  const thirdRoundStartTimestamp = toTimestamp(year, month_3, day_3, BigNumber.from(10));
  const newRewardPersecond = BigNumber.from(utils.parseEther('2'));

  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
    await actions.faucetAndApproveReward(deployer, RAY);
    await actions.faucetAndApproveTarget(alice, RAY);
  });

  it('reverts if the pool has not initiated', async () => {
    await expect(
      testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'))
    ).to.be.revertedWith('StakingNotInitiated');
  });

  context('first claim', async () => {
    beforeEach('deploy staking pool and init the pool', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          firstRoundStartTimestamp,
          duration
        );
      await advanceTimeTo(firstRoundStartTimestamp);
    });

    it('reverts if user reward is 0', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim()).to.be.revertedWith(
        'ZeroReward'
      );
    });

    context('user stakes ', async () => {
      beforeEach('user stakes', async () => {
        await testEnv.stakingPool.connect(alice).stake(amount);
      });

      it('success', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const claimTx = await testEnv.stakingPool.connect(alice).claim();

        const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(claimTx)
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });
  });


  context('when a new pool starts and Alice stakes', async () => {
    beforeEach('init the pool', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          firstRoundStartTimestamp,
          duration
        );
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(firstRoundStartTimestamp);
      await testEnv.stakingPool.connect(alice).stake(amount);
    });

    context('the pool is closed', async () => {
      it('alice claim reward', async () => {
        const tx = await testEnv.stakingPool.connect(deployer).closePool();
        await advanceTimeTo(secondRoundStartTimestamp);

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        const claimTx = await testEnv.stakingPool.connect(alice).claim();

        const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(claimTx)
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('alice claim reward after time passes', async () => {
        await testEnv.stakingPool.connect(deployer).closePool();
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const claimTx = await testEnv.stakingPool.connect(alice).claim();
        await advanceTimeTo(thirdRoundStartTimestamp);

        const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(claimTx)
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('the reward does not increase as time passes', async () => {
        await testEnv.stakingPool.connect(deployer).closePool();
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        await advanceTime(10);

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.eql(poolDataBefore);
        expect(userDataAfter).to.eql(userDataBefore);
      });
    });
  });

  context('rewardPerSecond is changed', async () => {
    beforeEach('init the pool and stake in pool', async () => {
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, firstRoundStartTimestamp, duration);

      await testEnv.stakingAsset.connect(alice).faucet();
      const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(firstRoundStartTimestamp);
      await testEnv.stakingPool.connect(alice).stake(amount);

      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).transfer(testEnv.stakingPool.address, ethers.utils.parseEther('100'));
    });

    it('rewardPerSecond is changed and claim', async () => {
      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const tx = await testEnv.stakingPool.connect(deployer).extendPool(newRewardPersecond, duration);

      const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(tx),
        duration,
        newRewardPersecond
      );

      const claimTx = await testEnv.stakingPool.connect(alice).claim();
      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterClaim(
        expectedPoolData_1,
        expectedUserData_1,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_2);
      expect(userDataAfter).to.be.equalUserData(expectedUserData_2);
    });

    it('rewardPerSecond is changed and stake and claim', async () => {
      const poolDataBeforeStake = await getPoolData(testEnv);
      const userDataBeforeStake = await getUserData(testEnv, alice);
      const tx = await testEnv.stakingPool.connect(deployer).extendPool(newRewardPersecond, duration);

      // stake test
      const [expectedPoolData, expectedUserData] = updatePoolData(
        poolDataBeforeStake,
        userDataBeforeStake,
        await getTimestamp(tx),
        duration,
        newRewardPersecond
      );

      const stakeTx = await testEnv.stakingPool.connect(alice).stake(amount);
      const [expectedPoolDataStake, expectedUserDataStake] = expectDataAfterStake(
        expectedPoolData,
        expectedUserData,
        await getTimestamp(stakeTx),
        amount,
      );

      const poolDataAfterStake = await getPoolData(testEnv);
      const userDataAfterStake = await getUserData(testEnv, alice);

      expect(poolDataAfterStake).to.be.equalPoolData(expectedPoolDataStake);
      expect(userDataAfterStake).to.be.equalUserData(expectedUserDataStake);

      // claim test
      const poolDataBeforeClaim = await getPoolData(testEnv);
      const userDataBeforeClaim = await getUserData(testEnv, alice);
      const claimTx = await testEnv.stakingPool.connect(alice).claim();
      const [expectedPoolDataClaim, expectedUserDataClaim] = expectDataAfterClaim(
        poolDataBeforeClaim,
        userDataBeforeClaim,
        await getTimestamp(claimTx)
      );

      const poolDataAfterClaim = await getPoolData(testEnv);
      const userDataAfterClaim = await getUserData(testEnv, alice);

      expect(poolDataAfterClaim).to.be.equalPoolData(expectedPoolDataClaim);
      expect(userDataAfterClaim).to.be.equalUserData(expectedUserDataClaim);
    });
  });
});
