import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterMigrate } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.migrate', () => {
  let testEnv: TestEnv;
  let firstRound: number;
  let secondRound: number;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const firstRoundInitData = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(7),
    day: BigNumber.from(7),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };

  const secondRoundInitData = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(9),
    day: BigNumber.from(7),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };

  const firstRoundStartTimestamp = toTimestamp(
    firstRoundInitData.year,
    firstRoundInitData.month,
    firstRoundInitData.day,
    BigNumber.from(10)
  );
  const secondRoundStartTimestamp = toTimestamp(
    secondRoundInitData.year,
    secondRoundInitData.month,
    secondRoundInitData.day,
    BigNumber.from(10)
  ).add(10);

  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool and init first round', async () => {
    testEnv = await loadFixture(fixture);
    await testEnv.rewardAsset.connect(deployer).transfer(testEnv.stakingPool.address, RAY);
    await testEnv.stakingPool
      .connect(deployer)
      .initNewRound(
        firstRoundInitData.rewardPersecond,
        firstRoundStartTimestamp,
        firstRoundInitData.duration
      );
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingAsset.connect(bob).faucet();
    const tx = await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
    firstRound = await testEnv.stakingPool.currentRound();
    await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
  });

  it('reverts if migrates current or scheduled round', async () => {
    await expect(testEnv.stakingPool.connect(alice).migrate(0, firstRound)).to.be.revertedWith(
      'NotInitiatedRound'
    );
    await expect(testEnv.stakingPool.connect(alice).migrate(0, firstRound + 1)).to.be.revertedWith(
      'NotInitiatedRound'
    );
  });

  context('second round initiated', async () => {
    beforeEach('user interactions and init second round', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount.mul(3));
      await testEnv.stakingPool.connect(bob).stake(amount.mul(2));
      const tx = await testEnv.stakingPool
        .connect(deployer)
        .initNewRound(
          secondRoundInitData.rewardPersecond,
          secondRoundStartTimestamp,
          secondRoundInitData.duration
        );
      await advanceTimeTo(await getTimestamp(tx), secondRoundStartTimestamp);
    });

    it('reverts if user principal in target round is 0', async () => {
      await expect(testEnv.stakingPool.connect(carol).migrate(0, firstRound)).to.be.revertedWith(
        'ZeroPrincipal'
      );
    });

    it('success when user migrate all', async () => {
      const fromPoolDataBefore = await getPoolData(testEnv, firstRound);
      const fromUserDataBefore = await getUserData(testEnv, alice, firstRound);

      const toPoolDataBefore = await getPoolData(testEnv, secondRound);
      const toUserDataBefore = await getUserData(testEnv, alice, secondRound);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(3), firstRound);

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx),
        amount.mul(3)
      );

      const fromPoolDataAfter = await getPoolData(testEnv, firstRound);
      const fromUserDataAfter = await getUserData(testEnv, alice, firstRound);

      const toPoolDataAfter = await getPoolData(testEnv, secondRound);
      const toUserDataAfter = await getUserData(testEnv, alice, secondRound);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });

    it('success when user migrate zero amount', async () => {
      const fromPoolDataBefore = await getPoolData(testEnv, firstRound);
      const fromUserDataBefore = await getUserData(testEnv, alice, firstRound);

      const toPoolDataBefore = await getPoolData(testEnv, secondRound);
      const toUserDataBefore = await getUserData(testEnv, alice, secondRound);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(0, firstRound);

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx),
        BigNumber.from(0)
      );

      const fromPoolDataAfter = await getPoolData(testEnv, firstRound);
      const fromUserDataAfter = await getUserData(testEnv, alice, firstRound);

      const toPoolDataAfter = await getPoolData(testEnv, secondRound);
      const toUserDataAfter = await getUserData(testEnv, alice, secondRound);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });

    it('success when user migrate partial amount', async () => {
      const fromPoolDataBefore = await getPoolData(testEnv, firstRound);
      const fromUserDataBefore = await getUserData(testEnv, alice, firstRound);

      const toPoolDataBefore = await getPoolData(testEnv, secondRound);
      const toUserDataBefore = await getUserData(testEnv, alice, secondRound);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), firstRound);

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx),
        amount.mul(2)
      );

      const fromPoolDataAfter = await getPoolData(testEnv, firstRound);
      const fromUserDataAfter = await getUserData(testEnv, alice, firstRound);

      const toPoolDataAfter = await getPoolData(testEnv, secondRound);
      const toUserDataAfter = await getUserData(testEnv, alice, secondRound);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });

    it('success when user migrates after staking', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount);
      const fromPoolDataBefore = await getPoolData(testEnv, firstRound);
      const fromUserDataBefore = await getUserData(testEnv, alice, firstRound);

      const toPoolDataBefore = await getPoolData(testEnv, secondRound);
      const toUserDataBefore = await getUserData(testEnv, alice, secondRound);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), firstRound);

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx),
        amount.mul(2)
      );

      const fromPoolDataAfter = await getPoolData(testEnv, firstRound);
      const fromUserDataAfter = await getUserData(testEnv, alice, firstRound);

      const toPoolDataAfter = await getPoolData(testEnv, secondRound);
      const toUserDataAfter = await getUserData(testEnv, alice, secondRound);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });
  });
});
