import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const elyfiPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const elfiToken = await hre.deployments.get('ELFI');
  const { deploy } = hre.deployments;

  const erc20MetadataLibrary = await deploy('ERC20Metadata', {
    from: deployer,
  });

  console.log(erc20MetadataLibrary);

  const stakingAsset = elfiToken;
  const rewardAsset = elfiToken;

  const stakingPool = await deploy('StakingPoolV2', {
    from: deployer,
    args: [stakingAsset.address, rewardAsset.address],
    libraries: {
      ERC20Metadata: erc20MetadataLibrary.address,
    },
    log: true,
  });

  await hre.run('etherscan-verify', {
    network: hre.network.name,
  });
};
elyfiPool.tags = ['elyfiPool'];

export default elyfiPool;
