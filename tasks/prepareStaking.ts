import { utils, constants } from 'ethers';
import moment from 'moment';
import 'moment-timezone';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  StakingPoolV2,
} from '../typechain';
import { getNamedContracts, getNamedSigners } from './utils';

interface Args { }

task('prepare-staking-eth', 'Initiate 4 pools in eth')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    // **********PARAMS*********** //
    const rewardForEl = utils.parseEther('1000')
    const rewardForElFI = utils.parseEther('1000')
    const rewardForDaiLp = utils.parseEther('1000')
    const rewardForEthLp = utils.parseEther('1000')

    const durationInSeconds = 3600 * 24 * 28

    const elStakingPoolAddress = "0x2776a888F6eC5513d84cb0e1aA3396B8750170A8";
    const elfiStakingPoolAddress = "0x7d22b5A6Cf5dc27AC96a085FB49B67ddC3Aa6C77";
    const daiLpStakingPoolAddress = "";
    const ethLpStakingPoolAddress = "";
    // *************************** //

    const provider = hre.ethers.provider;
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = provider.getSigner(deployer);

    // const { elRich, elfiRich } = getNamedSigners(provider);
    const { elToken, elfiToken } = getNamedContracts(provider);

    const elStakingPoolV2 = (await hre.ethers.getContractAt('StakingPoolV2', elStakingPoolAddress)) as StakingPoolV2;
    const elfiStakingPoolV2 = (await hre.ethers.getContractAt('StakingPoolV2', elfiStakingPoolAddress)) as StakingPoolV2;
    const daiLpStakingPoolV2 = (await hre.ethers.getContractAt('StakingPoolV2', daiLpStakingPoolAddress)) as StakingPoolV2;
    const ethLpStakingPoolV2 = (await hre.ethers.getContractAt('StakingPoolV2', ethLpStakingPoolAddress)) as StakingPoolV2;

    // Check if balances are enough
    /*
    const elBalance = await elToken.balanceOf(elRich._address)
    console.log(utils.formatEther(elBalance));
    const elfiBalance = await elfiToken.balanceOf(elfiRich._address)
    console.log(utils.formatEther(elfiBalance));
    */

    // transfer assets, EL and ELFI
    const tx0 = await elToken.connect(deployerSigner).transfer(elStakingPoolV2.address, rewardForEl)
    await tx0.wait()

    const tx1 = await elfiToken.connect(deployerSigner).transfer(elfiStakingPoolV2.address, rewardForElFI)
    await tx1.wait()

    const tx2 = await elfiToken.connect(deployerSigner).transfer(daiLpStakingPoolAddress, rewardForDaiLp)
    await tx2.wait()

    const tx3 = await elfiToken.connect(deployerSigner).transfer(ethLpStakingPoolAddress, rewardForEthLp)
    await tx3.wait()

    // inint Staking Round
    const tx4 = await elStakingPoolV2
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), moment().unix(), durationInSeconds)
    await tx4.wait();

    const tx5 = await elfiStakingPoolV2
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), moment().unix(), durationInSeconds)
    await tx5.wait();

    const tx6 = await daiLpStakingPoolV2
      .connect(deployerSigner)
      .initNewPool(rewardForDaiLp.div(durationInSeconds), moment().unix(), durationInSeconds)
    await tx6.wait();

    const tx7 = await ethLpStakingPoolV2
      .connect(deployerSigner)
      .initNewPool(rewardForEthLp.div(durationInSeconds), moment().unix(), durationInSeconds)
    await tx7.wait();

    console.log("initialized stakingpools in eth")
  });

task('prepare-staking-bsc', 'Initiate staking round in bsc')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    // **********PARAMS*********** //
    const rewardForElFI = utils.parseEther('1000')
    const durationInSeconds = 3600 * 24 * 28
    const elfiStakingPoolAddress = "0x7d22b5A6Cf5dc27AC96a085FB49B67ddC3Aa6C77";
    // *************************** //

    const provider = hre.ethers.provider;
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = provider.getSigner(deployer);

    // const { elfiRich } = getNamedSigners(provider);
    const { elfiToken } = getNamedContracts(provider);

    const elfiStakingPoolV2 = (await hre.ethers.getContractAt('StakingPoolV2', elfiStakingPoolAddress)) as StakingPoolV2;

    const tx1 = await elfiToken.connect(deployerSigner).transfer(elfiStakingPoolV2.address, rewardForElFI)
    await tx1.wait()

    const tx5 = await elfiStakingPoolV2
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), moment().unix(), durationInSeconds)

    await tx5.wait();

    console.log("initialized stakingpool in bsc")
  });
