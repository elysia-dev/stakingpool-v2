import { Contract } from 'ethers';
import { DeployedContract } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';
import { StakingPool } from '../typechain';

export const getStakingPool = async (hre: HardhatRuntimeEnvironment): Promise<StakingPool> => {
  let file: DeployedContract;

  try {
    file = require(getDeploymentPath(hre.network.name, stakingPool.StakingPool));
  } catch (e) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;
    const stakingAsset = await getStakingAsset(hre);
    const rewardAsset = await getRewardAsset(hre);
    const StakingPoolLocalDeploy = await deploy('StakingPool', {
      from: deployer,
      log: true,
      args: [stakingAsset.address, rewardAsset.address],
    });
    return (await hre.ethers.getContractAt(
      StakingPoolLocalDeploy.abi,
      StakingPoolLocalDeploy.address
    )) as StakingPool;
  }

  return (await hre.ethers.getContractAt(file.abi, file.address)) as StakingPool;
};

export const getStakingAsset = async (hre: HardhatRuntimeEnvironment): Promise<Contract> => {
  let file: DeployedContract;

  try {
    file = require(getDeploymentPath(hre.network.name, stakingPool.StakingAsset));
  } catch (e) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    const StakingAssetLocalDeploy = await deploy('StakingAsset', {
      from: deployer,
      log: true,
    });
    return await hre.ethers.getContractAt(
      StakingAssetLocalDeploy.abi,
      StakingAssetLocalDeploy.address
    );
  }
  return await hre.ethers.getContractAt(file.abi, file.address);
};

export const getRewardAsset = async (hre: HardhatRuntimeEnvironment): Promise<Contract> => {
  let file: DeployedContract;

  try {
    file = require(getDeploymentPath(hre.network.name, stakingPool.RewardAsset));
  } catch (e) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    const RewardAssetLocalDeploy = await deploy('RewardAsset', {
      from: deployer,
      log: true,
    });
    return await hre.ethers.getContractAt(
      RewardAssetLocalDeploy.abi,
      RewardAssetLocalDeploy.address
    );
  }
  return await hre.ethers.getContractAt(file.abi, file.address);
};

const stakingPool = {
  StakingPool: 'StakingPool.json',
  StakingAsset: 'StakingAsset.json',
  RewardAsset: 'RewardAsset.json',
};

const getDeploymentPath = (network: string, file: string) => {
  return path.join(__dirname, '..', '..', 'deployments', network, file);
};
