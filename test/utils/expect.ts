import { BigNumber, ethers } from 'ethers';
import PoolData from '../types/PoolData';
import UserData from '../types/UserData';
import { calculateDataAfterUpdate, calculateRewardIndex, calculateUserReward } from './calculate';

export function expectDataAfterStake(
  poolData: PoolData,
  userData: UserData,
  txTimeStamp: BigNumber,
  amount: BigNumber
): [PoolData, UserData] {
  const [newPoolData, newUserData]: [PoolData, UserData] = calculateDataAfterUpdate(
    poolData,
    userData,
    txTimeStamp
  );

  const newUserStakingAssetBalance = newUserData.stakingAssetBalance.sub(amount);
  const newUserPrincipal = newUserData.userPrincipal.add(amount);

  newUserData.stakingAssetBalance = newUserStakingAssetBalance;
  newUserData.userPrincipal = newUserPrincipal;

  const newPoolTotalPrincipal = newPoolData.totalPrincipal.add(amount);
  newPoolData.totalPrincipal = newPoolTotalPrincipal;

  const newPoolStakingAssetBalance = newPoolData.stakingAssetBalance.add(amount);
  newPoolData.stakingAssetBalance = newPoolStakingAssetBalance;

  return [newPoolData, newUserData];
}

export function expectDataAfterWithdraw(
  poolData: PoolData,
  userData: UserData,
  txTimeStamp: BigNumber,
  amount: BigNumber
): [PoolData, UserData] {
  const [newPoolData, newUserData]: [PoolData, UserData] = calculateDataAfterUpdate(
    poolData,
    userData,
    txTimeStamp
  );

  let withdrawAmount = amount;

  if (amount.eq(ethers.constants.MaxUint256)) {
    withdrawAmount = userData.userPrincipal;
  }

  const newUserStakingAssetBalance = newUserData.stakingAssetBalance.add(withdrawAmount);
  const newUserPrincipal = newUserData.userPrincipal.sub(withdrawAmount);
  newUserData.stakingAssetBalance = newUserStakingAssetBalance;
  newUserData.userPrincipal = newUserPrincipal;

  const newPoolTotalPrincipal = newPoolData.totalPrincipal.sub(withdrawAmount);
  newPoolData.totalPrincipal = newPoolTotalPrincipal;

  const newPoolStakingAssetBalance = newPoolData.stakingAssetBalance.sub(withdrawAmount);
  newPoolData.stakingAssetBalance = newPoolStakingAssetBalance;

  return [newPoolData, newUserData];
}

export function expectDataAfterClaim(
  poolData: PoolData,
  userData: UserData,
  txTimeStamp: BigNumber
): [PoolData, UserData] {
  const newPoolData = { ...poolData } as PoolData;
  const newUserData = { ...userData } as UserData;

  const accruedReward = calculateUserReward(poolData, userData, txTimeStamp);
  const newUserRewardAssetBalance = userData.rewardAssetBalance.add(accruedReward);
  newUserData.rewardAssetBalance = newUserRewardAssetBalance;

  newUserData.userPreviousReward = newUserData.userReward = BigNumber.from(0);

  const newRewardIndex = calculateRewardIndex(poolData, txTimeStamp);
  newUserData.userIndex = newRewardIndex;

  const newPoolTotalRewardAssetBalance = poolData.rewardAssetBalance.sub(accruedReward);
  newPoolData.rewardAssetBalance = newPoolTotalRewardAssetBalance;

  return [newPoolData, newUserData];
}

export function expectDataAfterMigrate(
  fromPoolData: PoolData,
  fromUserData: UserData,
  toPoolData: PoolData,
  toUserData: UserData,
  txTimeStamp: BigNumber,
): [[PoolData, UserData], [PoolData, UserData]] {
  let newFromPoolData = { ...fromPoolData } as PoolData;
  let newFromUserData = { ...fromUserData } as UserData;

  const amount = fromUserData.userPrincipal;

  [newFromPoolData, newFromUserData] = calculateDataAfterUpdate(
    fromPoolData,
    fromUserData,
    txTimeStamp
  );
  
  const [newToPoolData, newToUserData]: [PoolData, UserData] = calculateDataAfterUpdate(
    toPoolData,
    toUserData,
    txTimeStamp
  );

  // ======== change user data =======
    // -------- from pool -------
    // reset previous user data
    newFromUserData.userPreviousReward = newFromUserData.userPrincipal =
    newFromUserData.userReward = BigNumber.from(0);

    // update user index for claim 
    const newUserIndexInFromPool = calculateRewardIndex(fromPoolData, txTimeStamp);
    newFromUserData.userIndex = newUserIndexInFromPool;
  
    // get user reward asset balance
    const accruedPreviousPoolReward = calculateUserReward(fromPoolData, fromUserData, txTimeStamp);
    const newUserRewardAssetBalance = fromUserData.rewardAssetBalance.add(accruedPreviousPoolReward);
    newFromUserData.rewardAssetBalance = newToUserData.rewardAssetBalance = newUserRewardAssetBalance;


    // --------- to pool -------
    // update user index
    const newUserIndexInToPool = calculateRewardIndex(toPoolData, txTimeStamp);
    newToUserData.userIndex = newUserIndexInToPool;

    // add previous user principal to the new pool
    const newUserPrincipalInToPool = toUserData.userPrincipal.add(amount);
    newToUserData.userPrincipal = newUserPrincipalInToPool;



  // ======== change pool data =======
    // -------- from pool -------
    // sub total pool staking asset balance 
    const newPoolStakingAssetBalanceInFromPool = fromPoolData.stakingAssetBalance.sub(amount);
    newFromPoolData.stakingAssetBalance = newPoolStakingAssetBalanceInFromPool;

    // sub previous user principal from the previous pool
    const newTotalPrincipalInFromPool = fromPoolData.totalPrincipal.sub(fromUserData.userPrincipal);
    newFromPoolData.totalPrincipal = newTotalPrincipalInFromPool;

    // sub reward asset for claim 
    const newPoolRewardAssetBalance = fromPoolData.rewardAssetBalance.sub(accruedPreviousPoolReward);
    newFromPoolData.rewardAssetBalance = newPoolRewardAssetBalance;

  
    // -------- to pool -------
    // add previous pool total principal to the new pool
    const newTotalPrincipalInToPool = toPoolData.totalPrincipal.add(amount);
    newToPoolData.totalPrincipal = newTotalPrincipalInToPool;

    // add total pool staking asset balance
    const newPoolStakingAssetBalanceInToPool = toPoolData.stakingAssetBalance.add(amount);
    newToPoolData.stakingAssetBalance = newPoolStakingAssetBalanceInToPool;

  return [
    [newFromPoolData, newFromUserData],
    [newToPoolData, newToUserData],
  ];
}
