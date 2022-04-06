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
      testEnv.stakingPool.connect(alice).withdraw(amount)
    ).to.be.revertedWith('StakingNotInitiated');
  });

  context('when the pool initiated', async () => {
    beforeEach('deploy staking pool and init pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(firstRound.rewardPersecond, startTimestamp, firstRound.duration);
      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(bob).faucet();
      await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
    });

    it('reverts if withdrawl amount exceeds principal', async () => {
      await expect(
        testEnv.stakingPool.connect(alice).withdraw(amount)
      ).to.be.revertedWith('NotEnoughPrincipal');
    });

    context('stake and withdraw scenario', async () => {
      const stakeAmount = utils.parseEther('1');

      beforeEach('time passes and alice stakes', async () => {  
        const tx = await testEnv.stakingAsset
          .connect(alice)
          .approve(testEnv.stakingPool.address, RAY);

        await advanceTimeTo(await getTimestamp(tx), startTimestamp);
        await testEnv.stakingPool.connect(alice).stake(stakeAmount);
      });

      it('alice withdraw all', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);
      
        const withdrawTx = await testEnv.stakingPool
          .connect(alice)
          .withdraw(stakeAmount);

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
        await testEnv.stakingPool.connect(alice).withdraw(stakeAmount);

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
          ethers.constants.MaxUint256
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
          stakeAmount
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });
  });

});
