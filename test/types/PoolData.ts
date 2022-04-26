import { BigNumber } from 'ethers';

export interface PoolData {
  rewardPerSecond: BigNumber;
  rewardIndex: BigNumber;
  startTimestamp: BigNumber;
  endTimestamp: BigNumber;
  totalPrincipal: BigNumber;
  lastUpdateTimestamp: BigNumber;
  stakingAssetBalance: BigNumber;
  rewardAssetBalance: BigNumber;
}

export default PoolData;
