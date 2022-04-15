import { createTestActions, TestHelperActions } from './utils/helpers';
import { BigNumber, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';

import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY, WAD, MAX_UINT_AMOUNT } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTime, advanceTimeTo, advanceTimeTo2, getTimestamp, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

describe('StakingPool.closePool', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;

  const provider = waffle.provider;
  const [deployer, alice] = provider.getWallets();

  const rewardPerSecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month = BigNumber.from(7);
  const day = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const startTimestamp = toTimestamp(year, month, day, BigNumber.from(10));
  const initialIndex = utils.parseEther('1');
  const endTimestamp = startTimestamp.add(duration);

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
    await actions.faucetAndApproveReward(deployer, MAX_UINT_AMOUNT);
    await actions.faucetAndApproveTarget(alice, RAY);
  });

  context('when the pool has started', async () => {
    beforeEach(async () => {
      const tx = await actions.initNewPool(
        deployer, rewardPerSecond, startTimestamp, duration);
      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
    });

    it('the index does not increase after the pool is closed.', async () => {
      await actions.stake(alice, stakeAmount); // t: start + 1
      await advanceTimeTo2(startTimestamp.add(BigNumber.from('10'))); // t: start + 10
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
      expect(aliceDataAfterClaim.userIndex).to.equal(BigNumber.from('1000000010000000000'));

      expect(poolDataAfterClaim.rewardIndex).to.equal(initialIndex);
    });
  });
});