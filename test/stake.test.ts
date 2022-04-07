import { BigNumber, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterStake } from './utils/expect';
import { getPoolData, getSumPoolData, getSumUserData, getUserData } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.stake', () => {
  let testEnv: TestEnv;
  let testEnvCompare: TestEnv;

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


  const month_pass = BigNumber.from(8);
  const day_pass = BigNumber.from(6);
  const passTimestamp = toTimestamp(year, month_pass, day_pass, BigNumber.from(10));
  const inputAmount = utils.parseEther('100'); 
  const nextRewardPersecond = inputAmount.div(duration);


  const stakeAmount = utils.parseEther('10');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
    testEnvCompare = await loadFixture(fixture);
  });

  it('reverts if the pool has not initiated', async () => {
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await expect(
      testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'))
    ).to.be.revertedWith('StakingNotInitiated');
  });

  context('when the pool initiated', async () => {
    const stakeAmount = utils.parseEther('100');

    beforeEach('init the pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, startTimestamp, duration);

      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    });

    context('Time passes', async () => {
      beforeEach('init the pool', async () => {
        const tx = await testEnv.stakingAsset
          .connect(alice)
          .approve(testEnv.stakingPool.address, RAY);
        await advanceTimeTo(await getTimestamp(tx), startTimestamp);
      });

      it('reverts if user staking amount is 0', async () => {
        await expect(testEnv.stakingPool.connect(alice).stake(0)).to.be.revertedWith(
          'InvalidAmount'
        );
      });

      it('success', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, stakeAmount);
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

      context('pool is closed', async () => {
        beforeEach('time passes and pool is closed', async () => {
          const tx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
          await advanceTimeTo(await getTimestamp(tx), endTimestamp);
        })
        
        it('revert if general account close the pool', async () => {
          await expect(testEnv.stakingPool.connect(alice).closePool()
          ).to.be.revertedWith('OnlyAdmin');
        });

        it('revert if open the pool already finished', async () => {
          await testEnv.stakingPool.connect(deployer).closePool();

          await expect(testEnv.stakingPool
            .connect(deployer)
            .initNewPool(rewardPersecond, startTimestamp, duration)
          ).to.be.revertedWith('IsFinished');
        });

        it('revert if staking in the pool finished', async () => {
          await testEnv.stakingPool.connect(deployer).closePool();

          await expect(testEnv.stakingPool.connect(alice).stake(stakeAmount)
          ).to.be.revertedWith('IsClosed');
        });
      });
    });
  });

  context('staking scenario', async () => {
    beforeEach('init the pool and time passes', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, startTimestamp, duration);

      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(bob).faucet();

      const tx = await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
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


  context('change rewardPerSecond', async () => {
    beforeEach('init the pool and stake in pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, startTimestamp, duration);

      await testEnvCompare.stakingPool
        .connect(deployer)
        .initNewPool(nextRewardPersecond, passTimestamp, duration);

      await testEnv.stakingAsset.connect(alice).faucet();
      const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);

    });
    
    it.only('rewardPerSecond and stake in pool', async () => {
      const poolDataBefore_1 = await getPoolData(testEnv);
      const userDataBefore_1 = await getUserData(testEnv, alice);

      const tx = await testEnv.stakingPool.connect(deployer).inputNextReward(inputAmount); 

      const [expectedPoolData_1, expectedUserData_1] = expectDataAfterStake(
        poolDataBefore_1,
        userDataBefore_1,
        passTimestamp,
        BigNumber.from(0)
      );

      const poolDataBefore_2 = await getPoolData(testEnvCompare);
      const userDataBefore_2 = await getUserData(testEnvCompare, alice);
      
      await advanceTimeTo(await getTimestamp(tx), endTimestamp);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);

      await advanceTimeTo(await getTimestamp(tx), endTimestamp);
      const stakeTxCompare = await testEnvCompare.stakingPool.connect(alice).stake(stakeAmount);

      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
        poolDataBefore_2,
        userDataBefore_2,
        await getTimestamp(stakeTxCompare),
        stakeAmount
      );

      const expectedPoolDataResult = await getSumPoolData(expectedPoolData_1, expectedPoolData_2);
      const expectedUserDataResult = await getSumUserData(expectedUserData_1, expectedUserData_2);

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolDataResult);
      expect(userDataAfter).to.be.equalUserData(expectedUserDataResult);
      
    });
  });
});
