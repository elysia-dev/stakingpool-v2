import { utils } from 'ethers';
import { waffle } from 'hardhat';
import { TestEnv } from '../types';
import { RAY, SECONDSPERDAY } from '../utils/constants';
import { createTestActions, TestHelperActions } from '../utils/helpers';
import { setTestEnv } from '../utils/testEnv';
import { resetTimestampTo, toTimestamp } from '../utils/time';

const { loadFixture } = waffle;

describe('StakingPool.stake', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = utils.parseEther('1');
  const duration = 30 * SECONDSPERDAY;

  const firstTimestamp = toTimestamp("2022.07.07 10:00:00Z")

  const stakeAmount = utils.parseEther('10');

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

  context('staking scenario', async () => {
    beforeEach('init the pool and time passes', async () => {
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, firstTimestamp, duration);
      await resetTimestampTo(firstTimestamp);
    });

    it('first stake and second stake from alice', async () => {
      const { stake, stakeAndCheck } = actions;

      await stake(alice, stakeAmount);
      await stakeAndCheck(alice, stakeAmount);
    });

    it('first stake, second stake and third stake from alice', async () => {
      const { stake, stakeAndCheck } = actions;

      await stake(alice, stakeAmount);
      await stake(alice, stakeAmount);
      await stakeAndCheck(alice, stakeAmount);
    });

    it('first stake, second stake from alice, third stake from bob', async () => {
      const { stake, stakeAndCheck } = actions;

      await stake(alice, stakeAmount);
      await stake(alice, stakeAmount);
      await stakeAndCheck(bob, stakeAmount);
    });

    it('first stake, second stake from alice, third stake and fourth stake from bob', async () => {
      const { stake, stakeAndCheck } = actions;

      await stake(alice, stakeAmount);
      await stake(alice, stakeAmount);
      await stake(bob, stakeAmount);
      await stakeAndCheck(bob, stakeAmount);
    });
  });
});
