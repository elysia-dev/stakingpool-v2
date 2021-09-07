import { RewardAsset, StakingAsset, StakingPoolV2 } from '../../typechain';
interface TestEnv {
  stakingAsset: StakingAsset;
  rewardAsset: RewardAsset;
  stakingPool: StakingPoolV2;
}

export default TestEnv;
