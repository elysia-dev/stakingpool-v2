# Elyfi-StakingPoolV2

Elyfi staking pool version 2.

ELYFI is adding real estate to the DEFI concept. This is the expansion of the current crypto-to-crypto applications as ELYFI will introduce traditional assets to the open financial market.

In the Elyfi staking pool, users can stake crypto assets and take a reward for their staking. There are two crypto assets for staking, EL and ELFI, and corresponding staking pool contracts are deployed in the ethereum network.

In the case of the EL staking pool, users can stake EL token and claim ELFI as a reward, and the case of the ELFI staking pool, the reward asset is Dai stable coin.

Staking periods are distinguished and each is referred to as round. At the end of each round, users can withdraw or migrate their staking asset to the next round. In the migration process, accrued rewards are automatically transferred to the user.

Please note that this repository is under development.

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

```
#Deploy on live network
yarn hardhat deploy --network networkname --tags {elPool | elyfiPool}
(networkname : mainnet | ropsten | ... )

#Deploy on local network
yarn hardhat deploy --network networkname --tags testPool
(networkname : hardhat | ganache)
```

#### Testing

To run the tests, run:

```
yarn test
```

#### Tasks for test

You can interact and test elyfi stakingpool by running tasks. Below is implemented tasks

```
# Init New Round
yarn task --network networkname testnet:initNewRound --round {first|second|third...}

# Stake
yarn task --network networkname testnet:stake --amount amountToStake

# Withdraw
yarn task --network networkname testnet:withdraw --amount amountToStake --round {1 |2|3| ...}

```

#### Tasks for production

In the production, admin can initiate round by executing tasks.

```
# Init New Round in ElPool
yarn task --network networkname mainnet:initNewRound:elPool --round {first|second|third...}

# Init New Round in ElfiPool
yarn task --network networkname mainnet:initNewRound:elyfiPool --round {first|second|third...}

```

#### Function Call Gas Consumption

| Contract    | Method   | Min    | Max    | Avg    |
| ----------- | -------- | ------ | ------ | ------ |
| StakingPool | migrate  | 161524 | 201396 | 176571 |
| StakingPool | stake    | 95090  | 153608 | 134195 |
| StakingPool | withdraw | 43125  | 103221 | 69564  |
