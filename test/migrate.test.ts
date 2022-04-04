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

  const thirdRoundInitData = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(9),
    day: BigNumber.from(10),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };

  const fourthRoundInitData = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(10),
    day: BigNumber.from(8),
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

  const thirdRoundStartTimestamp = toTimestamp(
    thirdRoundInitData.year,
    thirdRoundInitData.month,
    thirdRoundInitData.day,
    BigNumber.from(10)
  ).add(10);

  const fourthRoundStartTimestamp = toTimestamp(
    fourthRoundInitData.year,
    fourthRoundInitData.month,
    fourthRoundInitData.day,
    BigNumber.from(10)
  ).add(10);

  const amount = ethers.utils.parseEther('100');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool and init first pool', async () => {
    testEnv = await loadFixture(fixture);
    await testEnv.rewardAsset.connect(deployer).faucet();
    await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(
        firstRoundInitData.rewardPersecond,
        firstRoundStartTimestamp,
        firstRoundInitData.duration,
        testEnv.rewardAsset.address
      );
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingAsset.connect(bob).faucet();
    const tx = await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
    await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
  });

  it('reverts if migrates current or scheduled pool', async () => {
    await expect(testEnv.stakingPool.connect(alice).migrate(0, 1, 1)).to.be.revertedWith(
      'InvalidPoolID'
    );
    await expect(testEnv.stakingPool.connect(alice).migrate(0, 1, 2)).to.be.revertedWith(
      'NotInitiatedRound'
    );

  });

  context('second pool initiated', async () => {
    beforeEach('user interactions and init second round', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount.mul(3), 1);
      await testEnv.stakingPool.connect(bob).stake(amount.mul(2), 1);
      const tx = await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          secondRoundInitData.rewardPersecond,
          secondRoundStartTimestamp,
          secondRoundInitData.duration,
          testEnv.rewardAsset.address
        );
      await advanceTimeTo(await getTimestamp(tx), secondRoundStartTimestamp);
    });

    it('reverts if user principal in target round is 0', async () => {
      await expect(testEnv.stakingPool.connect(carol).migrate(0, 1, 2)).to.be.revertedWith(
        'ZeroPrincipal'
      );

      await expect(testEnv.stakingPool.connect(carol).migrate(amount, 1, 2)).to.be.revertedWith(
        'ZeroPrincipal'
      );
    });

    it('revert if invalid pool ID', async () => {
      await expect(testEnv.stakingPool.connect(alice).migrate(amount, 2, 1)).to.be.revertedWith(
        'InvalidPoolID'
      );
    })

    it('success when user migrate all', async () => {
      const fromPoolDataBefore = await getPoolData(testEnv, 1);
      const fromUserDataBefore = await getUserData(testEnv, alice, 1);

      const toPoolDataBefore = await getPoolData(testEnv, 2);
      const toUserDataBefore = await getUserData(testEnv, alice, 2);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(3), 1, 2);

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

      const fromPoolDataAfter = await getPoolData(testEnv, 1);
      const fromUserDataAfter = await getUserData(testEnv, alice, 1);

      const toPoolDataAfter = await getPoolData(testEnv, 2);
      const toUserDataAfter = await getUserData(testEnv, alice, 2);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });

    it('success when user migrate zero amount', async () => {
      const fromPoolDataBefore = await getPoolData(testEnv, 1);
      const fromUserDataBefore = await getUserData(testEnv, alice, 1);

      const toPoolDataBefore = await getPoolData(testEnv, 2);
      const toUserDataBefore = await getUserData(testEnv, alice, 2);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(0, 1, 2);

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

      const fromPoolDataAfter = await getPoolData(testEnv, 1);
      const fromUserDataAfter = await getUserData(testEnv, alice, 1);

      const toPoolDataAfter = await getPoolData(testEnv, 2);
      const toUserDataAfter = await getUserData(testEnv, alice, 2);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });

    it('success when user migrate partial amount', async () => {
      const fromPoolDataBefore = await getPoolData(testEnv, 1);
      const fromUserDataBefore = await getUserData(testEnv, alice, 1);

      const toPoolDataBefore = await getPoolData(testEnv, 2);
      const toUserDataBefore = await getUserData(testEnv, alice, 2);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), 1, 2);

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

      const fromPoolDataAfter = await getPoolData(testEnv, 1);
      const fromUserDataAfter = await getUserData(testEnv, alice, 1);

      const toPoolDataAfter = await getPoolData(testEnv, 2);
      const toUserDataAfter = await getUserData(testEnv, alice, 2);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });

    it('success when user migrates after staking', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount, 2);
      const fromPoolDataBefore = await getPoolData(testEnv, 1);
      const fromUserDataBefore = await getUserData(testEnv, alice, 1);

      const toPoolDataBefore = await getPoolData(testEnv, 2);
      const toUserDataBefore = await getUserData(testEnv, alice, 2);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), 1, 2);

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

      const fromPoolDataAfter = await getPoolData(testEnv, 1);
      const fromUserDataAfter = await getUserData(testEnv, alice, 1);

      const toPoolDataAfter = await getPoolData(testEnv, 2);
      const toUserDataAfter = await getUserData(testEnv, alice, 2);

      expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
      expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
      expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
      expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
    });
  });


  context('third pool initiated',async () => {
    beforeEach('user interactions and init second pool', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount.mul(3), 1);

      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          secondRoundInitData.rewardPersecond,
          secondRoundStartTimestamp,
          secondRoundInitData.duration,
          testEnv.rewardAsset.address
        )
      const tx = await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          thirdRoundInitData.rewardPersecond,
          thirdRoundStartTimestamp,
          thirdRoundInitData.duration,
          testEnv.rewardAsset.address
        );
      await advanceTimeTo(await getTimestamp(tx), thirdRoundStartTimestamp);
    });

    describe('pool 1 is closed and pool 2,3 are opened', async () => {
      it('success when user stake pool 3 and migrate from pool 1 to pool 2', async () => {
        await testEnv.stakingPool.connect(alice).stake(amount.mul(3), 3);
        const fromPoolDataBefore = await getPoolData(testEnv, 1);
        const fromUserDataBefore = await getUserData(testEnv, alice, 1);

        const toPoolDataBefore = await getPoolData(testEnv, 2);
        const toUserDataBefore = await getUserData(testEnv, alice, 2);

        const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), 1, 2);

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

        const fromPoolDataAfter = await getPoolData(testEnv, 1);
        const fromUserDataAfter = await getUserData(testEnv, alice, 1);

        const toPoolDataAfter = await getPoolData(testEnv, 2);
        const toUserDataAfter = await getUserData(testEnv, alice, 2);

        expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
        expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
        expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
        expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);

      });

      it('success when user stake in pool 2 and migrate from pool 1 to pool 3', async () => {
        await testEnv.stakingPool.connect(alice).stake(amount.mul(3), 2);
        const fromPoolDataBefore = await getPoolData(testEnv, 1);
        const fromUserDataBefore = await getUserData(testEnv, alice, 1);

        const toPoolDataBefore = await getPoolData(testEnv, 3);
        const toUserDataBefore = await getUserData(testEnv, alice, 3);

        const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), 1, 3);

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

        const fromPoolDataAfter = await getPoolData(testEnv, 1);
        const fromUserDataAfter = await getUserData(testEnv, alice, 1);

        const toPoolDataAfter = await getPoolData(testEnv, 3);
        const toUserDataAfter = await getUserData(testEnv, alice, 3);

        expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
        expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
        expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
        expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
      });

      it('revert when user migrate from pool 2 to pool 3', async () => {
        await expect(testEnv.stakingPool.connect(alice).migrate(amount, 2, 3)).to.be.revertedWith(
          'InvalidPoolID'
        );
      });
    });


    describe('pool 1,2 are closed and pool 3 is opened', async () => {
      beforeEach('init third pool and time pass', async () => {
        const tx = await testEnv.stakingPool.connect(alice).stake(amount.mul(2), 2);
        await advanceTimeTo(await getTimestamp(tx), fourthRoundStartTimestamp);
      }) 
      

      it('revert when user migrate from pool 1 to pool 2', async() => {
        await expect(testEnv.stakingPool.connect(alice).migrate(amount, 1, 2)).to.be.revertedWith(
          'InvalidPoolID'
        );
      });

      it('success when user migrate from pool 2 to pool 3', async () => {
       
        const fromPoolDataBefore = await getPoolData(testEnv, 2);
        const fromUserDataBefore = await getUserData(testEnv, alice, 2);


        const toPoolDataBefore = await getPoolData(testEnv, 3);
        const toUserDataBefore = await getUserData(testEnv, alice, 3);
        const migrateTx = await testEnv.stakingPool.connect(alice).migrate(amount.mul(2), 2, 3);
  
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

        const fromPoolDataAfter = await getPoolData(testEnv, 2);
        const fromUserDataAfter = await getUserData(testEnv, alice, 2);
  
        const toPoolDataAfter = await getPoolData(testEnv, 3);
        const toUserDataAfter = await getUserData(testEnv, alice, 3);
        
        expect(fromPoolDataAfter).to.be.equalPoolData(expectedFromPoolData);
        expect(fromUserDataAfter).to.be.equalUserData(expectedFromUserData);
        expect(toPoolDataAfter).to.be.equalPoolData(expectedToPoolData);
        expect(toUserDataAfter).to.be.equalUserData(expectedToUserData);
        
      });
    });
  });
});
