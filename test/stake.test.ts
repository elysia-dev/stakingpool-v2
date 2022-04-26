import { BigNumber, utils, ethers, Wallet } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import { UserData, PoolData, TestEnv } from './types';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTime, advanceTimeTo, resetTimestampTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterStake, updatePoolData } from './utils/expect';
import { createTestActions, getPoolData, getUserData, TestHelperActions } from './utils/helpers';

const { loadFixture } = waffle;

describe('StakingPool.stake', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;
  let userDataBefore: UserData;
  let poolDataBefore: PoolData;
  let userDataAfter: UserData;
  let poolDataAfter: PoolData;

  const fetchDataBeforeAction = async (wallet: Wallet) => {
    userDataBefore = await actions.getUserData(alice);
    poolDataBefore = await actions.getPoolData();
  }

  const fetchDataAfterAction = async (wallet: Wallet) => {
    poolDataAfter = await actions.getPoolData();
    userDataAfter = await actions.getUserData(wallet);
  }

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const firstTimestamp = toTimestamp("2022.07.07 10:00:00Z")
  const secondTimestamp = toTimestamp("2022.08.04 10:00:00Z")

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

  context('when the pool is initiated and started', async () => {
    beforeEach(async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
      await fetchDataBeforeAction(alice);
    });

    it('reverts if user staking amount is 0', async () => {
      await expect(actions.stake(alice, BigNumber.from('0')))
        .to.be.revertedWith('InvalidAmount');
    });

    it('increases rewardIndex by rewardPerSecond * seconds_passed_after_last_update / totalPrincipal', async () => {
      await actions.stake(alice, stakeAmount); // t: start + 1
      await advanceTime(10); // t: start + 11

      const rewardIndex = await testEnv.stakingPool.getRewardIndex();
      await fetchDataAfterAction(alice);

      // timeDiff * rewardPerSecond / totalPrincipal =  10 * 1 / 10
      expect(rewardIndex).to.equal(ethers.utils.parseEther('1'));
      // poolData.rewardIndex saves the poolIndex at the lastUpdateTimestamp
      expect(poolDataAfter.rewardIndex).to.equal(BigNumber.from('0'));
    });

    it('updates the message sender\'s userIndex equal to the current rewardIndex', async () => {
      await actions.stake(alice, stakeAmount); // t: start + 1
      await fetchDataAfterAction(alice);

      expect(poolDataAfter.rewardIndex).to.equal(userDataAfter.userIndex);
    });

    it('updates the lastUpdateTimestamp equal to the current block timestamp', async () => {
      const tx = await actions.stake(alice, stakeAmount);
      const receipt = await tx.wait();
      await fetchDataAfterAction(alice);

      expect(poolDataAfter.lastUpdateTimestamp).to.equal(await getTimestamp(receipt));
    });

    it('increases the user principal and the total principal of the pool by the staked amount', async () => {
      await actions.stake(alice, stakeAmount);
      await fetchDataAfterAction(alice);

      expect(poolDataAfter.totalPrincipal).to.equal(poolDataBefore.totalPrincipal.add(stakeAmount));
      expect(userDataAfter.userPrincipal).to.equal(userDataBefore.userPrincipal.add(stakeAmount));
    });

    it('transfers the staked amount of token from the user to the pool', async () => {
      await actions.stake(alice, stakeAmount);
      await fetchDataAfterAction(alice);

      expect(poolDataAfter.stakingAssetBalance.sub(poolDataBefore.stakingAssetBalance)).to.equal(stakeAmount);
      expect(userDataBefore.stakingAssetBalance.sub(userDataAfter.stakingAssetBalance)).to.equal(stakeAmount);
    });

    context('If it is not the first staking', () => {
      // TODO: If alice and bob stakes, their index increases proportionately
      it('', async () => {

      });
    });
  });

  context('when rewardPerSecond is changed after it began', async () => {
    beforeEach('init the pool and stake in pool', async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
      await actions.stake(alice, stakeAmount);
      await fetchDataBeforeAction(alice);
    });

    it('rewardPerSecond is changed and stake in pool', async () => {
      const tx = await testEnv.stakingPool.connect(deployer).extendPool(newRewardPersecond, duration);

      const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(tx),
        duration,
        newRewardPersecond
      );

      const stakeTx = await actions.stake(alice, stakeAmount);
      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
        expectedPoolData_1,
        expectedUserData_1,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.eql(expectedPoolData_2);
      expect(userDataAfter).to.eql(expectedUserData_2);
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

      expect(poolDataAfter_1).to.eql(expectedPoolData_2);
      expect(userDataAfter_1).to.eql(expectedUserData_2);

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

      expect(poolDataAfter_2).to.eql(expectedPoolData_3);
      expect(userDataAfter_2).to.eql(expectedUserData_3);
    });

    // TODO: Extract these to extendPool.test.ts
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

        await fetchDataAfterAction(alice);

        expect(poolDataAfter).eql(expectedPoolData_2);
        expect(userDataAfter).eql(expectedUserData_2);
      });

      it('alice action and bob becomes manager and call extend pool ', async () => {
        await actions.stake(alice, stakeAmount);
        await actions.faucetAndApproveTarget(bob, RAY);
        await testEnv.stakingPool.setManager(bob.address);

        await advanceTimeTo(secondTimestamp);
        await actions.withdraw(alice, stakeAmount);

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

        await fetchDataAfterAction(alice);

        expect(poolDataAfter).eql(expectedPoolData_2);
        expect(userDataAfter).eql(expectedUserData_2);
      });
    });

    context('in case of emergency', async () => {
      it('succeeds if alice stakes', async () => {
        await actions.stake(alice, stakeAmount);
        await actions.setEmergency(deployer, true);

        await actions.stake(alice, stakeAmount); // not reverted
      });
    });
  });
});

