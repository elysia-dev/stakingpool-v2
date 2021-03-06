import { expect } from 'chai';
import { utils } from 'ethers';
import { waffle } from 'hardhat';
import TestEnv from './types/TestEnv';
import { MAX_UINT_AMOUNT, RAY, SECONDSPERDAY, ZERO_ADDRESS } from './utils/constants';
import { createTestActions, TestHelperActions } from './utils/helpers';
import { buildDelegationData, getSignatureFromTypedData } from './utils/signature';
import { setTestEnv } from './utils/testEnv';
import { advanceTimeTo, toTimestamp } from './utils/time';

const { loadFixture } = waffle;

require('./utils/matchers.ts');

describe('StakingPool.token', () => {
  let testEnv: TestEnv;
  let actions: TestHelperActions;
  let chainId: number;

  const provider = waffle.provider;
  const [deployer, alice, bob, carol] = provider.getWallets();

  const rewardPersecond = utils.parseEther('1');
  const duration = 30 * SECONDSPERDAY;

  const startTimestamp = toTimestamp('2022.07.08 10:00:00Z');

  async function fixture() {
    const testEnv = await setTestEnv();
    await testEnv.rewardAsset.connect(deployer).faucet();
    await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
    await testEnv.stakingPool
      .connect(deployer)
      .initNewPool(rewardPersecond, startTimestamp, duration);
    return testEnv;
  }

  before(async () => {
    chainId = (await waffle.provider.getNetwork()).chainId;
  });

  beforeEach('deploy and init staking pool', async () => {
    testEnv = await loadFixture(fixture);
    actions = createTestActions(testEnv);
  });

  context('ERC20', async () => {
    beforeEach('deploy staking pool', async () => {
      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(startTimestamp);
    });

    it('ERC20 functions are unavailable', async () => {
      await testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'));
      await expect(
        testEnv.stakingPool.connect(alice).transfer(bob.address, utils.parseEther('100'))
      ).to.be.revertedWith('');
      await expect(
        testEnv.stakingPool
          .connect(alice)
          .transferFrom(alice.address, bob.address, utils.parseEther('100'))
      ).to.be.revertedWith('');
      await expect(
        testEnv.stakingPool.connect(alice).allowance(bob.address, alice.address)
      ).to.be.revertedWith('');
      await expect(
        testEnv.stakingPool.connect(alice).approve(bob.address, utils.parseEther('100'))
      ).to.be.revertedWith('');
      await expect(
        testEnv.stakingPool.connect(alice).increaseAllowance(bob.address, utils.parseEther('100'))
      ).to.be.revertedWith('');
      await expect(
        testEnv.stakingPool.connect(alice).decreaseAllowance(bob.address, utils.parseEther('100'))
      ).to.be.revertedWith('');
    });
  });

  context('ERC20Wrapper', async () => {
    beforeEach('deploy staking pool', async () => {
      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(startTimestamp);
    });

    it('wrapper tokens are minted in staking', async () => {
      const tx = await testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'));
      expect(tx)
        .to.emit(testEnv.stakingPool, 'Transfer')
        .withArgs(ZERO_ADDRESS, alice.address, utils.parseEther('100'));
      expect(await testEnv.stakingPool.balanceOf(alice.address)).to.be.equal(
        utils.parseEther('100')
      );
    });

    it('wrapper tokens are burned in unstaking', async () => {
      await testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'));
      const tx = await testEnv.stakingPool.connect(alice).withdraw(utils.parseEther('100'));
      expect(tx)
        .to.emit(testEnv.stakingPool, 'Transfer')
        .withArgs(alice.address, ZERO_ADDRESS, utils.parseEther('100'));
    });
  });

  context('ERC20Votes', async () => {
    beforeEach('time passes', async () => {
      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(startTimestamp);
      await testEnv.stakingPool.connect(alice).stake(utils.parseEther('100'));
    });

    it('voting power should be 0 before self delegation', async () => {
      expect(await testEnv.stakingPool.balanceOf(alice.address)).to.be.equal(
        utils.parseEther('100')
      );
      expect(await testEnv.stakingPool.getVotes(alice.address)).to.be.equal(0);
    });

    it('self delegation', async () => {
      await testEnv.stakingPool.connect(alice).delegate(alice.address);
      expect(await testEnv.stakingPool.getVotes(alice.address)).to.be.equal(
        utils.parseEther('100')
      );
    });

    it('delegates by sig', async () => {
      const nonce = '0';
      const data = buildDelegationData(
        chainId,
        testEnv.stakingPool.address,
        alice.address,
        nonce,
        MAX_UINT_AMOUNT.toString()
      );
      const signature = getSignatureFromTypedData(alice.privateKey, data);

      await testEnv.stakingPool.delegateBySig(
        alice.address,
        nonce,
        MAX_UINT_AMOUNT,
        signature.v,
        signature.r,
        signature.s
      );
      expect(await testEnv.stakingPool.getVotes(alice.address)).to.be.equal(
        utils.parseEther('100')
      );
    });
  });

  context('ERC20 permit', async () => {
    beforeEach('init the first round and time passes', async () => {
      await testEnv.rewardAsset.connect(deployer).faucet();
      await testEnv.rewardAsset.connect(deployer).approve(testEnv.stakingPool.address, RAY);
      await actions.initNewPoolAndTransfer(deployer, rewardPersecond, startTimestamp, duration);

      await testEnv.stakingAsset.connect(alice).faucet();
      await testEnv.stakingAsset.connect(alice).approve(testEnv.stakingPool.address, RAY);
      await testEnv.stakingAsset.connect(bob).faucet();
      await testEnv.stakingAsset.connect(bob).approve(testEnv.stakingPool.address, RAY);
      await advanceTimeTo(startTimestamp);
    });
  });
});
