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
    month: BigNumber.from(9),
    day: BigNumber.from(7),
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
    month: BigNumber.from(7),
    day: BigNumber.from(10),
    duration: BigNumber.from(30).mul(SECONDSPERDAY),
  };
  const thirdRoundStartTimestamp = toTimestamp(
    secondRoundInit.year,
    secondRoundInit.month,
    secondRoundInit.day,
    BigNumber.from(10)
  );

  const amount = ethers.utils.parseEther('100');

  async function fixture() {
    return await setTestEnv();
  }

  after(async () => {
    await loadFixture(fixture);
  });

  beforeEach('deploy staking pool and init first round', async () => {
    testEnv = await loadFixture(fixture);

    await testEnv.rewardAsset.connect(deployer).faucet();
    await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(
        firstRoundInit.rewardPersecond,
        firstRoundStartTimestamp,
        firstRoundInit.duration,
        testEnv.rewardAsset.address
      );
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    const tx = await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
  });

  context('pool 1 stake and claim', async () => {
    it('reverts if invalid round', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim(2)).to.be.revertedWith(
        'NotInitiatedRound'
      );
    });

    it('reverts if user reward is 0', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim(1)).to.be.revertedWith(
        'ZeroReward'
      );
    });

    context('user stakes ', async () => {
      beforeEach('user stakes', async () => {
        await testEnv.stakingPool.connect(alice).stake(amount, 1);
      });

      it('reverts if user reward is 0', async () => {
        await expect(testEnv.stakingPool.connect(bob).claim(1)).to.be.revertedWith(
          'ZeroReward'
        );
      });

      it('success', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        const claimTx = await testEnv.stakingPool.connect(alice).claim(1);

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

  context('pool 1, 2 are opened', async () => {
    beforeEach('init pool and user stakes', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount, 1);
      const initTx = await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(
        thirdRoundInit.rewardPersecond,
        thirdRoundStartTimestamp,
        thirdRoundInit.duration,
        testEnv.rewardAsset.address
      );
      await advanceTimeTo(await getTimestamp(initTx), thirdRoundStartTimestamp);
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool.connect(alice).stake(amount, 2);
    });


    it('revert if invalid round', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim(3)).to.be.revertedWith(
        'NotInitiatedRound'
      );
    });
    

    it('pool 1 claim', async () => {
      const poolDataBefore = await getPoolData(testEnv, 1);
      const userDataBefore = await getUserData(testEnv, alice, 1);

      const claimTx = await testEnv.stakingPool.connect(alice).claim(1);

      const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv, 1);
      const userDataAfter = await getUserData(testEnv, alice, 1);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('pool 2 claim', async () => {
      const poolDataBefore = await getPoolData(testEnv, 2);
      const userDataBefore = await getUserData(testEnv, alice, 2);

      const claimTx = await testEnv.stakingPool.connect(alice).claim(2);

      const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv, 2);
      const userDataAfter = await getUserData(testEnv, alice, 2);
      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });
  });




  context('pool 1 is closed and pool 2 is opened', async () => {
    beforeEach('init second pool', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount, 1);
      const initTx = await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(
          secondRoundInit.rewardPersecond,
          secondRoundStartTimestamp,
          secondRoundInit.duration,
          testEnv.rewardAsset.address
        );
      await advanceTimeTo(await getTimestamp(initTx), secondRoundStartTimestamp);
    });

    it('pool 1 claim', async () => {
      const poolDataBefore = await getPoolData(testEnv, 1);
      const userDataBefore = await getUserData(testEnv, alice, 1);

      const claimTx = await testEnv.stakingPool.connect(alice).claim(1);

      const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv, 1);
      const userDataAfter = await getUserData(testEnv, alice, 1);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });
  });
});
