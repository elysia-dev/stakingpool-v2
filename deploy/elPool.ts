import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getElyfi, getElToken } from '../utils/getDependencies';

const elPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  hre.deployments;
  const { deploy } = hre.deployments;

  const stakingAsset = await getElToken(hre);
  const rewardAsset = await getElyfi(hre);

  const stakingPool = await deploy('StakingPoolV2', {
    from: deployer,
    args: [stakingAsset.address, rewardAsset.address],
    log: true,
  });

  await hre.run('etherscan-verify', {
    network: hre.network.name,
  });
};
elPool.tags = ['elPool'];

export default elPool;
