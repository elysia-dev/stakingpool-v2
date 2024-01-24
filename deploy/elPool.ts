import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const elPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const elToken = await hre.deployments.get("EL");
  const { deploy } = hre.deployments;

  const erc20MetadataLibrary = await deploy('ERC20Metadata', {
    from: deployer,
  });

  console.log(erc20MetadataLibrary);

  const stakingAsset = elToken;
  const rewardAsset = elToken;

  const stakingPool = await deploy('StakingPoolV2_EL', {
    contract: 'StakingPoolV2',
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
elPool.tags = ['ELPool'];

export default elPool;
