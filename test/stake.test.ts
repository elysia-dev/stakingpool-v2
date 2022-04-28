import { expect } from 'chai';
import { BigNumber, ethers, utils, Wallet } from 'ethers';
import { waffle } from 'hardhat';
import { PoolData, TestEnv, UserData } from './types';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { createTestActions, TestHelperActions } from './utils/helpers';
import { setTestEnv } from './utils/testEnv';
import { advanceTime, getTimestamp, resetTimestampTo, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

describe('StakingPool.stake', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;
  let userDataBefore: UserData;
  let poolDataBefore: PoolData;
  let userDataAfter: UserData;
  let poolDataAfter: PoolData;

  const fetchDataBeforeAction = async (wallet: Wallet) => {
    poolDataBefore = await actions.getPoolData();
    userDataBefore = await actions.getUserData(wallet);
  };

  const fetchDataAfterAction = async (wallet: Wallet) => {
    poolDataAfter = await actions.getPoolData();
    userDataAfter = await actions.getUserData(wallet);
  };

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = utils.parseEther('1');
  const duration = 30 * SECONDSPERDAY;

  const firstTimestamp = toTimestamp('2022.07.07 10:00:00Z');

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
    await expect(actions.stake(alice, utils.parseEther('100'))).to.be.revertedWith(
      'StakingNotInitiated'
    );
  });

  context('when the pool is initiated and started', async () => {
    beforeEach(async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
      await fetchDataBeforeAction(alice);
    });

    it('reverts if user staking amount is 0', async () => {
      await expect(actions.stake(alice, BigNumber.from('0'))).to.be.revertedWith('InvalidAmount');
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

    it("updates the message sender's userIndex equal to the current rewardIndex", async () => {
      await actions.stake(alice, stakeAmount); // t: start + 1
      await fetchDataAfterAction(alice);

      expect(poolDataAfter.rewardIndex).to.equal(userDataAfter.userIndex);
    });

    it('updates the lastUpdateTimestamp equal to the current block timestamp', async () => {
      const tx = await actions.stake(alice, stakeAmount);
      await fetchDataAfterAction(alice);

      expect(poolDataAfter.lastUpdateTimestamp).to.equal(await getTimestamp(tx));
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

      expect(poolDataAfter.stakingAssetBalance.sub(poolDataBefore.stakingAssetBalance)).to.equal(
        stakeAmount
      );
      expect(userDataBefore.stakingAssetBalance.sub(userDataAfter.stakingAssetBalance)).to.equal(
        stakeAmount
      );
    });

    context('If it is not the first staking', () => {
      // TODO: If alice and bob stakes, their index increases proportionately
      it('', async () => {});
    });
  });

  context('when rewardPerSecond is changed after it began', async () => {
    beforeEach('init the pool and stake in pool', async () => {
      const { initNewPoolAndTransfer, stake } = actions;
      await initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
      await stake(alice, stakeAmount);
      await fetchDataBeforeAction(alice);
    });

    it('rewardPerSecond is changed and stake in pool', async () => {
      const { stakeAndCheck, extendPoolAndCheck } = actions;
      await extendPoolAndCheck(deployer, alice, newRewardPersecond, duration);
      await stakeAndCheck(alice, stakeAmount);
    });

    it('rewardPerSecond is changed and stake in pool twice', async () => {
      const { stakeAndCheck, extendPoolAndCheck } = actions;
      await extendPoolAndCheck(deployer, alice, newRewardPersecond, duration);
      await stakeAndCheck(alice, stakeAmount);
      await stakeAndCheck(alice, stakeAmount);
    });

    context('in case of emergency', async () => {
      it('succeeds if alice stakes', async () => {
        const { stake, setEmergency } = actions;
        await stake(alice, stakeAmount);
        await setEmergency(deployer, true);

        await stake(alice, stakeAmount); // not reverted
      });
    });
  });
});
