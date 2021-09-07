import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getElyfi, getDai } from '../utils/getDependencies';

const elyfiPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  hre.deployments;
  const { deploy } = hre.deployments;

  const stakingAsset = await getElyfi(hre);

  const rewardAsset = await getDai(hre);

  const stakingPool = await deploy('StakingPool', {
    from: deployer,
    args: [stakingAsset.address, rewardAsset.address],
    log: true,
  });

  await hre.run('etherscan-verify', {
    network: hre.network.name,
  });
};
elyfiPool.tags = ['elyfiPool'];

export default elyfiPool;
