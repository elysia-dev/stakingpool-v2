import { BigNumber, constants } from 'ethers';
import PoolData from '../types/PoolData';
import UserData from '../types/UserData';
import { WAD } from '../utils/constants';

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

  const rewardIndexDiff = timeDiff
    .mul(poolData.rewardPerSecond)
    .mul(WAD)
    .div(poolData.totalPrincipal);

  return poolData.rewardIndex.add(rewardIndexDiff);
}

export function calculateUserReward(
  poolData: PoolData,
  userData: UserData,
  txTimeStamp: BigNumber
): BigNumber {
  if (userData.userIndex.eq(0)) {
    return BigNumber.from(0);
  }

  const indexDiff = calculateRewardIndex(poolData, txTimeStamp).sub(userData.userIndex);
  const balance = userData.userPrincipal;
  const rewardAdded = balance.mul(indexDiff).div(WAD);
  const result = userData.userPreviousReward.add(rewardAdded);

  return result;
}

export function calculateDataAfterUpdate(
  poolData: PoolData,
  userData: UserData,
  txTimestamp: BigNumber
): [PoolData, UserData] {
  const newPoolData = { ...poolData } as PoolData;
  const newUserData = { ...userData } as UserData;

  const newUserReward = calculateUserReward(poolData, userData, txTimestamp);
  const newIndex = calculateRewardIndex(poolData, txTimestamp);

  newUserData.userPreviousReward = newUserData.userReward = newUserReward;

  newPoolData.rewardIndex = newIndex;
  newUserData.userIndex = newIndex;

  newPoolData.lastUpdateTimestamp = txTimestamp.lt(poolData.endTimestamp)
    ? txTimestamp
    : poolData.endTimestamp;

  return [newPoolData, newUserData];
}
