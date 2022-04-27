import { expect } from 'chai';
import { BigNumber, constants, utils } from 'ethers';
import { waffle } from 'hardhat';
import moment from 'moment';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { createTestActions, TestHelperActions } from './utils/helpers';
import { setTestEnv } from './utils/testEnv';
import { advanceTime, advanceTimeTo, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

describe('StakingPool.closePool', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, alice] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const startTimestamp = toTimestamp("2022.07.07 10:00:00Z")
  const initialIndex = BigNumber.from('0');

  const stakeAmount = utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach(async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
    await actions.faucetAndApproveReward(deployer, constants.MaxUint256.toString());
    await actions.faucetAndApproveTarget(alice, RAY);
  });

  context('when the pool has started', async () => {
    beforeEach(async () => {
      await actions.initNewPoolAndTransfer(
        deployer, rewardPerSecond, startTimestamp, duration);
      await advanceTimeTo(startTimestamp);
    });

    it('reverts if a general account closes the pool', async () => {
      await expect(testEnv.stakingPool.connect(alice).closePool()
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('reverts if open the pool already finished', async () => {
      const rewardPersecond = BigNumber.from(utils.parseEther('1'));
      const startAt = BigNumber.from(moment("2022.04.18 19:00:00", 'YYYY.MM.DD hh:mm:ss Z').unix())

      await actions.closePool(deployer);
      await expect(
        actions.initNewPoolAndTransfer(deployer, rewardPersecond, startAt, duration)
      ).to.be.revertedWith('Finished');
    });

    it('reverts staking request after it is closed', async () => {
      await actions.closePool(deployer);
      await expect(actions.stake(alice, stakeAmount)).to.be.revertedWith('Closed');
    });

    it('the index does not increase after the pool is closed.', async () => {
      await actions.stake(alice, stakeAmount); // t: start + 1
      await advanceTimeTo(startTimestamp.add(BigNumber.from('10'))); // t: start + 10
      await actions.closePool(deployer); // t: start + 11, so alice staked for 10 secs

      await advanceTime(10); // t: start + 20

      const aliceData = await actions.getUserData(alice);
      const poolData = await actions.getPoolData();

      // closePool does not update userIndex & rewardIndex of the pool
      expect(aliceData.userIndex).to.equal(initialIndex);
      expect(poolData.rewardIndex).to.equal(initialIndex);

      // However, the reward is only calculated until the endTimestamp.
      expect(aliceData.userReward).to.equal(utils.parseEther('10'));

      await actions.claim(alice);

      const aliceDataAfterClaim = await actions.getUserData(alice);
      const poolDataAfterClaim = await actions.getPoolData();

      // After a user claims, userIndex changes, but the rewardIndex remains the same.
      expect(aliceDataAfterClaim.userReward).to.equal(utils.parseEther('0'));
      expect(aliceDataAfterClaim.userIndex).to.equal(utils.parseEther('10'));

      expect(poolDataAfterClaim.rewardIndex).to.equal(initialIndex);
    });
  });
});
