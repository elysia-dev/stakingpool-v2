import { ethers } from 'hardhat';

export const SECONDSPERDAY = '86400';

export const RAY = ethers.utils.parseUnits('1', 27).toString();
export const WAD = ethers.utils.parseUnits('1', 18).toString();
