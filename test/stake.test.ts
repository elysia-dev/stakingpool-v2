import { BigNumber, utils } from 'ethers';
import { waffle } from 'hardhat';
import { expect } from 'chai';
import TestEnv from './types/TestEnv';
import { RAY, SECONDSPERDAY } from './utils/constants';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, getTimestamp, toTimestamp } from './utils/time';
import { expectDataAfterStake } from './utils/expect';
import { getPoolData, getUserData } from './utils/helpers';
import { RewardAsset } from '../typechain';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.stake', () => {
  let testEnv: TestEnv;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = BigNumber.from(utils.parseEther('1'));
  const year = BigNumber.from(2022);
  const month_1 = BigNumber.from(7);
  const day_1 = BigNumber.from(7);
  const month_2 = BigNumber.from(7);
  const day_2= BigNumber.from(10);
  const month_3 = BigNumber.from(9);
  const day_3 = BigNumber.from(2);

  const duration = BigNumber.from(30).mul(SECONDSPERDAY);
  

  const startTimestamp_1 = toTimestamp(year, month_1, day_1, BigNumber.from(10));
  const startTimestamp_2 = toTimestamp(year, month_2, day_2, BigNumber.from(10));
  const startTimestamp_3 = toTimestamp(year, month_3, day_3, BigNumber.from(10));


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


  it('reverts if the round has not initiated', async () => {
    await expect(
      testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'), 1)
    ).to.be.revertedWith('InvalidPoolID');
  });

  context('when the first round initiated', async () => {
    const stakeAmount = utils.parseEther('100');

    beforeEach('init the first round', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);

      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, startTimestamp_1, duration, testEnv.rewardAsset.address);
    });

    it('reverts when pool it is not in round', async () => {
      await expect(testEnv.stakingPool.connect(alice).stake(stakeAmount, 1)).to.be.revertedWith(
        'InvalidPoolID'
      );
    });

    context('Time passes', async () => {
      beforeEach('init the first round', async () => {
        const tx = await testEnv.stakingAsset
          .connect(alice)
          .approve(testEnv.stakingPool.address, RAY);
        await advanceTimeTo(await getTimestamp(tx), startTimestamp_1);
      });

      it('reverts if user staking amount is 0', async () => {
        await expect(testEnv.stakingPool.connect(alice).stake(0, 1)).to.be.revertedWith(
          'InvalidAmount'
        );
      });

      it('success', async () => {
        const poolDataBefore = await getPoolData(testEnv);
        const userDataBefore = await getUserData(testEnv, alice);

        await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, stakeAmount);
        const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

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
    });
  });

  context("many pools are opened", async () => {
    const stakeAmount = utils.parseEther('100');

    beforeEach('init the first round and time passes', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(rewardPersecond, startTimestamp_1, duration, testEnv.rewardAsset.address);


      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      const initTx = await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(rewardPersecond, startTimestamp_2, duration, testEnv.rewardAsset.address);
      await advanceTimeTo(await getTimestamp(initTx), startTimestamp_2);

      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
    });

    it('staking pool 1, 2 are opened and stake', async () => {
      
      //pool 1 staking
      const poolDataBefore_1 = await getPoolData(testEnv, 1);
      const userDataBefore_1 = await getUserData(testEnv, alice, 1);
      const stakeTx_1 = await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

      const [expectedPoolData_1, expectedUserData_1] = expectDataAfterStake(
        poolDataBefore_1,
        userDataBefore_1,
        await getTimestamp(stakeTx_1),
        stakeAmount 
      );

      const poolDataAfter_1 = await getPoolData(testEnv, 1);
      const userDataAfter_1 = await getUserData(testEnv, alice, 1);
      
      //pool 2 staking
      const poolDataBefore_2 = await getPoolData(testEnv, 2);
      const userDataBefore_2 = await getUserData(testEnv, alice, 2);
      const stakeTx_2 = await testEnv.stakingPool.connect(alice).stake(stakeAmount, 2);


      const [expectedPoolData_2, expectedUserData_2] = expectDataAfterStake(
        poolDataBefore_2,
        userDataBefore_2,
        await getTimestamp(stakeTx_2),
        stakeAmount
      );

      const poolDataAfter_2 = await getPoolData(testEnv, 2);
      const userDataAfter_2 = await getUserData(testEnv, alice, 2);

      //expect result
      expect(poolDataAfter_1).to.be.equalPoolData(expectedPoolData_1);
      expect(userDataAfter_1).to.be.equalUserData(expectedUserData_1);

      expect(poolDataAfter_2).to.be.equalPoolData(expectedPoolData_2);
      expect(userDataAfter_2).to.be.equalUserData(expectedUserData_2);
            
    });


    it('staking pool 3 is opened, 1,2 are closed', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      const initTx = await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(rewardPersecond, startTimestamp_3, duration, testEnv.rewardAsset.address);
      await advanceTimeTo(await getTimestamp(initTx), startTimestamp_3);


      it('revert if alice stakes in closed pool', async () => {
        await expect(testEnv.stakingPool.connect(alice).stake(stakeAmount, 1)).to.be.revertedWith(
          'InvalidPoolID'
        );

        await expect(testEnv.stakingPool.connect(alice).stake(stakeAmount, 2)).to.be.revertedWith(
          'InvalidPoolID'
        );
      });
      
      it('alice stakes in opened pool', async () => {
        const opened_poolDataBefore = await getPoolData(testEnv, 3);
        const opened_userDataBefore = await getUserData(testEnv, alice, 3);
        const opened_stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount, 3);


        const [opened_expectedPoolData, opened_expectedUserData] = expectDataAfterStake(
          opened_poolDataBefore,
          opened_userDataBefore,
          await getTimestamp(opened_stakeTx),
          stakeAmount
        );

        const opened_poolDataAfter = await getPoolData(testEnv, 3);
        const opened_userDataAfter = await getUserData(testEnv, alice, 3);

        expect(opened_poolDataAfter).to.be.equalPoolData(opened_expectedPoolData);
        expect(opened_userDataAfter).to.be.equalUserData(opened_expectedUserData);
      });
      
    });
  })


  context('staking scenario', async () => {
    const stakeAmount = utils.parseEther('100');

    beforeEach('init the first round and time passes', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingPool
        .connect(deployer)
        .initNewPool(rewardPersecond, startTimestamp_1, duration, testEnv.rewardAsset.address);

      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(bob).faucet();

      const tx = await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(await getTimestamp(tx), startTimestamp_1);
    });

    it('first stake and second stake from alice', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

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

    it('first stake, second stake and third stake from alice', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, alice);
      const stakeTx = await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

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

    it('first stake, second stake from alice, third stake from bob', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, bob);
      const stakeTx = await testEnv.stakingPool.connect(bob).stake(stakeAmount, 1);

      const [expectedPoolData, expectedUserData] = expectDataAfterStake(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, bob);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

    it('first stake, second stake from alice, third stake and fourth stake from bob', async () => {
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);
      await testEnv.stakingPool.connect(alice).stake(stakeAmount, 1);
      await testEnv.stakingPool.connect(bob).stake(stakeAmount, 1);

      const poolDataBefore = await getPoolData(testEnv);
      const userDataBefore = await getUserData(testEnv, bob);
      const stakeTx = await testEnv.stakingPool.connect(bob).stake(stakeAmount, 1);

      const [expectedPoolData, expectedUserData] = expectDataAfterStake(
        poolDataBefore,
        userDataBefore,
        await getTimestamp(stakeTx),
        stakeAmount
      );

      const poolDataAfter = await getPoolData(testEnv);
      const userDataAfter = await getUserData(testEnv, bob);

      expect(poolDataAfter).to.be.equalPoolData(expectedPoolData);
      expect(userDataAfter).to.be.equalUserData(expectedUserData);
    });

  });
});
