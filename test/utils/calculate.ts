import { BigNumber, constants } from 'ethers';
import PoolData from '../types/PoolData';
import UserData from '../types/UserData';
import { WAD } from '../utils/constants';
import { wadMul, wadDiv } from '../utils/math';

export function calculateRewardIndex(poolData: PoolData, txTimeStamp: BigNumber): BigNumber {
  const currentTimestamp = txTimeStamp.lt(poolData.endTimestamp)
    ? txTimeStamp
    : poolData.endTimestamp;

  const timeDiff = currentTimestamp.sub(poolData.lastUpdateTimestamp);

  if (timeDiff.eq(0)) {
    return poolData.rewardIndex;
  }

  if (poolData.totalPrincipal.eq(0)) {
    return poolData.rewardIndex;
  }

  const rewardIndexDiff = wadDiv(
    timeDiff.mul(poolData.rewardPerSecond),
    poolData.totalPrincipal
  );

  return poolData.rewardIndex.add(rewardIndexDiff);
}

export function calculateUserReward(
  poolData: PoolData,
  userData: UserData,
  txTimeStamp: BigNumber
): BigNumber {
  const indexDiff = calculateRewardIndex(poolData, txTimeStamp).sub(userData.userIndex);
  const balance = userData.userPrincipal;
  const rewardAdded = wadMul(balance, indexDiff);
  const result = userData.userPreviousReward.add(rewardAdded);

  return result;
}


export function calculateDataAfterUpdate(
  poolData: PoolData,
  userData: UserData,
  txTimestamp: BigNumber,
  skipUpdateUser: boolean = false,
): [PoolData, UserData] {
  const newPoolData = { ...poolData } as PoolData;
  const newUserData = { ...userData } as UserData;

  const newIndex = calculateRewardIndex(poolData, txTimestamp);
  newPoolData.rewardIndex = newIndex;
  newPoolData.lastUpdateTimestamp = txTimestamp.lt(poolData.endTimestamp)
    ? txTimestamp
    : poolData.endTimestamp;

  const newUserReward = calculateUserReward(poolData, userData, txTimestamp);
  newUserData.userReward = newUserReward;
  if (!skipUpdateUser) {
    newUserData.userPreviousReward = newUserReward;
    newUserData.userIndex = newIndex;
  }

  return [newPoolData, newUserData];
}
