import { ethers } from 'ethers';

export const getNamedSigners = (provider: ethers.providers.JsonRpcProvider) => {
  return {
    deployer: provider.getSigner('0x715b006d4723977ccdb1581a62948f6354752e62'),
    elRich: provider.getSigner('0x8FcaB1b9c72FcFaF1C1fA80184a6Df08e7a9f486'),
    daiRich: provider.getSigner('0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0'),
    elfiRich: provider.getSigner('0x2C1Fe813dd584404d6c934451FcDaFBbf07A8147'),
    usdtRich: provider.getSigner('0xA929022c9107643515F5c777cE9a910F0D1e490C'),
    wethRich: provider.getSigner('0xF977814e90dA44bFA03b6295A0616a897441aceC'),
  }
}
