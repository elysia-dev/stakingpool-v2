import { RewardAsset, StakingAsset, StakingPoolV2, StakingPoolV3 } from '../../typechain';

interface TestEnv {
  stakingAsset: StakingAsset;
  rewardAsset: RewardAsset;
  stakingPool: StakingPoolV2;
}

interface MigrateTestEnv extends TestEnv {
  newStakingPool: StakingPoolV3;
  isNew: boolean;
}

export {
  TestEnv,
  MigrateTestEnv
}