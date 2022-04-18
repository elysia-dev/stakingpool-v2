import { MAX_UINT_AMOUNT } from './constants';
import { BigNumber, Wallet, ethers } from 'ethers';
import PoolData from '../types/PoolData';
import TestEnv from '../types/TestEnv';
import UserData from '../types/UserData';

export type TestHelperActions = {
  faucetAndApproveTarget: (wallet: Wallet, amount?: string) => Promise<void>
  faucetAndApproveReward: (wallet: Wallet, amount?: string) => Promise<void>
  stake: (wallet: Wallet, amount: BigNumber) => Promise<ethers.ContractTransaction>
  withdraw: (wallet: Wallet, amount: BigNumber) => Promise<ethers.ContractTransaction>
  claim: (wallet: Wallet) => Promise<ethers.ContractTransaction>
  initNewPool: (
    wallet: Wallet,
    rewardPerSecond: BigNumber,
    startTimestamp: BigNumber,
    duration: BigNumber,
  ) => Promise<ethers.ContractTransaction>
  closePool: (wallet: Wallet) => Promise<ethers.ContractTransaction>

  // Queries
  getUserData: (wallet: Wallet) => Promise<UserData>
  getPoolData: () => Promise<PoolData>
}

export const createTestActions = (testEnv: TestEnv): TestHelperActions => {
  // A target is the token staked.
  const faucetAndApproveTarget = async (
    wallet: Wallet,
    amount?: string,
  ) => {
    if (amount === undefined) {
      amount = MAX_UINT_AMOUNT;
    }
    await testEnv.stakingAsset.connect(wallet).faucet();
    await testEnv.stakingAsset.connect(wallet).approve(testEnv.stakingPool.address, amount);
  }

  const faucetAndApproveReward = async (
    wallet: Wallet,
    amount?: string,
  ) => {
    if (amount === undefined) {
      amount = MAX_UINT_AMOUNT;
    }
    await testEnv.rewardAsset.connect(wallet).faucet();
    await testEnv.rewardAsset.connect(wallet).approve(testEnv.stakingPool.address, amount);
  }

  const stake = (
    wallet: Wallet,
    amount: BigNumber,
  ) => {
    return testEnv.stakingPool.connect(wallet).stake(amount);
  }

  const initNewPool = async (
    wallet: Wallet,
    rewardPerSecond: BigNumber,
    startTimestamp: BigNumber,
    duration: BigNumber,
  ) => (
    testEnv.stakingPool
      .connect(wallet)
      .initNewPool(rewardPerSecond, startTimestamp, duration)
  )

  const closePool = (
    wallet: Wallet,
  ) => testEnv.stakingPool.connect(wallet).closePool();

  const claim = (
    wallet: Wallet
  ) => testEnv.stakingPool.connect(wallet).claim();

  const withdraw = (
    wallet: Wallet,
    amount: BigNumber,
  ) => testEnv.stakingPool.connect(wallet).withdraw(amount);

  const getUserData = (wallet: Wallet) => _getUserData(testEnv, wallet);

  const getPoolData = () => _getPoolData(testEnv);

  return {
    faucetAndApproveReward,
    faucetAndApproveTarget,
    stake,
    withdraw,
    claim,
    initNewPool,
    closePool,
    getUserData,
    getPoolData,
  }
}

const _getUserData = async (
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

const _getPoolData = async (testEnv: TestEnv) => {
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

export const getUserData = _getUserData;
export const getPoolData = _getPoolData;
