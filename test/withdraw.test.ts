import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterStake, expectDataAfterWithdraw} from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.withdraw', () => {
  let testEnv: TestEnv;

  const provider = waffle.provider;
  const [deployer, alice, bob] = provider.getWallets();


  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);
  
  const month_2 = BigNumber.from(7);
  const day_2 = BigNumber.from(8);

  const firstTimestamp = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const secondTimestamp = toTimestamp(year, month_2, day_2, BigNumber.from(10));

  const month_pass = BigNumber.from(8);
  const day_pass = BigNumber.from(6);
  const passTimestamp = toTimestamp(year, month_pass, day_pass, BigNumber.from(10));
  const inputAmount = utils.parseEther('100'); 
  const nextRewardPersecond = inputAmount.div(duration);

  const stakeAmount = ethers.utils.parseEther('10');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
  });

  it('reverts if the pool is before initiation', async () => {
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await expect(
      testEnv.stakingPool.connect(alice).withdraw(stakeAmount)
    ).to.be.revertedWith('StakingNotInitiated');
  });

  context('when the pool initiated', async () => {
    beforeEach('deploy staking pool and init pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, firstTimestamp, duration);
      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(bob).faucet();
      await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
    });

    it('reverts if withdraws amount exceeds principal', async () => {
      await expect(
        testEnv.stakingPool.connect(alice).withdraw(stakeAmount)
      ).to.be.revertedWith('NotEnoughPrincipal');
    });

    context('stake and withdraw scenario', async () => {

      beforeEach('time passes and alice stakes', async () => {  
        const tx = await testEnv.stakingAsset
          .connect(alice)
          .approve(testEnv.stakingPool.address, RAY);

        await advanceTimeTo(await getTimestamp(tx), firstTimestamp);
        await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      });

      it('alice withdraws all', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
      
        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          stakeAmount,
          nextRewardPersecond,
          duration,
          true
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });

      it('alice withdraw all and stake again', async () => {
        await testEnv.stakingPool.connect(alice).withdraw(stakeAmount);

        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterStake(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(stakeTx),
          stakeAmount,
          nextRewardPersecond,
          duration
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
          ethers.constants.MaxUint256,
          nextRewardPersecond,
          duration,
          true
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

        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount);

        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          stakeAmount,
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


    context('withdraw after pool is closed', async () => {
      beforeEach('owner close pool', async () => {
        const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
        await advanceTimeTo(await getTimestamp(tx), firstTimestamp);
        await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2));

        const closeTx = await testEnv.stakingPool.connect(deployer).closePool();
        await advanceTimeTo(await getTimestamp(closeTx), secondTimestamp);
      })
  
      it('reverts if withdraws amount exceeds principal', async () => {
        await expect(
          testEnv.stakingPool.connect(alice).withdraw(stakeAmount.mul(3))
        ).to.be.revertedWith('NotEnoughPrincipal');
      });
  
      it('alice withdraws all', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
      
        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount.mul(2));
  
        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          stakeAmount.mul(2),
          nextRewardPersecond,
          duration,
          false
        );
  
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.eql(expectedPoolData);
        expect(userDataAfter).to.eql(expectedUserData);
      });


      it('revert if alice withdraws and stakes', async () => {
        await testEnv.stakingPool.connect(alice).withdraw(stakeAmount);
        await expect(testEnv.stakingPool.connect(alice).stake(stakeAmount)
        ).to.be.revertedWith('Closed');
      });
  
  
      it('alice withdraws partial', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
      
        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount);
  
        const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
          poolDataBefore,
          userDataBefore,
          await getTimestamp(withdrawTx),
          stakeAmount,
          nextRewardPersecond,
          duration,
          false
        );
  
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.eql(expectedPoolData);
        expect(userDataAfter).to.eql(expectedUserData);
      });
    });


    context('change rewardPerSecond', async () => {
      beforeEach('init the pool and stake in pool', async () => {
        await testEnv.rewardAsset.connect(deployer).faucet();
        await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
        await testEnv.stakingPool
          .connect(deployer)
          .initNewPool(rewardPersecond, firstTimestamp, duration);
        
        await testEnv.stakingAsset.connect(alice).faucet();
        const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
        await advanceTimeTo(await getTimestamp(tx), firstTimestamp);
        await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(3));
      });

      it('rewardPerSecond is changed and withdraw all', async () => {
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

        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount.mul(3));

        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterWithdraw(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(withdrawTx),
          stakeAmount.mul(3),
          nextRewardPersecond,
          duration,
          true
        );
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_2);
        expect(userDataAfter).to.be.equalUserData(expectedUserData_2);

      });

      it('rewardPerSecond is changed and withdraw partial', async () => {
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

        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount);

        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterWithdraw(
          expectedPoolData_1,
          expectedUserData_1,
          await getTimestamp(withdrawTx),
          stakeAmount,
          nextRewardPersecond,
          duration,
          true
        );
        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);
  
        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData_2);
        expect(userDataAfter).to.be.equalUserData(expectedUserData_2);

      });

      it('rewardPerSecond is changed and stake and withdraw', async () => {
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

        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount);

        const [expectedPoolData_3, expectedUserData_3] = expectDataAfterWithdraw(
          expectedPoolData_2,
          expectedUserData_2,
          await getTimestamp(withdrawTx),
          stakeAmount,
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
