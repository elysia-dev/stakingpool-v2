import { BigNumber, utils, ethers } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, resetTimestampTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterStake, updatePoolData } from './utils/expect';
import { createTestActions, getPoolData, getUserData, TestHelperActions } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.stake', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const month_end = BigNumber.from(8);
  const day_end = BigNumber.from(20);

  const month_2 = BigNumber.from(8);
  const day_2 = BigNumber.from(4);

  const firstTimestamp = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const secondTimestamp = toTimestamp(year, month_2, day_2, BigNumber.from(10));
  const endTimestamp = toTimestamp(year, month_end, day_end, BigNumber.from(10));

  const stakeAmount = utils.parseEther('10');
  const newRewardPersecond = BigNumber.from(utils.parseEther('2'));

  async function fixture() {
    return await setTestEnv();
  }

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
    await actions.faucetAndApproveReward(deployer, RAY);
    await actions.faucetAndApproveTarget(alice, RAY);
    await actions.faucetAndApproveTarget(bob, RAY);
  });

  it('reverts if the pool has not initiated', async () => {
    await expect(actions.stake(alice, utils.parseEther('100')))
      .to.be.revertedWith('StakingNotInitiated');
  });

  context('when the pool initiated', async () => {
    context('and the pool has started', async () => {
      beforeEach(async () => {
        await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
        await resetTimestampTo(firstTimestamp);
      });

      it('reverts if user staking amount is 0', async () => {
        await expect(actions.stake(alice, BigNumber.from('0')))
          .to.be.revertedWith('InvalidAmount');
      });

      it('success', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const stakeTx = await actions.stake(alice, stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterStake(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(stakeTx),
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.eql(expectedPoolData);
        expect(userDataAfter).to.eql(expectedUserData);
      });

      context('and the pool is closed', async () => {
        beforeEach('time passes and pool is closed', async () => {
          await actions.stake(alice, stakeAmount);
          await advanceTimeTo(endTimestamp);
        });

        it('revert if general account close the pool', async () => {
          await expect(testEnv.stakingPool.connect(alice).closePool()
          ).to.be.revertedWith('Ownable: caller is not the owner');
        });

        it('revert if open the pool already finished', async () => {
          await actions.closePool(deployer);
          await expect(
            actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration)
          ).to.be.revertedWith('Finished');
        });

        it('revert if staking in the pool finished', async () => {
          await actions.closePool(deployer);
          await expect(actions.stake(alice, stakeAmount)).to.be.revertedWith('Closed');
        });
      });
    });
  });

  context('staking scenario', async () => {
    beforeEach('init the pool and time passes', async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
    });

    it('first stake and second stake from alice', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);

      const [expectedPoolData, expectedUserData] = expectDataAfterStake(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('first stake, second stake and third stake from alice', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);

      const [expectedPoolData, expectedUserData] = expectDataAfterStake(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('first stake, second stake from alice, third stake from bob', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, bob);
      const stakeTx = await testEnv.stakingPool.connect(bob).stake(stakeAmount);

      const [expectedPoolData, expectedUserData] = expectDataAfterStake(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, bob);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('first stake, second stake from alice, third stake and fourth stake from bob', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      await testEnv.stakingPool.connect(bob).stake(stakeAmount);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, bob);
      const stakeTx = await testEnv.stakingPool.connect(bob).stake(stakeAmount);

      const [expectedPoolData, expectedUserData] = expectDataAfterStake(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, bob);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });
  });

  context('rewardPerSecond is changed', async () => {
    beforeEach('init the pool and stake in pool', async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await resetTimestampTo(firstTimestamp);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
    });

    it('rewardPerSecond is changed and stake in pool', async () => {
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

      const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
        expectedPoolData_1,
        expectedUserData_1,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_2);
      expect(userDataAfter).to.be.equalUserData(expectedUserData_2);
    });

    it('rewardPerSecond is changed and stake in pool twice', async () => {
      const poolDataBefore_1 = await getPoolData(testEnv);
      const userDataBefore_1 = await getUserData(testEnv, alice);
      const tx = await testEnv.stakingPool.connect(deployer).extendPool(newRewardPersecond, duration);
      // check stake 1
      const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
        poolDataBefore_1,
        userDataBefore_1,
        await getTimestamp(tx),
        duration,
        newRewardPersecond
      );

      const stakeTx_1 = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
        expectedPoolData_1,
        expectedUserData_1,
        await getTimestamp(stakeTx_1),
        stakeAmount
      );

      const poolDataAfter_1 = await getPoolData(testEnv);
      const userDataAfter_1 = await getUserData(testEnv, alice);

      expect(poolDataAfter_1).to.be.equalPoolData(expectedPoolData_2);
      expect(userDataAfter_1).to.be.equalUserData(expectedUserData_2);


      // check stake 2
      const poolDataBefore_2 = await getPoolData(testEnv);
      const userDataBefore_2 = await getUserData(testEnv, alice);
      const stakeTx_2 = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      const [expectedPoolData_3, expectedUserData_3] = expectDataAfterStake(
        poolDataBefore_2,
        userDataBefore_2,
        await getTimestamp(stakeTx_2),
        stakeAmount
      );

      const poolDataAfter_2 = await getPoolData(testEnv);
      const userDataAfter_2 = await getUserData(testEnv, alice);

      expect(poolDataAfter_2).to.be.equalPoolData(expectedPoolData_3);
      expect(userDataAfter_2).to.be.equalUserData(expectedUserData_3);
    });

    context('admin set bob as manager', async () => {
      it('bob becomes manager and call extend pool and alice stakes', async () => {
        await actions.faucetAndApproveTarget(bob, RAY);
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        await testEnv.stakingPool.setManager(bob.address);

        await advanceTimeTo(secondTimestamp)
        const tx = await testEnv.stakingPool.connect(bob).extendPool(newRewardPersecond, duration);
        const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(tx),
          duration,
          newRewardPersecond
        );

        const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(stakeTx),
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).eql(expectedPoolData_2);
        expect(userDataAfter).eql(expectedUserData_2);
      });

      it('alice action and bob becomes manager and call extend pool ', async () => {
        await testEnv.stakingPool.connect(alice).stake(stakeAmount);
        await actions.faucetAndApproveTarget(bob, RAY);
        await testEnv.stakingPool.setManager(bob.address);

        await advanceTimeTo(secondTimestamp);
        await testEnv.stakingPool.connect(alice).withdraw(stakeAmount);
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        const tx = await testEnv.stakingPool.connect(bob).extendPool(newRewardPersecond, duration);
        const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(tx),
          duration,
          newRewardPersecond
        );

        const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(stakeTx),
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).eql(expectedPoolData_2);
        expect(userDataAfter).eql(expectedUserData_2);
      });
    });

    context('in case of emergency', async () => {
      it('sucess if alice stakes in an emergency', async () => {
        await testEnv.stakingPool.connect(alice).stake(stakeAmount);
        await testEnv.stakingPool.connect(deployer).setEmergency(true);

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterStake(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(stakeTx),
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });
  });
});

