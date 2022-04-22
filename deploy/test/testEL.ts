import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const testELFI: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy('ELFI', {
    contract: 'StakingAsset',
    from: deployer,
    args: ['TEST_ELYFI', 'TEST_ELFI'],
    log: true,
  });
}

testELFI.tags = ['testELFI'];

export default testELFI;
