import { BigNumber, Wallet, ethers } from 'ethers';
import PoolData from '../types/PoolData';
import TestEnv from '../types/TestEnv';
import UserData from '../types/UserData';

export type TestHelperActions = {
  faucetAndApproveTarget: (wallet: ethers.Wallet, amount: string) => Promise<void>
  faucetAndApproveReward: (wallet: ethers.Wallet, amount: string) => Promise<void>
  stake: (wallet: ethers.Wallet, amount: BigNumber) => Promise<ethers.ContractTransaction>
  initNewPool: (
    wallet: ethers.Wallet,
    rewardPerSecond: BigNumber,
    startTimestamp: BigNumber,
    duration: BigNumber,
  ) => Promise<ethers.ContractTransaction>
  closePool: (wallet: ethers.Wallet) => Promise<ethers.ContractTransaction>
}

export const createTestActions = (testEnv: TestEnv): TestHelperActions => {
  // A target is the token staked.
  const faucetAndApproveTarget = async (
    wallet: ethers.Wallet,
    amount: string,
  ) => {
    await testEnv.stakingAsset.connect(wallet).faucet();
    await testEnv.stakingAsset.connect(wallet).approve(testEnv.stakingPool.address, amount);
  }

  const faucetAndApproveReward = async (
    wallet: ethers.Wallet,
    amount: string,
  ) => {
    await testEnv.rewardAsset.connect(wallet).faucet();
    await testEnv.rewardAsset.connect(wallet).approve(testEnv.stakingPool.address, amount);
  }

  const stake = (
    wallet: ethers.Wallet,
    amount: BigNumber,
  ) => {
    return testEnv.stakingPool.connect(wallet).stake(amount);
  }

  const initNewPool = async (
    wallet: ethers.Wallet,
    rewardPerSecond: BigNumber,
    startTimestamp: BigNumber,
    duration: BigNumber,
  ) => (
    testEnv.stakingPool
      .connect(wallet)
      .initNewPool(rewardPerSecond, startTimestamp, duration)
  )

  const closePool = (
    wallet: ethers.Wallet,
  ) => testEnv.stakingPool.connect(wallet).closePool();

  return {
    faucetAndApproveReward,
    faucetAndApproveTarget,
    stake,
    initNewPool,
    closePool,
  }
}

export const getUserData = async (
  testEnv: TestEnv,
  user: Wallet,
): Promise<UserData> => {
  const userData = <UserData>{};

  const contractUserData = await testEnv.stakingPool.getUserData(user.address);

  userData.rewardAssetBalance = await testEnv.rewardAsset.balanceOf(user.address);
  userData.stakingAssetBalance = await testEnv.stakingAsset.balanceOf(user.address);
  userData.userPrincipal = contractUserData.userPrincipal;
  userData.userIndex = contractUserData.userIndex;
  userData.userPreviousReward = contractUserData.userReward;
  userData.userReward = await testEnv.stakingPool.getUserReward(user.address);

  return userData;
};

export const getPoolData = async (testEnv: TestEnv) => {
  const poolData = <PoolData>{};
  const contractPoolData = await testEnv.stakingPool.getPoolData();

  poolData.rewardPerSecond = contractPoolData.rewardPerSecond;
  poolData.rewardIndex = contractPoolData.rewardIndex;
  poolData.startTimestamp = contractPoolData.startTimestamp;
  poolData.endTimestamp = contractPoolData.endTimestamp;
  poolData.totalPrincipal = contractPoolData.totalPrincipal;
  poolData.lastUpdateTimestamp = contractPoolData.lastUpdateTimestamp;
  poolData.stakingAssetBalance = await testEnv.stakingAsset.balanceOf(testEnv.stakingPool.address);
  poolData.rewardAssetBalance = await testEnv.rewardAsset.balanceOf(testEnv.stakingPool.address);

  return poolData;
};
