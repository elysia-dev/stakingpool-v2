import { BigNumber, utils } from 'ethers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('StakedToken', () => {
  describe('constructor', () => {
    it('uses the name and symbol of the underlying token', async () => {
      const stakingAssetFactory = await ethers.getContractFactory('StakingAsset');
      const elysiaToken = await stakingAssetFactory.deploy('Elysia', 'EL')

      const stakedTokenFactory = await ethers.getContractFactory('StakedElyfiToken');
      const stakedElysiaToken = await stakedTokenFactory.deploy(elysiaToken.address)

      expect(await stakedElysiaToken.name()).to.equal('StakedElysiaToken')
      expect(await stakedElysiaToken.symbol()).to.equal('sEL')
    });
  });
});