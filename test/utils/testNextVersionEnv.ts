import { ethers } from 'hardhat';
import {
  StakingAsset,
  RewardAsset,
  StakingPoolV3,
  StakingPoolV3__factory,
  StakingAsset__factory,
  RewardAsset__factory,
} from '../../typechain';
import TestNextVersionEnv from '../types/TestNextVersionEnv';

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
): Promise<StakingPoolV3> => {
  let stakingPool: StakingPoolV3;

  const stakingPoolFactory = (await ethers.getContractFactory(
    'StakingPoolV3'
  )) as StakingPoolV3__factory;

  stakingPool = await stakingPoolFactory.deploy(stakingAsset.address, rewardAsset.address);

  return stakingPool;
};

export const setTestNextVersionEnv = async (): Promise<TestNextVersionEnv> => {
  const testNextVersionEnv: TestNextVersionEnv = {
    ...(<TestNextVersionEnv>{}),
  };

  testNextVersionEnv.rewardAsset = await setRewardAsset();
  testNextVersionEnv.stakingAsset = await setStakingAsset();

  testNextVersionEnv.stakingPool = await setStakingPool(testNextVersionEnv.stakingAsset, testNextVersionEnv.rewardAsset);

  return testNextVersionEnv;
};
