import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getElyfi, getDai } from '../utils/getDependencies';
import { getStakingPool } from '../utils/getDeployedContracts';
import { StakingAsset, StakingPoolV2 } from '../typechain';

import { third } from '../data/rounds';
import { ethers } from 'hardhat';

const elyfiPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, execute, get } = hre.deployments;

  // const stakingAsset = await getElyfi(hre);
  // const rewardAsset = await getDai(hre);

  const stakingAsset = await get('StakingAsset');
  const rewardAsset = await get('RewardAsset');

  const stakingPool = await deploy('StakingPoolV2-Test', {
    contract: 'StakingPoolV2',
    from: deployer,
    args: [stakingAsset.address, rewardAsset.address],
    log: true,
  });

  console.log(deployer);

  // await getStakingPool(hre);

  console.log(process.env.BSCSCAN_API_KEY);

  console.log(stakingPool.address);

  // const stakingAssetInstance = (await hre.ethers.getContractAt(
  //   stakingAsset.abi,
  //   stakingAsset.address
  // )) as StakingAsset;
  // await stakingAssetInstance.transfer(stakingPool.address, hre.ethers.utils.parseEther('10000000'));

  const stakingPoolInstance = (await hre.ethers.getContractAt(
    stakingPool.abi,
    stakingPool.address
  )) as StakingPoolV2;
  await stakingPoolInstance.initNewRound(third.rewardPerSecond, 1, third.rewardPerSecond);

  await hre.run('etherscan-verify', {
    network: hre.network.name,
  });
};
elyfiPool.tags = ['elyfiPool'];

export default elyfiPool;
