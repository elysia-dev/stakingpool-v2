import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTime, advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterClaim, expectDataAfterStake } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';
import TestEnv from './types/TestEnv';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.claim', () => {
  let testEnv: TestEnv;

  const provider = waffle.provider;
  const [deployer, alice, bob] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year =  BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);

  const month_2 = BigNumber.from(7);
  const day_2 = BigNumber.from(8);

  const month_3 = BigNumber.from(8);
  const day_3 = BigNumber.from(20);

  const firstRoundStartTimestamp = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const secondRoundStartTimestamp = toTimestamp(year, month_2, day_2, BigNumber.from(10));
  const thirdRoundStartTimestamp = toTimestamp(year, month_3, day_3, BigNumber.from(10));

  const month_pass = BigNumber.from(8);
  const day_pass = BigNumber.from(6);
  const passTimestamp = toTimestamp(year, month_pass, day_pass, BigNumber.from(10));
  const inputAmount = utils.parseEther('100'); 
  const nextRewardPersecond = inputAmount.div(duration);


  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
  });

  it('reverts if the pool has not initiated', async () => {
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await expect(
      testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'))
    ).to.be.revertedWith('StakingNotInitiated');
  });

  context('first claim', async () => {
    beforeEach('deploy staking pool and init the pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          firstRoundStartTimestamp,
          duration
        );
      await testEnv.stakingAsset.connect(alice).faucet();
      const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
    });

    it('reverts if user reward is 0', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim()).to.be.revertedWith(
        'ZeroReward'
      );
    });

    context('user stakes ', async () => {
      beforeEach('user stakes', async () => {
        await testEnv.stakingPool.connect(alice).stake(amount);
      });

      it('success', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const claimTx = await testEnv.stakingPool.connect(alice).claim();

        const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(claimTx),
          nextRewardPersecond,
          duration,
          true
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });
  });


  context('claim after pool is closed', async () => {
    beforeEach('init the pool and close the pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          firstRoundStartTimestamp,
          duration
        );
      await testEnv.stakingAsset.connect(alice).faucet();
      const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
      await testEnv.stakingPool.connect(alice).stake(amount);
    });

    context('the pool is closed', async () => {
      it('alice claim reward', async () => {
        const tx = await testEnv.stakingPool.connect(deployer).closePool();
        await advanceTimeTo(await getTimestamp(tx), secondRoundStartTimestamp);
  
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        const claimTx = await testEnv.stakingPool.connect(alice).claim();
  
        const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(claimTx),
          nextRewardPersecond,
          duration,
          false
        );
  
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.eql(expectedPoolData);
        expect(userDataAfter).to.eql(expectedUserData);
      });

      it('alice claim reward after time passes', async () => {
        await testEnv.stakingPool.connect(deployer).closePool();
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
  
        const claimTx = await testEnv.stakingPool.connect(alice).claim();
        await advanceTimeTo(await getTimestamp(claimTx), thirdRoundStartTimestamp);
  
        const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(claimTx),
          nextRewardPersecond,
          duration,
          false
        );
  
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('the reward does not increase as time passes', async () => {
        await testEnv.stakingPool.connect(deployer).closePool();
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
  
        await advanceTime(10);
  
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.eql(poolDataBefore);
        expect(userDataAfter).to.eql(userDataBefore);
      });
    });

    context('change rewardPerSecond', async () => {
      beforeEach('init the pool and stake in pool', async () => {
        await testEnv.rewardAsset.connect(deployer).faucet();
        await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
        await testEnv.stakingPool
          .connect(deployer)
          .initNewPool(
            rewardPersecond,
            firstRoundStartTimestamp,
            duration
          );
        await testEnv.stakingAsset.connect(alice).faucet();
        const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
        await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
        await testEnv.stakingPool.connect(alice).stake(amount);
      });

      it('rewardPerSecond is changed and claim', async () => {
        const tx = await testEnv.stakingPool.connect(deployer).inputNextReward(inputAmount); 

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        await advanceTimeTo(await getTimestamp(tx), passTimestamp);
  
        const [expectedPoolData_1, expectedUserData_1] = expectDataAfterStake(
          poolDataBefore,
          userDataBefore,
          passTimestamp,
          BigNumber.from(0),
          nextRewardPersecond,
          duration
        );
        
        const claimTx = await testEnv.stakingPool.connect(alice).claim();
        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterClaim(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(claimTx),
          nextRewardPersecond,
          duration,
          true
        );
        
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_2);
        expect(userDataAfter).to.be.equalUserData(expectedUserData_2);
      });

      it('rewardPerSecond is changed and stake and claim', async () => {
        const stakeAmount = utils.parseEther('10');
        const tx = await testEnv.stakingPool.connect(deployer).inputNextReward(inputAmount); 

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
        await advanceTimeTo(await getTimestamp(tx), passTimestamp);

        const [expectedPoolData_1, expectedUserData_1] = expectDataAfterStake(
          poolDataBefore,
          userDataBefore,
          passTimestamp,
          BigNumber.from(0),
          nextRewardPersecond,
          duration
        );

        const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);
        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
          expectedPoolData_1,
          expectedUserData_1, 
          await getTimestamp(stakeTx),
          stakeAmount,
          nextRewardPersecond,
          duration
        );

        const claimTx = await testEnv.stakingPool.connect(alice).claim();
        const [expectedPoolData_3, expectedUserData_3] = expectDataAfterClaim(
          expectedPoolData_2,
          expectedUserData_2,
          await getTimestamp(claimTx),
          nextRewardPersecond,
          duration,
          true
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_3);
        expect(userDataAfter).to.be.equalUserData(expectedUserData_3);
      });
    });
  });
});
