import { ethers } from 'hardhat';
import { expect } from 'chai';
import { setERC20Metadata } from '../utils/testEnv';
import { StakedElyfiToken } from '../../typechain';

describe('StakedToken', () => {
  let stakedElysiaToken: StakedElyfiToken;

  describe('constructor', () => {
    before(async () => {
      const erc20MetadataLibrary = await setERC20Metadata();
      const stakingAssetFactory = await ethers.getContractFactory('StakingAsset');
      const elysiaToken = await stakingAssetFactory.deploy('Elysia', 'EL')
      const stakedTokenFactory = await ethers.getContractFactory(
        'StakedElyfiToken',
        {
          libraries: {
            ERC20Metadata: erc20MetadataLibrary.address
          }
        }
      );

      stakedElysiaToken = await stakedTokenFactory.deploy(elysiaToken.address) as StakedElyfiToken
    })

    it('is named Staked${underlyingTokenName}', async () => {
      expect(await stakedElysiaToken.name()).to.equal('StakedElysia')
    });

    it("has a symbol with a prefix 's'", async () => {
      expect(await stakedElysiaToken.symbol()).to.equal('sEL')
    });
  });
});