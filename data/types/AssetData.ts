import { ABI } from 'hardhat-deploy/types';

export interface AssetData {
  [network: string]: {
    abi: ABI;
    address: string;
  };
}
