import { ethers } from 'ethers';
import { ERC20__factory, StakingPoolV2__factory } from '../../typechain';

export const getNamedContracts = (provider: ethers.providers.JsonRpcProvider) => {
  return {
    elfiV2StakingPool: StakingPoolV2__factory.connect(
      "0xCD668B44C7Cf3B63722D5cE5F655De68dD8f2750",
      provider,
    ),
    elToken: ERC20__factory.connect(
      "0x2781246fe707bB15CeE3e5ea354e2154a2877B16",
      provider
    ),
    elfiToken: ERC20__factory.connect(
      "0x4dA34f8264CB33A5c9F17081B9EF5Ff6091116f4",
      provider
    ),
    daiToken: ERC20__factory.connect(
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      provider
    ),
    usdtToken: ERC20__factory.connect(
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      provider
    ),
    wethToken: ERC20__factory.connect(
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      provider
    ),
  }
}
