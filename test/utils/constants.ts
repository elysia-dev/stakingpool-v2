import { ethers } from 'hardhat';

export const SECONDSPERDAY = 86400;

export const RAY = ethers.utils.parseUnits('1', 27);
export const WAD = ethers.utils.parseUnits('1', 18);

export const MAX_UINT_AMOUNT = ethers.constants.MaxUint256

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
