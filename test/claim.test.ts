import { BigNumber, ethers, utils } from 'ethers';
import { waffle } from 'hardhat';
import TestEnv from './interfaces/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterClaim } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

import { expect } from 'chai';

describe('StakingPool.claim reward', () => {
  let testEnv: TestEnv;
  let firstRound: number;
  let secondRound: number;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const firstRoundInit = {
    rewardPersecond: BigNumber.from(utils.parseEther('1')),
    year: BigNumber.from(2022),
    month: BigNumber.from(7),
    day: BigNumber.from(7),
    duration: BigNumber.from(30),
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
    duration: BigNumber.from(30),
  };
  const secondRoundStartTimestamp = toTimestamp(
    secondRoundInit.year,
    secondRoundInit.month,
    secondRoundInit.day,
    BigNumber.from(10)
  );

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
        firstRoundInit.rewardPersecond,
        firstRoundInit.year,
        firstRoundInit.month,
        firstRoundInit.day,
        firstRoundInit.duration
      );
    await testEnv.stakingAsset.connect(alice).faucet();
    await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingAsset.connect(bob).faucet();
    const tx = await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
    firstRound = await testEnv.stakingPool.currentRound();
    await advanceTimeTo(await getTimestamp(tx), firstRoundStartTimestamp);
  });

  context('first claim', async () => {
    it('reverts if invalid round', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim(firstRound + 1)).to.be.revertedWith(
        'NotInitiatedRound'
      );
    });
    it('reverts if user reward is 0', async () => {
      await expect(testEnv.stakingPool.connect(alice).claim(firstRound)).to.be.revertedWith(
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

        const claimTx = await testEnv.stakingPool.connect(alice).claim(firstRound);

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

  context('claim after another round initiated', async () => {
    beforeEach('init second round', async () => {
      await testEnv.stakingPool.connect(alice).stake(amount);
      const initTx = await testEnv.stakingPool
        .connect(deployer)
        .initNewRound(
          secondRoundInit.rewardPersecond,
          secondRoundInit.year,
          secondRoundInit.month,
          secondRoundInit.day,
          secondRoundInit.duration
        );
      secondRound = await testEnv.stakingPool.currentRound();
      await advanceTimeTo(await getTimestamp(initTx), secondRoundStartTimestamp);
    });
    it('success', async () => {
      const poolDataBefore = await getPoolData(testEnv, firstRound);
      const userDataBefore = await getUserData(testEnv, alice, firstRound);

      const claimTx = await testEnv.stakingPool.connect(alice).claim(firstRound);

      const [expectedPoolData, expectedUserData] = expectDataAfterClaim(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(claimTx)
      );

      const poolDataAfter = await getPoolData(testEnv, firstRound);
      const userDataAfter = await getUserData(testEnv, alice, firstRound);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });
  });
});
