import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getNamedContracts, getNamedSigners } from '../tasks/utils';
import { DeployFunction } from 'hardhat-deploy/types';
import {
  StakingPoolV2,
  ERC20Metadata,
  StakingPoolV2__factory,
  ERC20Metadata__factory,
} from '../typechain';

const elyfiPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { elToken, elfiToken } = getNamedContracts(hre.ethers.provider);
  const { deploy } = hre.deployments;

  const erc20MetadataLibrary = await deploy('ERC20Metadata', {
    from: deployer,
  });

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
