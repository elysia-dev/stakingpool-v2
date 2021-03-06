import { expect } from 'chai';
import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { expectDataAfterStake, expectDataAfterWithdraw, updatePoolData } from './utils/expect';
import { createTestActions, getPoolData, getUserData, TestHelperActions } from './utils/helpers';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, resetTimestampTo, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.withdraw', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, alice, bob] = provider.getWallets();

  const rewardPersecond = utils.parseEther('1');
  const duration = 30 * SECONDSPERDAY;

  const firstTimestamp = toTimestamp('2022.07.08 10:00:00Z');
  const secondTimestamp = toTimestamp('2022.07.20 10:00:00Z');
  const amount = ethers.utils.parseEther('1');
  const newRewardPersecond = BigNumber.from(utils.parseEther('2'));

  async function fixture() {
    return await setTestEnv();
  }

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
    await actions.faucetAndApproveReward(deployer, RAY);
    await actions.faucetAndApproveTarget(alice, RAY);
  });

  it('reverts if the pool is before initiation', async () => {
    await expect(testEnv.stakingPool.connect(alice).withdraw(amount)).to.be.revertedWith(
      'StakingNotInitiated'
    );
  });

  context('when the pool initiated', async () => {
    beforeEach('deploy staking pool and init pool', async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await actions.faucetAndApproveTarget(bob, RAY);
    });

    it('reverts if withdraws amount exceeds principal', async () => {
      await expect(testEnv.stakingPool.connect(alice).withdraw(amount)).to.be.revertedWith(
        'NotEnoughPrincipal'
      );
    });

    context('when alice stakes and time passes', async () => {
      const stakeAmount = utils.parseEther('1');

      beforeEach('', async () => {
        await resetTimestampTo(firstTimestamp);
        await actions.stake(alice, stakeAmount);
      });

      it('alice withdraws all', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const withdrawTx = await actions.withdraw(alice, stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('alice withdraw all and stake again', async () => {
        await actions.withdraw(alice, stakeAmount);

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

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('first stake, second stake from alice, and withdraw max', async () => {
        await testEnv.stakingPool.connect(alice).stake(stakeAmount);
        await testEnv.stakingPool.connect(alice).stake(stakeAmount);

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const withdrawAllTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(ethers.constants.MaxUint256);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawAllTx),
          ethers.constants.MaxUint256
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('alice and bob stake, and alice withdraws partial', async () => {
        await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2));
        await testEnv.stakingPool.connect(bob).stake(stakeAmount);

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });

    context('withdraw after pool is closed', async () => {
      beforeEach('owner close pool', async () => {
        await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
        await resetTimestampTo(firstTimestamp);

        await testEnv.stakingPool.connect(alice).stake(amount.mul(2));
        await testEnv.stakingPool.connect(deployer).closePool();
        await advanceTimeTo(secondTimestamp);
      });

      it('reverts if withdraws amount exceeds principal', async () => {
        await expect(testEnv.stakingPool.connect(alice).withdraw(amount.mul(3))).to.be.revertedWith(
          'NotEnoughPrincipal'
        );
      });

      it('alice withdraws all', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(amount.mul(2));

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          amount.mul(2)
        );
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('revert if alice withdraws and stakes', async () => {
        await testEnv.stakingPool.connect(alice).withdraw(amount);
        await expect(testEnv.stakingPool.connect(alice).stake(amount)).to.be.revertedWith('Closed');
      });

      it('alice withdraws partial', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(amount);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          amount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });

    context('rewardPerSecond is changed', async () => {
      beforeEach('deploy staking pool and init pool', async () => {
        await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
        await resetTimestampTo(firstTimestamp);
        await testEnv.stakingPool.connect(alice).stake(amount.mul(3));
      });

      it('rewardPerSecond is changed and withdraw all', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        const tx = await testEnv.stakingPool
          .connect(deployer)
          .extendPool(newRewardPersecond, duration);

        const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(tx),
          duration,
          newRewardPersecond
        );

        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(amount.mul(3));

        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterWithdraw(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(withdrawTx),
          amount.mul(3)
        );
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).eql(expectedPoolData_2);
        expect(userDataAfter).eql(expectedUserData_2);
      });

      it('rewardPerSecond is changed and withdraw partial', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        const tx = await testEnv.stakingPool
          .connect(deployer)
          .extendPool(newRewardPersecond, duration);

        const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(tx),
          duration,
          newRewardPersecond
        );

        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(amount);

        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterWithdraw(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(withdrawTx),
          amount
        );
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).eql(expectedPoolData_2);
        expect(userDataAfter).eql(expectedUserData_2);
      });

      it('rewardPerSecond is changed and stake and withdraw', async () => {
        const poolDataBeforeStake = await getPoolData(testEnv);
        const userDataBeforeStake = await getUserData(testEnv, alice);
        const tx = await testEnv.stakingPool
          .connect(deployer)
          .extendPool(newRewardPersecond, duration);

        const [expectedPoolData, expectedUserData] = updatePoolData(
          poolDataBeforeStake,
          userDataBeforeStake,
          await getTimestamp(tx),
          duration,
          newRewardPersecond
        );

        const stakeTx = await testEnv.stakingPool.connect(alice).stake(amount.mul(2));
        const [expectedPoolDataStake, expectedUserDataStake] = expectDataAfterStake(
          expectedPoolData,
          expectedUserData,
          await getTimestamp(stakeTx),
          amount.mul(2)
        );

        const poolDataAfterStake = await getPoolData(testEnv);
        const userDataAfterStake = await getUserData(testEnv, alice);

        expect(poolDataAfterStake).eql(expectedPoolDataStake);
        expect(userDataAfterStake).eql(expectedUserDataStake);

        // withdraw test
        const poolDataBeforeWithdraw = await getPoolData(testEnv);
        const userDataBeforeWithdraw = await getUserData(testEnv, alice);
        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(amount);
        const [expectedPoolDataWithdraw, expectedUserDataWithdraw] = expectDataAfterWithdraw(
          poolDataBeforeWithdraw,
          userDataBeforeWithdraw,
          await getTimestamp(withdrawTx),
          amount
        );
        const poolDataAfterWithdraw = await getPoolData(testEnv);
        const userDataAfterWithdraw = await getUserData(testEnv, alice);

        expect(poolDataAfterWithdraw).eql(expectedPoolDataWithdraw);
        expect(userDataAfterWithdraw).eql(expectedUserDataWithdraw);
      });
    });

    context('in case of emergency', async () => {
      beforeEach('init the pool and alice stakes', async () => {
        await actions.faucetAndApproveReward(deployer, RAY);
        await actions.faucetAndApproveTarget(alice, RAY);
        await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);

        await resetTimestampTo(firstTimestamp);
        await testEnv.stakingPool.connect(alice).stake(amount);
      });

      it('succeeds if alice withdraws', async () => {
        await testEnv.stakingPool.connect(deployer).setEmergency(true);

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(amount);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          amount
        );
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.eql(expectedPoolData);
        expect(userDataAfter).to.eql(expectedUserData);
      });
    });
  });
});
