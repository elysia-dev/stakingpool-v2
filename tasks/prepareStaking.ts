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

    const elStakingPoolAddress = (await hre.deployments.get('StakingPoolV2_EL')).address;
    const elfiStakingPoolAddress = "";
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

task('prepare-staking-eth-lp', 'Initiate staking round EL')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    // **********PARAMS*********** //
    const rewardForElFI = utils.parseEther('210000').add(utils.parseEther('265755.5'))
    console.log(rewardForElFI.toString());
    const durationInSeconds = 3600 * 24 * 28
    const address = (await hre.deployments.get('StakingPoolV2_ELFI_ETH_LP')).address;
    console.log(address);
    // *************************** //

    const provider = hre.ethers.provider;
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = provider.getSigner(deployer);

    // const { elfiRich } = getNamedSigners(provider);
    const { elfiToken } = getNamedContracts(provider);

    const contract = (await hre.ethers.getContractAt('StakingPoolV2', address)) as StakingPoolV2;

    // const tx1 = await elfiToken.connect(deployerSigner).transfer(elfiStakingPoolV2.address, rewardForElFI)
    // await tx1.wait()

    const format = 'YYYY.MM.DD hh:mm:ss Z';
    const startAt = moment("2022.04.18 19:00:00", format).tz('Asia/Seoul', true)
    console.log(startAt.unix())

    const tx5 = await contract
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), startAt.unix(), durationInSeconds)

    await tx5.wait();

    console.log("initialized stakingpool in bsc")
  });

task('prepare-staking-dai-lp', 'Initiate staking round EL')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    // **********PARAMS*********** //
    const rewardForElFI = utils.parseEther('210000').add(utils.parseEther('265755.5'))
    console.log(rewardForElFI.toString());
    const durationInSeconds = 3600 * 24 * 28
    const address = (await hre.deployments.get('StakingPoolV2_ETH_DAI_LP')).address;
    console.log(address);
    // *************************** //

    const provider = hre.ethers.provider;
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = provider.getSigner(deployer);

    // const { elfiRich } = getNamedSigners(provider);
    const { elfiToken } = getNamedContracts(provider);

    const contract = (await hre.ethers.getContractAt('StakingPoolV2', address)) as StakingPoolV2;

    // const tx1 = await elfiToken.connect(deployerSigner).transfer(elfiStakingPoolV2.address, rewardForElFI)
    // await tx1.wait()

    const format = 'YYYY.MM.DD hh:mm:ss Z';
    const startAt = moment("2022.04.18 19:00:00", format).tz('Asia/Seoul', true)
    console.log(startAt.unix())

    const tx5 = await contract
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), startAt.unix(), durationInSeconds)

    await tx5.wait();

    console.log("initialized stakingpool in bsc")
  });

task('prepare-staking-el', 'Initiate staking round EL')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    // **********PARAMS*********** //
    const rewardForElFI = utils.parseEther('10633450')
    const durationInSeconds = 3600 * 24 * 28
    const elStakingPoolAddress = (await hre.deployments.get('StakingPoolV2_EL')).address;
    console.log(elStakingPoolAddress);
    // *************************** //

    const provider = hre.ethers.provider;
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = provider.getSigner(deployer);

    // const { elfiRich } = getNamedSigners(provider);
    const { elfiToken } = getNamedContracts(provider);

    const contract = (await hre.ethers.getContractAt('StakingPoolV2', elStakingPoolAddress)) as StakingPoolV2;

    // const tx1 = await elfiToken.connect(deployerSigner).transfer(elfiStakingPoolV2.address, rewardForElFI)
    // await tx1.wait()

    const format = 'YYYY.MM.DD hh:mm:ss Z';
    const startAt = moment("2022.04.18 19:00:00", format).tz('Asia/Seoul', true)
    console.log(startAt.unix())

    const tx5 = await contract
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), startAt.unix(), durationInSeconds)

    await tx5.wait();

    console.log("initialized stakingpool in bsc")
  });

task('prepare-staking-elfi', 'Initiate staking round ELFI')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    // **********PARAMS*********** //
    const rewardForElFI = utils.parseEther('531511')
    const durationInSeconds = 3600 * 24 * 28
    const elfiStakingPoolAddress = (await hre.deployments.get('StakingPoolV2')).address;
    console.log(elfiStakingPoolAddress);
    // *************************** //

    const provider = hre.ethers.provider;
    const { deployer } = await hre.getNamedAccounts();
    const deployerSigner = provider.getSigner(deployer);

    // const { elfiRich } = getNamedSigners(provider);
    const { elfiToken } = getNamedContracts(provider);

    const elfiStakingPoolV2 = (await hre.ethers.getContractAt('StakingPoolV2', elfiStakingPoolAddress)) as StakingPoolV2;

    // const tx1 = await elfiToken.connect(deployerSigner).transfer(elfiStakingPoolV2.address, rewardForElFI)
    // await tx1.wait()

    const format = 'YYYY.MM.DD hh:mm:ss Z';
    const startAt = moment("2022.04.18 19:00:00", format).tz('Asia/Seoul', true)
    console.log(startAt.unix())

    const tx5 = await elfiStakingPoolV2
      .connect(deployerSigner)
      .initNewPool(rewardForElFI.div(durationInSeconds), startAt.unix(), durationInSeconds)

    await tx5.wait();

    console.log("initialized stakingpool in bsc")
  });
