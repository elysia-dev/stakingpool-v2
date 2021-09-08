import { ethers } from 'hardhat';

export const SECONDSPERDAY = '86400';

export const RAY = ethers.utils.parseUnits('1', 27).toString();
export const WAD = ethers.utils.parseUnits('1', 18).toString();

export const MAX_UINT_AMOUNT =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
