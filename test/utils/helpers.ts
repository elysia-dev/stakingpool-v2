import { Wallet } from 'ethers';
import PoolData from '../types/PoolData';
import TestEnv from '../types/TestEnv';
import TestNextVersionEnv from '../types/TestNextVersionEnv';
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


export const getUserData_ = async (
  testNextVersionEnv: TestNextVersionEnv,
  user: Wallet,
): Promise<UserData> => {
  const userData = <UserData>{};
  console.log('nextVersion user Data');

  const contractUserData = await testNextVersionEnv.stakingPool.getUserData(user.address);

  userData.rewardAssetBalance = await testNextVersionEnv.rewardAsset.balanceOf(user.address);
  userData.stakingAssetBalance = await testNextVersionEnv.stakingAsset.balanceOf(user.address);
  userData.userPrincipal = contractUserData.userPrincipal;
  userData.userIndex = contractUserData.userIndex;
  userData.userPreviousReward = contractUserData.userReward;
  userData.userReward = await testNextVersionEnv.stakingPool.getUserReward(user.address);

  return userData;
};

export const getPoolData_ = async (testNextVersionEnv: TestNextVersionEnv) => {
  console.log('nextVersion pool Data');
  const poolData = <PoolData>{};
  const contractPoolData = await testNextVersionEnv.stakingPool.getPoolData();

  poolData.rewardPerSecond = contractPoolData.rewardPerSecond;
  poolData.rewardIndex = contractPoolData.rewardIndex;
  poolData.startTimestamp = contractPoolData.startTimestamp;
  poolData.endTimestamp = contractPoolData.endTimestamp;
  poolData.totalPrincipal = contractPoolData.totalPrincipal;
  poolData.lastUpdateTimestamp = contractPoolData.lastUpdateTimestamp;
  poolData.stakingAssetBalance = await testNextVersionEnv.stakingAsset.balanceOf(testNextVersionEnv.stakingPool.address);
  poolData.rewardAssetBalance = await testNextVersionEnv.rewardAsset.balanceOf(testNextVersionEnv.stakingPool.address);

  return poolData;
};
