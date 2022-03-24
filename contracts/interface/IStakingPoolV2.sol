// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IStakingPoolV2 {
  error InvalidPoolID();
  error NotInRound();
  error StakingNotInitiated();
  error InvalidAmount();
  error ZeroReward();
  error OnlyAdmin();
  error RoundConflicted();
  error NotEnoughPrincipal(uint256 principal);
  error NotInitiatedRound(uint8 round, uint8 currentRound);
  error ZeroPrincipal();

  event Stake(
    address indexed user,
    uint256 amount,
    uint256 userIndex,
    uint256 userPrincipal,
    uint8 currentRound
  );
  event Withdraw(
    address indexed user,
    uint256 amount,
    uint256 userIndex,
    uint256 userPrincipal,
    uint8 currentRound
  );

  event Claim(address indexed user, uint256 reward, uint256 rewardLeft, uint8 currentRound);

  event InitRound(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint256 endTimestamp,
    uint256 currentRound
  );

  event Migrate(address user, uint256 amount, uint8 migrateRound, uint8 currentRound);

  function stake(uint256 amount, uint8 poolID) external;

  function claim(uint8 round) external;

  function withdraw(uint256 amount, uint8 round) external;

  function migrate(uint256 amount, uint8 fromPoolID, uint8 toPoolID) external ;


  function getRewardIndex(uint8 round) external view returns (uint256);

  function getUserReward(address user, uint8 round) external view returns (uint256);

  function getPoolData(uint8 round)
    external
    view
    returns (
      uint256 rewardPerSecond,
      uint256 rewardIndex,
      uint256 startTimestamp,
      uint256 endTimestamp,
      uint256 totalPrincipal,
      uint256 lastUpdateTimestamp
    );

  function getUserData(uint8 round, address user)
    external
    view
    returns (
      uint256 userIndex,
      uint256 userReward,
      uint256 userPrincipal
    );

  function initNewPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint256 duration,
    IERC20 rewardAsset_
  ) external;
}
