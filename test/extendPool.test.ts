import { utils } from 'ethers';
import { waffle } from 'hardhat';
import { TestEnv } from './types';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { createTestActions, TestHelperActions } from './utils/helpers';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, resetTimestampTo, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

describe('StakingPool.extendPool', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const [deployer, alice, bob, carol] = waffle.provider.getWallets();

  const rewardPersecond = utils.parseEther('1');
  const duration = 30 * SECONDSPERDAY;

  const firstTimestamp = toTimestamp("2022.07.07 10:00:00Z")
  const secondTimestamp = toTimestamp("2022.08.04 10:00:00Z")

  const stakeAmount = utils.parseEther('10');
  const newRewardPersecond = utils.parseEther('2');

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

  context('when the pool is initiated and started', async () => {
    beforeEach(async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
    });

    it('bob becomes manager and call extend pool and alice stakes', async () => {
      await actions.faucetAndApproveTarget(bob, RAY);
      await testEnv.stakingPool.setManager(bob.address);

      await advanceTimeTo(secondTimestamp)
      await actions.extendPoolAndCheck(bob, bob, newRewardPersecond, duration)
      await actions.stakeAndCheck(alice, stakeAmount);
    });

    it('alice action and bob becomes manager and call extend pool ', async () => {
      await actions.stake(alice, stakeAmount);
      await actions.faucetAndApproveTarget(bob, RAY);
      await testEnv.stakingPool.setManager(bob.address);

      await advanceTimeTo(secondTimestamp);
      await actions.withdraw(alice, stakeAmount);

      await actions.extendPoolAndCheck(bob, alice, newRewardPersecond, duration);
      await actions.stakeAndCheck(alice, stakeAmount);
    });
  });
});
