import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { StakingPoolV2 } from '../typechain';
import * as rounds from '../data/rounds';
import { getStakingAsset, getStakingPool } from '../utils/getDeployedContracts';
import { InitRoundData } from '../data/types/InitRoundData';
import { getDai } from '../utils/getDependencies';

interface Args {
  round: keyof typeof rounds;
  amount: string;
}

task('testnet:initNewRound', 'Initiate staking round')
  .addParam('round', 'The round to initiate, first, second, third... ')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();

    const { get } = hre.deployments;

    const stakingPoolDeployment = await get('StakingPoolV2');

    const stakingPool = (await hre.ethers.getContractAt(
      stakingPoolDeployment.abi,
      stakingPoolDeployment.address
    )) as StakingPoolV2;

    const rewardAsset = await getDai(hre);

    const roundData: InitRoundData = rounds[args.round];
    const timestamp = hre.ethers.BigNumber.from(
      Date.UTC(
        roundData.year,
        roundData.month - 1,
        roundData.day,
        roundData.hour,
        roundData.minute
      ) / 1000
    );

    const initTx = await stakingPool
      .connect(deployer)
      .initNewRound(roundData.rewardPerSecond, timestamp, roundData.duration);
    await initTx.wait();

    const transferTx = await rewardAsset
      .connect(deployer)
      .transfer(stakingPool.address, hre.ethers.utils.parseEther('1000000'));
    await transferTx.wait();

    console.log('Round initiated');
  });

task('testnet:stake', 'Stake asset')
  .addParam('amount', 'The amount to stake')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();
    const amount = hre.ethers.utils.parseEther(args.amount);

    const { get } = hre.deployments;

    const stakingPoolDeployment = await get('StakingPoolV2');

    const stakingPool = (await hre.ethers.getContractAt(
      stakingPoolDeployment.abi,
      stakingPoolDeployment.address
    )) as StakingPoolV2;

    const stakingAsset = await getStakingAsset(hre);

    if ((await stakingAsset.balanceOf(deployer.address)).lt(amount)) {
      const faucetTx = await stakingAsset.connect(deployer).faucet();
      await faucetTx.wait();
      console.log(`Account took faucet`);
    }

    if ((await stakingAsset.allowance(deployer.address, stakingPool.address)).lt(amount)) {
      const approveTx = await stakingAsset.connect(deployer).approve(stakingPool.address, amount);
      await approveTx.wait();
      console.log(`Account approved`);
    }

    const stakeTx = await stakingPool.connect(deployer).stake(amount);
    await stakeTx.wait();

    console.log(`Stake amount ${args.amount} success `);
  });

task('testnet:withdraw', 'Unstake asset')
  .addParam('amount', 'The amount to withdraw')
  .addParam('round', 'The round to withdraw')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    let stakingPool: StakingPoolV2;
    const [deployer] = await hre.ethers.getSigners();

    stakingPool = await getStakingPool(hre);

    const rewardAsset = await getDai(hre);

    await rewardAsset
      .connect(deployer)
      .transfer(stakingPool.address, hre.ethers.utils.parseEther('10000000'));

    const amount = hre.ethers.utils.parseEther(args.amount);

    const withdrawTx = await stakingPool.connect(deployer).withdraw(amount, 1);
    await withdrawTx.wait();

    console.log(`Withdraw amount ${args.amount} success `);
  });

task('mainnet:initNewRound', 'Initiate staking round')
  .addParam('round', 'The round to initiate, first, second, third... ')
  .setAction(async (args: Args, hre: HardhatRuntimeEnvironment) => {
    const [deployer] = await hre.ethers.getSigners();
    const { get } = hre.deployments;

    const stakingPoolDeployment = await get('StakingPoolV2');

    const stakingPool = (await hre.ethers.getContractAt(
      stakingPoolDeployment.abi,
      stakingPoolDeployment.address
    )) as StakingPoolV2;

    const roundData: InitRoundData = rounds[args.round];
    const timestamp = hre.ethers.BigNumber.from(
      Date.UTC(
        roundData.year,
        roundData.month - 1,
        roundData.day,
        roundData.hour,
        roundData.minute
      ) / 1000
    );

    const initTx = await stakingPool
      .connect(deployer)
      .initNewRound(roundData.rewardPerSecond, timestamp, roundData.duration);
    await initTx.wait();

    console.log('Round initiated');
  });
