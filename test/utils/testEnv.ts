import { ethers } from 'hardhat';
import {
  StakingAsset,
  RewardAsset,
  StakingPoolV2,
  StakingPoolV2__factory,
  StakingAsset__factory,
  RewardAsset__factory,
} from '../../typechain';
import TestEnv from '../types/TestEnv';

const setRewardAsset = async (): Promise<RewardAsset> => {
  let rewardAsset: RewardAsset;

  const rewardAssetFactory = (await ethers.getContractFactory(
    'RewardAsset'
  )) as RewardAsset__factory;

  rewardAsset = await rewardAssetFactory.deploy();

  return rewardAsset;
};

const setStakingAsset = async (): Promise<StakingAsset> => {
  let stakingAsset: StakingAsset;

  const stakingAssetFactory = (await ethers.getContractFactory(
    'StakingAsset'
  )) as StakingAsset__factory;

  stakingAsset = await stakingAssetFactory.deploy();

  return stakingAsset;
};

const setStakingPool = async (
  stakingAsset: StakingAsset,
  rewardAsset: RewardAsset
): Promise<StakingPoolV2> => {
  let stakingPool: StakingPoolV2;

  const stakingPoolFactory = (await ethers.getContractFactory(
    'StakingPoolV2'
  )) as StakingPoolV2__factory;

  stakingPool = await stakingPoolFactory.deploy(stakingAsset.address, rewardAsset.address);

  return stakingPool;
};

export const setTestEnv = async (): Promise<TestEnv> => {
  const testEnv: TestEnv = {
    ...(<TestEnv>{}),
  };

  testEnv.stakingAsset = await setStakingAsset();
  testEnv.rewardAsset = testEnv.stakingAsset;

  testEnv.stakingPool = await setStakingPool(testEnv.stakingAsset, testEnv.rewardAsset);

  return testEnv;
};
