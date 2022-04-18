import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const testEL: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const testEL = await deploy('EL', {
    contract: 'StakingAsset',
    from: deployer,
    args: ['TEST_ELYSIA', 'TEST_EL'],
    log: true,
  });
}

testEL.tags = ['testEL'];

export default testEL;
