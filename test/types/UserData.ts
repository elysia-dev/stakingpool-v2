import { BigNumber } from 'ethers';

type UserData = {
  userIndex: BigNumber;
  userReward: BigNumber;
  userPreviousReward: BigNumber;
  userPrincipal: BigNumber;
  stakingAssetBalance: BigNumber;
  rewardAssetBalance: BigNumber;
};

export default UserData;
