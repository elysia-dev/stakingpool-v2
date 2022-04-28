# Elyfi-StakingPoolV2

Elyfi staking pool version 2.

ELYFI is adding real estate to the DEFI concept. This is the expansion of the current crypto-to-crypto applications as ELYFI will introduce traditional assets to the open financial market.

In the Elyfi staking pool, users can stake crypto assets and take a reward for their staking. There are two crypto assets for staking, EL and ELFI, and corresponding staking pool contracts are deployed in the ethereum network.

### Elyfi

- [The elyfi main website](https://defi.elysia.land/)

### Documents

The documentation of Elyfi is in the following link.

- [The elyfi docs](https://elyfi-docs.elysia.land/v/eng/)

### Contract Addresses
ETH Mainnet (chainId: 1)
| Contract   | Address |
| ------- | ------- |
| EL StakingPool | [0x3f0c3e32bb166901acd0abc9452a3f0c5b8b2c9d](https://etherscan.io/address/0x3f0c3e32bb166901acd0abc9452a3f0c5b8b2c9d#contracts) |
| ELFI StakingPool | [0x24a7fb55e4ac2cb40944bc560423b496dfa8803f](https://etherscan.io/address/0x24a7fb55e4ac2cb40944bc560423b496dfa8803f#contracts) |
| ELFI-DAI LP StakingPool | [0xf26546ee9562ed60f680c747f28a6ae67a805c90](https://etherscan.io/address/0xf26546ee9562ed60f680c747f28a6ae67a805c90#contracts) |
| ELFI-ETH LP StakingPool | [0xa33cfb48338450aecc3e7da69e7f99ac923cfc28](https://etherscan.io/address/0xa33cfb48338450aecc3e7da69e7f99ac923cfc28#contracts) |

BSC (chainId: 56)
| Contract   | Address |
| ------- | ------- |
| ELFI StakingPool(BSC) | [0x861c2221e4d73a97cd94e64c7287fd968cba03e4](https://bscscan.com/address/0x861c2221e4d73a97cd94e64c7287fd968cba03e4) |

### Community

For questions about elyfi staking pool, you can join our [telegram channel](https://t.me/elysia_official)

### Development

#### Set up environment variables

Set up `.env` file in the project directory and add the following environment variables:

```
ADMIN= {admin private key for production}
TEST_MNEMONIC= {mnemonic phrase for testnet}
ETHERSCAN_API_KEY= {etherscan api key for verifying}
```

#### Deployments

```sh
yarn hardhat deploy --network networkname --tags {elPool | elyfiPool | daiLpPool | ethLpPool }
(networkname : mainnet | ropsten | hardhat | ganache ... )
```

#### Testing

To run the tests, run:

```
yarn test
```

#### Tasks

You can interact and test elyfi stakingpool by running tasks. Below is implemented tasks

```sh
# Init New Staking Pool
yarn task --network networkname prepare-staking-el
yarn task --network networkname prepare-staking-elfi
yarn task --network networkname prepare-staking-dai-lp
yarn task --network networkname prepare-staking-eth-lp

# Stake
yarn task --network networkname testnet:stake --amount amountToStake

# Withdraw
yarn task --network networkname testnet:withdraw --amount amountToStake

```

#### Function Call Gas Consumption

| Contract    | Method   | Min    | Max    | Avg    |
| ----------- | -------- | ------ | ------ | ------ |
| StakingPool | migrate  | 161524 | 201396 | 176571 |
| StakingPool | stake    | 95090  | 153608 | 134195 |
| StakingPool | withdraw | 43125  | 103221 | 69564  |
