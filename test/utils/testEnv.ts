import { ethers } from 'hardhat';
import {
  StakingAsset,
  RewardAsset,
  StakingPoolV2,
  StakingPoolV2__factory,
  StakingAsset__factory,
  RewardAsset__factory,
  ERC20Metadata,
  ERC20Metadata__factory
} from '../../typechain';
import TestEnv from '../types/TestEnv';

const setRewardAsset = async (): Promise<RewardAsset> => {
  const rewardAssetFactory = (await ethers.getContractFactory(
    'RewardAsset'
  )) as RewardAsset__factory;

  return await rewardAssetFactory.deploy();
};

const setStakingAsset = async (): Promise<StakingAsset> => {
  const stakingAssetFactory = (await ethers.getContractFactory(
    'StakingAsset'
  )) as StakingAsset__factory;

  return await stakingAssetFactory.deploy('StakingAsset', 'STAKING');
};

const setStakingPool = async (
  stakingAsset: StakingAsset,
  rewardAsset: RewardAsset,
  erc20MetadataLibraryAddress: string,
): Promise<StakingPoolV2> => {
  const stakingPoolFactory = (await ethers.getContractFactory(
    'StakingPoolV2',
    {
      libraries: {
        ERC20Metadata: erc20MetadataLibraryAddress
      }
    }
  )) as StakingPoolV2__factory;

  return await stakingPoolFactory.deploy(stakingAsset.address, rewardAsset.address);
};

export const setERC20Metadata = async (): Promise<ERC20Metadata> => {
  const erc20MetadataFactory = (await ethers.getContractFactory('ERC20Metadata')) as ERC20Metadata__factory
  return await erc20MetadataFactory.deploy()
}

export const setTestEnv = async (): Promise<TestEnv> => {
  const testEnv: TestEnv = {
    ...(<TestEnv>{}),
  };

  const erc20Metadata = await setERC20Metadata();
  testEnv.rewardAsset = await setRewardAsset();
  testEnv.stakingAsset = await setStakingAsset();

  testEnv.stakingPool = await setStakingPool(
    testEnv.stakingAsset,
    testEnv.rewardAsset,
    erc20Metadata.address,
  );

  return testEnv;
};
