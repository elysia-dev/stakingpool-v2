import { RewardAsset, StakingAsset, StakingPoolV2 } from '../../typechain';
interface TestEnv {
  stakingAsset: StakingAsset;
  rewardAssets: RewardAsset[];
  stakingPool: StakingPoolV2;
}

export default TestEnv;
