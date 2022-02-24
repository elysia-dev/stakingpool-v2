import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getElyfi, getDai, getBusd } from '../utils/getDependencies';

const elyfiPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  hre.deployments;
  const { deploy } = hre.deployments;

  // In the BSC mainnet, StakingAsset is Wormhole ELFI and RewardAsset is BUSD
  const stakingAsset = await getElyfi(hre);
  const rewardAsset = await getBusd(hre);

  const stakingPool = await deploy('StakingPoolV2', {
    from: deployer,
    args: [stakingAsset.address, rewardAsset.address],
    log: true,
  });

  console.log('Deploy Done, and start verify\n');

  // Verify may not work, and it can make error log
  await hre.run('etherscan-verify', {
    network: hre.network.name,
  });
};
elyfiPool.tags = ['elyfiPool'];

export default elyfiPool;
