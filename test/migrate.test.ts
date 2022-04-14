import { BigNumber, ethers, utils } from 'ethers';
import hre, { waffle } from 'hardhat';
import { expect } from 'chai';
import { TestEnv, MigrateTestEnv } from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv, setMigrateTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterMigrate, expectDataAfterStake, expectDataAfterClaim, expectDataAfterWithdraw  } from './utils/expect';
import { getPoolData, getUserData, newGetPoolData, newGetUserData} from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.migrate', () => {
  let testEnv: MigrateTestEnv;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const duration = BigNumber.from(30).mul(SECONDSPERDAY);
  
  const month_2 = BigNumber.from(7);
  const day_2 = BigNumber.from(28);

  const firstRoundStartTimestamp = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const secondRoundStartTimestamp = toTimestamp(year, month_2, day_2,BigNumber.from(10));

  const amount = ethers.utils.parseEther('1');

  async function fixture() {
    return await setTestEnv();
  }

  // async function fixture() {
  //   return await setMigrateTestEnv();
  // }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool', async () => {
    testEnv = await setMigrateTestEnv(await loadFixture(fixture));
    // testEnv = await loadFixture(fixture);
  });

  context('alice migrates asset to next version staking pool', async () => {
    beforeEach('init the pool and alice stakes', async () => {
      // current staking pool
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
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(firstRoundStartTimestamp);
      await testEnv.stakingPool.connect(alice).stake(amount);
       // time passes and next version staking pool
      await advanceTimeTo(secondRoundStartTimestamp);
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.newStakingPool.address, RAY);
      await testEnv.newStakingPool
        .connect(deployer)
        .initNewPool(
          rewardPersecond,
          secondRoundStartTimestamp,
          duration
        );
      await testEnv.stakingAsset.connect(alice).approve(testEnv.newStakingPool.address, RAY);
      await testEnv.stakingPool.connect(alice).stake(amount);
    });

    it('revert if a pertson not admin set next contract address', async () => {
      await expect(testEnv.stakingPool.connect(alice).setNextContractAddr(
        testEnv.stakingPool.address)
        ).to.be.revertedWith('OnlyAdmin');
    });

    it('migrate asset to next version staking pool', async () => {
      await testEnv.stakingPool.connect(deployer).closePool();
      await testEnv.stakingPool
        .connect(deployer)
        .setNextContractAddr(testEnv.newStakingPool.address);
      const fromPoolDataBefore = await getPoolData(testEnv);
      const fromUserDataBefore = await getUserData(testEnv, alice);

      const toPoolDataBefore = await newGetPoolData(testEnv);
      const toUserDataBefore = await newGetUserData(testEnv, alice);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate();

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx)
      );

      const fromPoolDataAfter = await getPoolData(testEnv);
      const fromUserDataAfter = await getUserData(testEnv, alice);

      const toPoolDataAfter = await newGetPoolData(testEnv);
      const toUserDataAfter = await newGetUserData(testEnv, alice);

      expect(fromPoolDataAfter).eql(expectedFromPoolData);
      expect(fromUserDataAfter).eql(expectedFromUserData);
      expect(toPoolDataAfter).eql(expectedToPoolData);
      expect(toUserDataAfter).eql(expectedToUserData);
    });

    it('bob stakes and migrate asset to next version staking pool', async () => {
      await testEnv.stakingAsset.connect(bob).faucet();
      await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool.connect(bob).stake(amount);
      await testEnv.stakingPool.connect(deployer).closePool();
      await testEnv.stakingPool
        .connect(deployer)
        .setNextContractAddr(testEnv.newStakingPool.address);
      const fromPoolDataBefore = await getPoolData(testEnv);
      const fromUserDataBefore = await getUserData(testEnv, alice);

      const toPoolDataBefore = await newGetPoolData(testEnv);
      const toUserDataBefore = await newGetUserData(testEnv, alice);

      const migrateTx = await testEnv.stakingPool.connect(alice).migrate();

      const [
        [expectedFromPoolData, expectedFromUserData],
        [expectedToPoolData, expectedToUserData],
      ] = expectDataAfterMigrate(
        fromPoolDataBefore,
        fromUserDataBefore,
        toPoolDataBefore,
        toUserDataBefore,
        await getTimestamp(migrateTx)
      );

      const fromPoolDataAfter = await getPoolData(testEnv);
      const fromUserDataAfter = await getUserData(testEnv, alice);

      const toPoolDataAfter = await newGetPoolData(testEnv);
      const toUserDataAfter = await newGetUserData(testEnv, alice);

      expect(fromPoolDataAfter).eql(expectedFromPoolData);
      expect(fromUserDataAfter).eql(expectedFromUserData);
      expect(toPoolDataAfter).eql(expectedToPoolData);
      expect(toUserDataAfter).eql(expectedToUserData);
    });

    it('alice migrates asset to next version staking pool and stakes, claims in next version staking pool', async () => {
      await testEnv.stakingPool.connect(deployer).closePool();
      await testEnv.stakingPool
        .connect(deployer)
        .setNextContractAddr(testEnv.newStakingPool.address);
      await testEnv.stakingPool.connect(alice).migrate();


      // stake test
      const poolDataBeforeStake = await newGetPoolData(testEnv);
      const userDataBeforeStake = await newGetUserData(testEnv, alice);
      const stakeTx = await testEnv.newStakingPool.connect(alice).stake(amount);
      const [expectedPoolDataStake, expectedUserDataStake] = expectDataAfterStake(
        poolDataBeforeStake,
        userDataBeforeStake,
        await getTimestamp(stakeTx),
        amount
      );

      const poolDataAfterStake = await newGetPoolData(testEnv);
      const userDataAfterStake = await newGetUserData(testEnv, alice);

      expect(poolDataAfterStake).eql(expectedPoolDataStake);
      expect(userDataAfterStake).eql(expectedUserDataStake);

      // claim test
      const poolDataBeforeClaim = await newGetPoolData(testEnv);
      const userDataBeforeClaim = await newGetUserData(testEnv, alice);
      const claimTx = await testEnv.newStakingPool.connect(alice).claim();
      const [expectedPoolDataClaim, expectedUserDataClaim] = expectDataAfterClaim(
        poolDataBeforeClaim,
        userDataBeforeClaim,
        await getTimestamp(claimTx)
      );
      const poolDataAfterClaim = await newGetPoolData(testEnv);
      const userDataAfterClaim = await newGetUserData(testEnv, alice);

      expect(poolDataAfterClaim).to.be.equalPoolData(expectedPoolDataClaim);
      expect(userDataAfterClaim).to.be.equalUserData(expectedUserDataClaim);
    });

    it('alice migrates asset to next version staking pool and stakes, withdraw in next version staking pool', async () => {
      await testEnv.stakingPool.connect(deployer).closePool();
      await testEnv.stakingPool
        .connect(deployer)
        .setNextContractAddr(testEnv.newStakingPool.address);
      await testEnv.stakingPool.connect(alice).migrate();


      // stake test
      const poolDataBeforeStake = await newGetPoolData(testEnv);
      const userDataBeforeStake = await newGetUserData(testEnv, alice);
      const stakeTx = await testEnv.newStakingPool.connect(alice).stake(amount.mul(2));
      const [expectedPoolDataStake, expectedUserDataStake] = expectDataAfterStake(
        poolDataBeforeStake,
        userDataBeforeStake,
        await getTimestamp(stakeTx),
        amount.mul(2)
      );

      const poolDataAfterStake = await newGetPoolData(testEnv);
      const userDataAfterStake = await newGetUserData(testEnv, alice);

      expect(poolDataAfterStake).eql(expectedPoolDataStake);
      expect(userDataAfterStake).eql(expectedUserDataStake);

      // withdraw test
      const poolDataBeforeWithdraw = await newGetPoolData(testEnv);
      const userDataBeforeWithdraw = await newGetUserData(testEnv, alice);
      const withdrawTx = await testEnv.newStakingPool.connect(alice).withdraw(amount);
      const [expectedPoolDataWithdraw, expectedUserDataWithdraw] = expectDataAfterWithdraw(
        poolDataBeforeWithdraw,
        userDataBeforeWithdraw,
        await getTimestamp(withdrawTx),
        amount
      );
      const poolDataAfterWithdraw = await newGetPoolData(testEnv);
      const userDataAfterWithdraw = await newGetUserData(testEnv, alice);

      expect(poolDataAfterWithdraw).to.be.equalPoolData(expectedPoolDataWithdraw);
      expect(userDataAfterWithdraw).to.be.equalUserData(expectedUserDataWithdraw);
    });
  });
});
