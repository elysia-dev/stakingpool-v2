// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface INextStakingPool {
  error OnlyAdmin();
  error Finished();
  function setPreviousPoolData(address user, uint256 amount) external;

  function initNewPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint32 duration
  ) external;
}