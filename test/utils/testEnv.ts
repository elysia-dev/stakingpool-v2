import { BigNumber, utils } from 'ethers';
import { ethers } from 'hardhat';
import {
  StakingAsset,
  RewardAsset,
  StakingPool,
  StakingPool__factory,
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
): Promise<StakingPool> => {
  let stakingPool: StakingPool;

  const stakingPoolFactory = (await ethers.getContractFactory(
    'StakingPool'
  )) as StakingPool__factory;

  stakingPool = await stakingPoolFactory.deploy(stakingAsset.address, rewardAsset.address);

  return stakingPool;
};

export const setTestEnv = async (): Promise<TestEnv> => {
  const testEnv: TestEnv = {
    ...(<TestEnv>{}),
  };

  testEnv.rewardAsset = await setRewardAsset();
  testEnv.stakingAsset = await setStakingAsset();

  testEnv.stakingPool = await setStakingPool(testEnv.stakingAsset, testEnv.rewardAsset);

  return testEnv;
};
