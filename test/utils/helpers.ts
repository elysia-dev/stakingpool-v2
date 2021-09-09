import { Wallet } from 'ethers';
import PoolData from '../types/PoolData';
import TestEnv from '../interfaces/TestEnv';
import UserData from '../types/UserData';

export const getUserData = async (
  testEnv: TestEnv,
  user: Wallet,
  round?: number
): Promise<UserData> => {
  const userData = <UserData>{};
  const roundToGet = !round ? await testEnv.stakingPool.currentRound() : round;

  const contractUserData = await testEnv.stakingPool.getUserData(roundToGet, user.address);

  userData.rewardAssetBalance = await testEnv.rewardAsset.balanceOf(user.address);
  userData.stakingAssetBalance = await testEnv.stakingAsset.balanceOf(user.address);
  userData.userPrincipal = contractUserData.userPrincipal;
  userData.userIndex = contractUserData.userIndex;
  userData.userPreviousReward = contractUserData.userReward;
  userData.userReward = await testEnv.stakingPool.getUserReward(user.address, roundToGet);

  return userData;
};

export const getPoolData = async (testEnv: TestEnv, round?: number) => {
  const poolData = <PoolData>{};
  const roundToGet = !round ? await testEnv.stakingPool.currentRound() : round;

  const contractPoolData = await testEnv.stakingPool.getPoolData(roundToGet);

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
