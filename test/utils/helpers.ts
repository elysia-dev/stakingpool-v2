import { Wallet } from 'ethers';
import PoolData from '../types/PoolData';
import TestEnv from '../types/TestEnv';
import UserData from '../types/UserData';

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


export const getSumUserData = async (
  userBefore: UserData,
  userAfter: UserData,
): Promise<UserData> => {
  const userData = <UserData>{};

  userData.rewardAssetBalance = userBefore.rewardAssetBalance.add(userAfter.rewardAssetBalance);
  userData.stakingAssetBalance = userBefore.stakingAssetBalance.add(userAfter.stakingAssetBalance);
  userData.userPrincipal = userBefore.userPrincipal.add(userAfter.userPrincipal);
  userData.userIndex = userBefore.userIndex.add(userAfter.userIndex);
  userData.userPreviousReward = userBefore.userPreviousReward.add(userAfter.userPreviousReward)
  userData.userReward = userBefore.userReward.add(userAfter.userReward)

  return userData;
};


export const getSumPoolData = async (
  poolBefore: PoolData,
  poolAfter: PoolData,
) => {
  const poolData = <PoolData>{};

  poolData.rewardPerSecond = poolBefore.rewardPerSecond.add(poolAfter.rewardPerSecond);
  poolData.rewardIndex = poolBefore.rewardIndex.add(poolAfter.rewardIndex);
  poolData.startTimestamp = poolBefore.startTimestamp.add(poolAfter.startTimestamp);
  poolData.endTimestamp = poolBefore.endTimestamp.add(poolAfter.endTimestamp);
  poolData.totalPrincipal = poolBefore.totalPrincipal.add(poolAfter.totalPrincipal);
  poolData.lastUpdateTimestamp = poolBefore.lastUpdateTimestamp.add(poolAfter.lastUpdateTimestamp);
  poolData.stakingAssetBalance = poolBefore.stakingAssetBalance.add(poolAfter.stakingAssetBalance);
  poolData.rewardAssetBalance = poolBefore.rewardAssetBalance.add(poolAfter.rewardAssetBalance);

  return poolData;
};
