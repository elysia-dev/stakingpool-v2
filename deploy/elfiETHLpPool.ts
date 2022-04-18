import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getNamedContracts } from '../tasks/utils';
import { DeployFunction } from 'hardhat-deploy/types';

const elfiEthLpPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { elfiToken } = getNamedContracts(hre.ethers.provider);
  const { deploy } = hre.deployments;

  const erc20MetadataLibrary = await deploy('ERC20Metadata', {
    from: deployer,
  });

  // ELFI-ETH Lp token
  const stakingAssetAddress = '0x727E501dDAbf9AB1888abC5042EF4d0569F0C162';
  const rewardAsset = elfiToken;

  const stakingPool = await deploy('StakingPoolV2', {
    from: deployer,
    args: [stakingAssetAddress, rewardAsset.address],
    libraries: {
      ERC20Metadata: erc20MetadataLibrary.address,
    },
    log: true,
  });

  await hre.run('etherscan-verify', {
    network: hre.network.name,
  });
};
elfiEthLpPool.tags = ['ethLpPool'];

export default elfiEthLpPool;
