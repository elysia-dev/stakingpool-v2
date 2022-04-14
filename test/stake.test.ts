import { BigNumber, utils, ethers } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
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
  const month = BigNumber.from(7);
  const day = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const month_end = BigNumber.from(8);
  const day_end = BigNumber.from(20);

  const startTimestamp = toTimestamp(year, month, day, BigNumber.from(10));
  const endTimestamp = toTimestamp(year, month_end, day_end, BigNumber.from(10));

  const stakeAmount = utils.parseEther('10');

  async function fixture() {
    return await setTestEnv();
  }

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
  });

  it('reverts if the pool has not initiated', async () => {
    await actions.faucetAndApproveTarget(alice, RAY);
    await expect(actions.stake(alice, utils.parseEther('100')))
      .to.be.revertedWith('StakingNotInitiated');
  });

  context('when the pool initiated', async () => {
    beforeEach('approve and faucet for deployer & alice', async () => {
      await actions.faucetAndApproveReward(deployer, RAY)
      await actions.faucetAndApproveTarget(alice, RAY)
    });

    context('when the pool has started', async () => {
      beforeEach(async () => {
        const tx = await testEnv.stakingPool
          .connect(deployer)
          .initNewPool(rewardPersecond, startTimestamp, duration);
        await advanceTimeTo(await getTimestamp(tx), startTimestamp);
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

      context('pool is closed', async () => {
        beforeEach('time passes and pool is closed', async () => {
          const tx = await actions.stake(alice, stakeAmount);
          await advanceTimeTo(await getTimestamp(tx), endTimestamp);
        });

        it('revert if general account close the pool', async () => {
          await expect(testEnv.stakingPool.connect(alice).closePool()
          ).to.be.revertedWith('OnlyAdmin');
        });

        it('revert if open the pool already finished', async () => {
          await actions.closePool(deployer);
          await expect(
            actions.initNewPool(deployer, rewardPersecond, startTimestamp, duration)
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
      await actions.faucetAndApproveReward(deployer, RAY);
      await actions.initNewPool(deployer, rewardPersecond, startTimestamp, duration);

      await actions.faucetAndApproveTarget(alice, RAY);
      const tx = actions.faucetAndApproveTarget(bob, RAY);
      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
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
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, startTimestamp, duration);
      await testEnv.stakingAsset.connect(alice).faucet();
      const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).transfer(testEnv.stakingPool.address, ethers.utils.parseEther('100'));
    });

    it('rewardPerSecond is changed and stake in pool', async () => {
      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const tx = await testEnv.stakingPool.connect(deployer).extendPool(rewardPersecond, duration);

      const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(tx),
        duration,
        rewardPersecond
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
      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const tx = await testEnv.stakingPool.connect(deployer).extendPool(rewardPersecond, duration);

      const [expectedPoolData_1, expectedUserData_1] = updatePoolData(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(tx),
        duration,
        rewardPersecond
      );

      const stakeTx_1 = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
        expectedPoolData_1,
        expectedUserData_1,
        await getTimestamp(stakeTx_1),
        stakeAmount
      );

      const stakeTx_2 = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      const [expectedPoolData_3, expectedUserData_3] = expectDataAfterStake(
        expectedPoolData_2,
        expectedUserData_2,
        await getTimestamp(stakeTx_2),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_3);
      expect(userDataAfter).to.be.equalUserData(expectedUserData_3);
    });
  })
});
