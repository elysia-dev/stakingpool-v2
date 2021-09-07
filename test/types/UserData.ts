import { BigNumber } from 'ethers';

interface UserData {
  userIndex: BigNumber;
  userReward: BigNumber;
  userPreviousReward: BigNumber;
  userPrincipal: BigNumber;
  stakingAssetBalance: BigNumber;
  rewardAssetBalance: BigNumber;
}

export default UserData;
