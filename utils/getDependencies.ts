import '@nomiclabs/hardhat-waffle';
import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { AssetData } from '../data/types/AssetData';

export const getElToken = async (hre: HardhatRuntimeEnvironment) => {
  let el: Contract;

  const data: AssetData = require('../data/assets/el').default;

  el = await hre.ethers.getContractAt(data[hre.network.name].abi, data[hre.network.name].address);
  return el;
};

export const getElyfi = async (hre: HardhatRuntimeEnvironment) => {
  let elyfi: Contract;

  const data: AssetData = require('../data/assets/elyfi').default;

  elyfi = await hre.ethers.getContractAt(
    data[hre.network.name].abi,
    data[hre.network.name].address
  );
  return elyfi;
};

export const getDai = async (hre: HardhatRuntimeEnvironment) => {
  let dai: Contract;

  const data: AssetData = require('../data/assets/dai').default;

  dai = await hre.ethers.getContractAt(data[hre.network.name].abi, data[hre.network.name].address);

  return dai;
};

export const getBusd = async (hre: HardhatRuntimeEnvironment) => {
  let busd: Contract;

  const data: AssetData = require('../data/assets/busd').default;

  busd = await hre.ethers.getContractAt(data[hre.network.name].abi, data[hre.network.name].address);

  return busd;
};
