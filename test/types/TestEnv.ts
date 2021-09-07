import { RewardAsset, StakingAsset, StakingPool } from '../../typechain';
interface TestEnv {
  stakingAsset: StakingAsset;
  rewardAsset: RewardAsset;
  stakingPool: StakingPool;
}

export default TestEnv;
