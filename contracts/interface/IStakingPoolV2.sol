// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IStakingPoolV2 {
  error NotInRound();
  error StakingNotInitiated();
  error InvaidAmount();
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
    uint256 userPrincipal
  );
  event Withdraw(
    address indexed user,
    uint256 amount,
    uint256 userIndex,
    uint256 userPrincipal
  );

  event Claim(address indexed user, uint256 reward, uint256 rewardLeft);

  event InitPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint256 endTimestamp
  );

  function stake(uint256 amount) external;

  function claim() external;

  function withdraw(uint256 amount) external;

  function getRewardIndex() external view returns (uint256);

  function getUserReward(address user) external view returns (uint256);

  function getPoolData()
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

  function getUserData(address user)
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
    uint256 duration
  ) external;
}
