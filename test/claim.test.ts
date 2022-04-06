import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterClaim } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';
import TestEnv from './types/TestEnv';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.claim', () => {
  let testEnv: TestEnv;
  let firstRound: number;
  let secondRound: number;

  const provider = waffle.provider;
  const [deployer, alice, bob] = provider.getWallets();

  const firstRoundInit = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(7),
    day: BigNumber.from(7),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };
  const firstRoundStartTimestamp = toTimestamp(
    firstRoundInit.year,
    firstRoundInit.month,
    firstRoundInit.day,
    BigNumber.from(10)
  );
  const secondRoundInit = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(7),
    day: BigNumber.from(8),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };
  const secondRoundStartTimestamp = toTimestamp(
    secondRoundInit.year,
    secondRoundInit.month,
    secondRoundInit.day,
    BigNumber.from(10)
  );

  const thirdRoundInit = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(8),
    day: BigNumber.from(20),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };
  const thirdRoundStartTimestamp = toTimestamp(
    thirdRoundInit.year,
    thirdRoundInit.month,
    thirdRoundInit.day,
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
          firstRoundInit.rewardPersecond,
          firstRoundStartTimestamp,
          firstRoundInit.duration
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
          await getTimestamp(claimTx)
        );

        const poolDataAfter = await getPoolData(testEnv);
        const userDataAfter = await getUserData(testEnv, alice);

        expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
        expect(userDataAfter).to.be.equalUserData(expectedUserData);
      });
    });
  });


  context('claim after pool is closed', async () => {
    beforeEach('deploy staking pool and init the pool', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          firstRoundInit.rewardPersecond,
          firstRoundStartTimestamp,
          firstRoundInit.duration
        );
      await testEnv.stakingAsset.connect(alice).faucet();
      const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
      await testEnv.stakingPool.connect(alice).stake(amount);
    });

    it('pool is closed and alice claim reward', async () => {
      const tx = await testEnv.stakingPool.connect(deployer).closePool();
      await advanceTimeTo(await getTimestamp(tx), secondRoundStartTimestamp);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);

      const claimTx = await testEnv.stakingPool.connect(alice).claim();

      const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('pool is closed and alice claim reward after time passes', async () => {
      await testEnv.stakingPool.connect(deployer).closePool();

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);

      const claimTx = await testEnv.stakingPool.connect(alice).claim();
      await advanceTimeTo(await getTimestamp(claimTx), thirdRoundStartTimestamp);

      const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, alice);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    // TODO if pool is colosed reward is not increased
    
    // it('if pool is closed, reward is not increased', async () => {
    //   const poolDataBefore = await getPoolData(testEnv);
    //   const userDataBefore = await getUserData(testEnv, alice);
    //   const claimTxBefore = await testEnv.stakingPool.connect(alice).claim();
    //   await advanceTimeTo(await getTimestamp(claimTxBefore), secondRoundStartTimestamp);

    //   const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
    //     poolDataBefore,
    //     userDataBefore,
    //     await getTimestamp(claimTxBefore)
    //   );

    //   const closeTx = await testEnv.stakingPool.connect(deployer).closePool();
    //   await advanceTimeTo(await getTimestamp(closeTx), secondRoundStartTimestamp);
      
    //   const claimTx = await testEnv.stakingPool.connect(alice).claim();
    //   await advanceTimeTo(await getTimestamp(claimTx), thirdRoundStartTimestamp);

    //   const poolDataAfter = await getPoolData(testEnv);
    //   const userDataAfter = await getUserData(testEnv, alice);

    //   expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
    //   expect(userDataAfter).to.be.equalUserData(expectedUserData);
      
    // });
  });

});
