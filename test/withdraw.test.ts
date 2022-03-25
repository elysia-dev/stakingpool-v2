import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterStake, expectDataAfterWithdraw } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.withdraw', () => {
  let testEnv: TestEnv;

  const provider = waffle.provider;
  const [deployer, alice, bob] = provider.getWallets();

  const firstRound = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(7),
    day: BigNumber.from(7),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };

  const startTimestamp = toTimestamp(
    firstRound.year,
    firstRound.month,
    firstRound.day,
    BigNumber.from(10)
  );


  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    const testEnv = await setTestEnv();
    await testEnv.rewardAsset.connect(deployer).faucet();
    await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);

    await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(firstRound.rewardPersecond, startTimestamp, firstRound.duration, testEnv.rewardAsset.address);
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingAsset.connect(bob).faucet();
    await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
    return testEnv;
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool and init first round', async () => {
    testEnv = await loadFixture(fixture);
  });

  context('when the first round initiated', async () => {
    it('reverts if withdrawl amount exceeds principal', async () => {
      const currentRound = await testEnv.stakingPool.currentPoolID();
      await expect(
        testEnv.stakingPool.connect(alice).withdraw(amount, currentRound)
      ).to.be.revertedWith('NotEnoughPrincipal');
    });

    it ('reverts if target round is before initiation', async () => {
      const currentRound = await testEnv.stakingPool.currentPoolID();
      await expect(
        testEnv.stakingPool.connect(alice).withdraw(amount, currentRound + 1)
      ).to.be.revertedWith('NotInitiatedRound');
    });
  });

  context('stake and withdraw scenario', async () => {
    const stakeAmount = utils.parseEther('1');

    beforeEach('time passes and alice stakes', async () => {
      const tx = await testEnv.stakingAsset
        .connect(alice)
        .approve(testEnv.stakingPool.address, RAY);

      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);
    });

    it('alice withdraw all', async () => {
      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const currentRound = await testEnv.stakingPool.currentPoolID();

      const withdrawTx = await testEnv.stakingPool
        .connect(alice)
        .withdraw(stakeAmount, currentRound);

      const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(withdrawTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('alice withdraw all and stake again', async () => {
      const currentRound = await testEnv.stakingPool.currentPoolID();
      await testEnv.stakingPool.connect(alice).withdraw(stakeAmount, currentRound);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);

      const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount, currentRound);

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

    it('first stake, second stake from alice, and withdraw max', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const currentRound = await testEnv.stakingPool.currentPoolID();

      const withdrawAllTx = await testEnv.stakingPool
        .connect(alice)
        .withdraw(ethers.constants.MaxUint256, currentRound);

      const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(withdrawAllTx),
        ethers.constants.MaxUint256
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('alice and bob stake, and alice withdraws partial', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2), 1);
      await testEnv.stakingPool.connect(bob).stake(stakeAmount, 1);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const currentRound = await testEnv.stakingPool.currentPoolID();

      const withdrawTx = await testEnv.stakingPool
        .connect(alice)
        .withdraw(stakeAmount, currentRound);

      const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(withdrawTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });
  });

  context('withdraw previous round principal', async () => {
    const stakeAmount = utils.parseEther('100');

    const secondRound = {
      rewardPersecond: BigNumber.from(utils.parseEther('1')),
      year: BigNumber.from(2023),
      month: BigNumber.from(7),
      day: BigNumber.from(7),
      duration: BigNumber.from(30).mul(SECONDSPERDAY),
    };
    const secondRoundStartTimestamp = toTimestamp(
      secondRound.year,
      secondRound.month,
      secondRound.day,
      BigNumber.from(10)
    );

    beforeEach('init the second round and time passes', async () => {
      await testEnv.stakingAsset
        .connect(alice)
        .approve(testEnv.stakingPool.address, RAY);

      const tx = await testEnv.stakingAsset
        .connect(bob)
        .approve(testEnv.stakingPool.address, RAY);

      await advanceTimeTo(await getTimestamp(tx), startTimestamp);
      
      await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(3), 1);
      await testEnv.stakingPool.connect(bob).stake(stakeAmount.mul(2), 1);

      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      const initTx = await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(secondRound.rewardPersecond, secondRoundStartTimestamp, secondRound.duration, testEnv.rewardAsset.address);

      await advanceTimeTo(await getTimestamp(initTx), secondRoundStartTimestamp);
    });

    it('alice withdraws previous round', async () => {
      const poolDataBefore = await getPoolData(testEnv, 1);
      const userDataBefore = await getUserData(testEnv, alice, 1);
      const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(stakeAmount.mul(2), 1);

      const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(withdrawTx),
        stakeAmount.mul(2)
      );
      
      const poolDataAfter = await getPoolData(testEnv, 1);
      const userDataAfter = await getUserData(testEnv, alice, 1);
      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('revert if bob withdraws wrong amount previous round', async () => {
      await expect(
        testEnv.stakingPool.connect(bob).withdraw(stakeAmount.mul(3), 1)
      ).to.be.revertedWith('NotEnoughPrincipal'); 
    });

    it('bob withdraws previous round', async() => {
      const poolDataBefore = await getPoolData(testEnv, 1);
      const userDataBefore = await getUserData(testEnv, bob, 1);
      
      const withdrawTx = await testEnv.stakingPool.connect(bob).withdraw(stakeAmount, 1);

      const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(withdrawTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv, 1);
      const userDataAfter = await getUserData(testEnv, bob, 1);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    })

  });


  context('many pools are opened', async() => {
    const stakeAmount = utils.parseEther('20');

    const thirdRound = {
      rewardPersecond: BigNumber.from(utils.parseEther('1')),
      year: BigNumber.from(2022),
      month: BigNumber.from(7),
      day: BigNumber.from(10),
      duration: BigNumber.from(30).mul(SECONDSPERDAY),
    };
    const secondRoundStartTimestamp = toTimestamp(
      thirdRound.year,
      thirdRound.month,
      thirdRound.day,
      BigNumber.from(10)
    );

    beforeEach('pool 2 is initiated', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
      const initTx = await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(thirdRound.rewardPersecond, secondRoundStartTimestamp, thirdRound.duration, testEnv.rewardAsset.address);

      await advanceTimeTo(await getTimestamp(initTx), secondRoundStartTimestamp);
    });

    it('alice stakes in pool 1,2 and withdraw from pool 1,2', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2), 1);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2), 2);

      //pool 1
      const poolDataBefore_1 = await getPoolData(testEnv, 1);
      const userDataBefore_1 = await getUserData(testEnv, alice, 1);
      const withdrawTx_1 = await testEnv.stakingPool.connect(alice).withdraw(stakeAmount, 1);

      const [expectedPoolData_1, expectedUserData_1] = expectDataAfterWithdraw(
        poolDataBefore_1,
        userDataBefore_1,
        await getTimestamp(withdrawTx_1),
        stakeAmount
      );

      const poolDataAfter_1 = await getPoolData(testEnv, 1);
      const userDataAfter_1 = await getUserData(testEnv, alice, 1);


      //pool 2
      const poolDataBefore_2 = await getPoolData(testEnv, 2);
      const userDataBefore_2 = await getUserData(testEnv, alice, 2);
      const withdrawTx_2 = await testEnv.stakingPool.connect(alice).withdraw(stakeAmount, 2);

      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterWithdraw(
        poolDataBefore_2,
        userDataBefore_2,
        await getTimestamp(withdrawTx_2),
        stakeAmount
      );

      const poolDataAfter_2 = await getPoolData(testEnv, 2);
      const userDataAfter_2 = await getUserData(testEnv, alice, 2);


      expect(poolDataAfter_1).to.be.equalPoolData(expectedPoolData_1);
      expect(userDataAfter_1).to.be.equalUserData(expectedUserData_1);

      expect(poolDataAfter_2).to.be.equalPoolData(expectedPoolData_2);
      expect(userDataAfter_2).to.be.equalUserData(expectedUserData_2);

    });

    describe('alice stake in pool 1 and bob stake in pool 2', async () => {
      beforeEach('user stakes', async () => {
        await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2), 1);
        await testEnv.stakingPool.connect(bob).stake(stakeAmount.mul(2), 2);
      })
      

      //pool 1

      it('revert if alice withdraws from pool 2', async() => {
        await expect(
          testEnv.stakingPool.connect(alice).withdraw(stakeAmount, 2)
        ).to.be.revertedWith('NotEnoughPrincipal');
      });
      
      it('alice withdraws from pool 1', async () => {
        const poolDataBefore_1 = await getPoolData(testEnv, 1);
        const userDataBefore_1 = await getUserData(testEnv, alice, 1);
        const withdrawTx_1 = await testEnv.stakingPool.connect(alice).withdraw(stakeAmount, 1);

        const [expectedPoolData_1, expectedUserData_1] = expectDataAfterWithdraw(
          poolDataBefore_1,
          userDataBefore_1,
          await getTimestamp(withdrawTx_1),
          stakeAmount
        );

        const poolDataAfter_1 = await getPoolData(testEnv, 1);
        const userDataAfter_1 = await getUserData(testEnv, alice, 1);

        expect(poolDataAfter_1).to.be.equalPoolData(expectedPoolData_1);
        expect(userDataAfter_1).to.be.equalUserData(expectedUserData_1);
      });
      


      //pool 2
      it('revert if bob withdraws from pool 1', async() => {
        await expect(
          testEnv.stakingPool.connect(bob).withdraw(stakeAmount, 1)
        ).to.be.revertedWith('NotEnoughPrincipal');
      });


      it('bob withdraws from pool 2', async () => {
        const poolDataBefore_2 = await getPoolData(testEnv, 2);
        const userDataBefore_2 = await getUserData(testEnv, bob, 2);
        const withdrawTx_2 = await testEnv.stakingPool.connect(bob).withdraw(stakeAmount, 2);

        const [expectedPoolData_2, expectedUserData_2] = expectDataAfterWithdraw(
          poolDataBefore_2,
          userDataBefore_2,
          await getTimestamp(withdrawTx_2),
          stakeAmount
        );

        const poolDataAfter_2 = await getPoolData(testEnv, 2);
        const userDataAfter_2 = await getUserData(testEnv, bob, 2);

        expect(poolDataAfter_2).to.be.equalPoolData(expectedPoolData_2);
        expect(userDataAfter_2).to.be.equalUserData(expectedUserData_2);

      });
    });
  });
});
