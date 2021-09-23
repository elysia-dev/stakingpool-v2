Users can stake their asset and earn reward for their staking.
The reward calculation is based on the reward index and user balance. The amount of reward index change
is inversely proportional to the total amount of supply. Accrued rewards can be obtained by multiplying
the difference between the user index and the current index by the user balance. User index and the pool
index is updated and aligned with in the staking and withdrawing action.



## Functions
### constructor
```solidity
  function constructor(
  ) public
```




### getRewardIndex
```solidity
  function getRewardIndex(
    uint8 round
  ) external returns (uint256)
```
Returns reward index of the round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`round` | uint8 | The round of the pool

### getUserReward
```solidity
  function getUserReward(
    address user,
    uint8 round
  ) external returns (uint256)
```
Returns user accrued reward index of the round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`user` | address | The user address
|`round` | uint8 | The round of the pool

### getPoolData
```solidity
  function getPoolData(
    uint8 round
  ) external returns (uint256 rewardPerSecond, uint256 rewardIndex, uint256 startTimestamp, uint256 endTimestamp, uint256 totalPrincipal, uint256 lastUpdateTimestamp)
```
Returns the state and data of the round


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`round` | uint8 | The round of the pool

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`rewardPerSecond`| uint8 | The total reward accrued per second in the round
|`rewardIndex`|  | The reward index of the round
|`startTimestamp`|  | The start timestamp of the round
|`endTimestamp`|  | The end timestamp of the round
|`totalPrincipal`|  | The total staked amount of the round
|`lastUpdateTimestamp`|  | The last update timestamp of the round
### getUserData
```solidity
  function getUserData(
    uint8 round,
    address user
  ) external returns (uint256 userIndex, uint256 userReward, uint256 userPrincipal)
```
Returns the state and data of the user


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`round` | uint8 | The round of the pool
|`user` | address | The user address

### stake
```solidity
  function stake(
    uint256 amount
  ) external
```
Stake the amount of staking asset to pool contract and update data.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`amount` | uint256 | Amount to stake.

### withdraw
```solidity
  function withdraw(
    uint256 amount,
    uint8 round
  ) external
```
Withdraw the amount of principal from the pool contract and update data


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`amount` | uint256 | Amount to withdraw
|`round` | uint8 | The round to withdraw

### claim
```solidity
  function claim(
    uint8 round
  ) external
```
Transfer accrued reward to msg.sender. User accrued reward will be reset and user reward index will be set to the current reward index.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`round` | uint8 | The round to claim

### migrate
```solidity
  function migrate(
    uint256 amount,
    uint8 round
  ) external
```
Migrate the amount of principal to the current round and transfer the rest principal to the caller


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`amount` | uint256 | Amount to migrate.
|`round` | uint8 | The closed round to migrate

### _withdraw
```solidity
  function _withdraw(
  ) internal
```




### _claim
```solidity
  function _claim(
  ) internal
```




### initNewRound
```solidity
  function initNewRound(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint256 duration
  ) external
```
Init the new round. After the round closed, staking is not allowed.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`rewardPerSecond` | uint256 | The total accrued reward per second in new round
|`startTimestamp` | uint256 | The start timestamp of initiated round
|`duration` | uint256 | The duration of the initiated round

### retrieveResidue
```solidity
  function retrieveResidue(
  ) external
```




