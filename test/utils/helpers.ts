import { Wallet } from 'ethers';
import PoolData from '../types/PoolData';
import { TestEnv, MigrateTestEnv } from '../types/TestEnv';
import UserData from '../types/UserData';

export const getUserData = async (
  testEnv: TestEnv | MigrateTestEnv,
  user: Wallet,
  isNew?: boolean
): Promise<UserData> => {
  const userData = <UserData>{};
  let contractUserData;
  if("newStakingPool" in testEnv && isNew == true) {
    contractUserData = await testEnv.newStakingPool.getUserData(user.address);
    userData.userReward = await testEnv.newStakingPool.getUserReward(user.address);
  } else {
    contractUserData = await testEnv.stakingPool.getUserData(user.address);
    userData.userReward = await testEnv.stakingPool.getUserReward(user.address);
  }

  userData.rewardAssetBalance = await testEnv.rewardAsset.balanceOf(user.address);
  userData.stakingAssetBalance = await testEnv.stakingAsset.balanceOf(user.address);
  userData.userPrincipal = contractUserData.userPrincipal;
  userData.userIndex = contractUserData.userIndex;
  userData.userPreviousReward = contractUserData.userReward;
  

  return userData;
};

export const getPoolData = async (
  testEnv: TestEnv | MigrateTestEnv, 
  isNew?: boolean
) => {
  const poolData = <PoolData>{};
  let contractPoolData
  if("newStakingPool" in testEnv && isNew == true){
    contractPoolData = await testEnv.newStakingPool.getPoolData();
    poolData.stakingAssetBalance = await testEnv.stakingAsset.balanceOf(testEnv.newStakingPool.address);
    poolData.rewardAssetBalance = await testEnv.rewardAsset.balanceOf(testEnv.newStakingPool.address);
  } else {
    contractPoolData = await testEnv.stakingPool.getPoolData();
    poolData.stakingAssetBalance = await testEnv.stakingAsset.balanceOf(testEnv.stakingPool.address);
    poolData.rewardAssetBalance = await testEnv.rewardAsset.balanceOf(testEnv.stakingPool.address);
  }

  poolData.rewardPerSecond = contractPoolData.rewardPerSecond;
  poolData.rewardIndex = contractPoolData.rewardIndex;
  poolData.startTimestamp = contractPoolData.startTimestamp;
  poolData.endTimestamp = contractPoolData.endTimestamp;
  poolData.totalPrincipal = contractPoolData.totalPrincipal;
  poolData.lastUpdateTimestamp = contractPoolData.lastUpdateTimestamp;

  return poolData;
};

