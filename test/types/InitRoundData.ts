import { BigNumber } from 'ethers';
import { RewardAsset } from '../../typechain';

type InitRoundData = {
  rewardAssets: RewardAsset[];
  rewardPerSeconds: BigNumber[];
  startTimestamp: BigNumber;
  duration: BigNumber;
};

export default InitRoundData;
