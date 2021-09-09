import { BigNumber } from 'ethers';
import { RewardAsset } from '../../typechain';

type PoolData = {
  rewardAssets: RewardAsset[];
  rewardPerSeconds: BigNumber[];
  rewardIndex: BigNumber;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  totalPrincipal: BigNumber;
  lastUpdateTimestamp: BigNumber;
  stakingAssetBalance: BigNumber;
  rewardAssetBalance: BigNumber;
};

export default PoolData;
