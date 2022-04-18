import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getNamedContracts } from '../tasks/utils';
import { DeployFunction } from 'hardhat-deploy/types';

const elfiDaiLpPool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const elfiToken = await hre.deployments.get('ELFI');
  const { deploy } = hre.deployments;

  const erc20MetadataLibrary = await deploy('ERC20Metadata', {
    from: deployer,
  });

  // ELFI-DAI Lp token
  const stakingAssetAddress = '0x8F9a5BD715c553a94Eaf0C67ebd2a8Ae2Ad60F9E';
  const rewardAsset = elfiToken;

  const stakingPool = await deploy('StakingPoolV2_ETH_DAI_LP', {
    contract: 'StakingPoolV2',
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
elfiDaiLpPool.tags = ['daiLpPool'];

export default elfiDaiLpPool;
