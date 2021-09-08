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
    duration: BigNumber.from(30),
  };

  const startTimestamp = toTimestamp(
    firstRound.year,
    firstRound.month,
    firstRound.day,
    BigNumber.from(10)
  );
  const endTimestamp = startTimestamp.add(BigNumber.from(SECONDSPERDAY).mul(firstRound.duration));

  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await loadFixture(fixture);
    await testEnv.stakingAsset.connect(alice).faucet();
  });

  beforeEach('deploy staking pool and init first round', async () => {
    testEnv = await setTestEnv();

    await testEnv.stakingPool
      .connect(deployer)
      .initNewRound(
        firstRound.rewardPersecond,
        firstRound.year,
        firstRound.month,
        firstRound.day,
        firstRound.duration
      );
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingAsset.connect(bob).faucet();
    await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
  });

  context('when the first round initiated', async () => {
    it('reverts if withdrawl amount exceeds principal', async () => {
      const currentRound = await testEnv.stakingPool.currentRound();
      await expect(
        testEnv.stakingPool.connect(alice).withdraw(amount, currentRound)
      ).to.be.revertedWith('NotEnoughPrincipal');
    });

    it('reverts if target round is before initiation', async () => {
      const currentRound = await testEnv.stakingPool.currentRound();

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
      await testEnv.stakingPool.connect(alice).stake(stakeAmount);
    });

    it('alice withdraw all', async () => {
      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const currentRound = await testEnv.stakingPool.currentRound();

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
      const currentRound = await testEnv.stakingPool.currentRound();
      await testEnv.stakingPool.connect(alice).withdraw(stakeAmount, currentRound);

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
      const currentRound = await testEnv.stakingPool.currentRound();

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
      await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(2));
      await testEnv.stakingPool.connect(bob).stake(stakeAmount);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const currentRound = await testEnv.stakingPool.currentRound();

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
      duration: BigNumber.from(30),
    };
    const secondRoundStartTimestamp = toTimestamp(
      secondRound.year,
      secondRound.month,
      secondRound.day,
      BigNumber.from(10)
    );
    let first: number;
    let second: number;

    beforeEach('init the second round and time passes', async () => {
      const tx = await testEnv.stakingAsset
        .connect(alice)
        .approve(testEnv.stakingPool.address, RAY);
      first = await testEnv.stakingPool.currentRound();

      await advanceTimeTo(await getTimestamp(tx), startTimestamp);

      await testEnv.stakingPool.connect(alice).stake(stakeAmount.mul(3));
      await testEnv.stakingPool.connect(bob).stake(stakeAmount.mul(2));

      const initTx = await testEnv.stakingPool
        .connect(deployer)
        .initNewRound(
          secondRound.rewardPersecond,
          secondRound.year,
          secondRound.month,
          secondRound.day,
          secondRound.duration
        );
      second = await testEnv.stakingPool.currentRound();

      await advanceTimeTo(await getTimestamp(initTx), secondRoundStartTimestamp);
    });

    it('alice withdraws previous round', async () => {
      const poolDataBefore = await getPoolData(testEnv, first);
      const userDataBefore = await getUserData(testEnv, alice, first);
      const withdrawTx = await testEnv.stakingPool.connect(alice).withdraw(stakeAmount, first);

      const [expectedPoolData, expectedUserData] = expectDataAfterWithdraw(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(withdrawTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv, first);
      const userDataAfter = await getUserData(testEnv, alice, first);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });
  });
});
