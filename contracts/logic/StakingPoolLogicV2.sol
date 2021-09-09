// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import '../StakingPoolV2.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

library StakingPoolLogicV2 {
  using StakingPoolLogicV2 for StakingPoolV2.PoolData;

  event UpdateStakingPool(
    address indexed user,
    uint256 newRewardIndex,
    uint256 totalPrincipal,
    uint8 currentRound
  );

  function getRewardIndex(StakingPoolV2.PoolData storage poolData) internal view returns (uint256) {
    uint256 currentTimestamp = block.timestamp < poolData.endTimestamp
      ? block.timestamp
      : poolData.endTimestamp;
    uint256 timeDiff = currentTimestamp - poolData.lastUpdateTimestamp;
    uint256 totalPrincipal = poolData.totalPrincipal;

    if (timeDiff == 0) {
      return poolData.rewardIndex;
    }

    if (totalPrincipal == 0) {
      return poolData.rewardIndex;
    }

    // 1e27 = 1e18 * 1e9
    uint256 rewardIndexDiff = (timeDiff * 1e27) / totalPrincipal;

    return poolData.rewardIndex + rewardIndexDiff;
  }

  function getUserRewards(StakingPoolV2.PoolData storage poolData, address user)
    internal
    view
    returns (uint256[] memory)
  {
    uint256[] memory results;

    if (poolData.userIndex[user] == 0) {
      return results;
    }
    uint256 indexDiff = getRewardIndex(poolData) - poolData.userIndex[user];
    uint256 balance = poolData.userPrincipal[user];

    for (uint8 i = 0; i < poolData.rewardAssets.length; ++i) {
      uint256 result = poolData.userReward[user] +
        (((balance * indexDiff * poolData.rewardPerSeconds[i]) / 1e18) / 1e9);

      results[i] = result;
    }

    return results;
  }

  function getUserReward(StakingPoolV2.PoolData storage poolData, address user)
    internal
    view
    returns (uint256)
  {
    if (poolData.userIndex[user] == 0) {
      return 0;
    }
    uint256 indexDiff = getRewardIndex(poolData) - poolData.userIndex[user];
    uint256 balance = poolData.userPrincipal[user];

    uint256 result = poolData.userReward[user] + (balance * indexDiff) / 1e9;

    return result;
  }

  function updateStakingPool(
    StakingPoolV2.PoolData storage poolData,
    uint8 currentRound,
    address user
  ) internal {
    poolData.userReward[user] = getUserReward(poolData, user);
    poolData.rewardIndex = poolData.userIndex[user] = getRewardIndex(poolData);
    poolData.lastUpdateTimestamp = block.timestamp < poolData.endTimestamp
      ? block.timestamp
      : poolData.endTimestamp;
    emit UpdateStakingPool(msg.sender, poolData.rewardIndex, poolData.totalPrincipal, currentRound);
  }

  function batchTransferReward(
    StakingPoolV2.PoolData storage poolData,
    address user,
    address pool
  ) internal returns (uint256[] memory) {
    uint256[] memory rewardLefts;
    for (uint8 i = 0; i < poolData.rewardAssets.length; ++i) {
      IERC20 rewardAsset = poolData.rewardAssets[i];
      uint256 rewardPerSecond = poolData.rewardPerSeconds[i];
      uint256 reward = (getUserReward(poolData, user) * rewardPerSecond) / 1e18;

      SafeERC20.safeTransfer(rewardAsset, user, reward);

      uint256 rewardLeft = rewardAsset.balanceOf(pool);

      rewardLefts[i] = rewardLeft;
    }

    return rewardLefts;
  }

  function initRound(
    StakingPoolV2.PoolData storage poolData,
    IERC20[] memory rewardAssets,
    uint256[] memory rewardPerSeconds,
    uint256 roundStartTimestamp,
    uint256 duration
  ) internal returns (uint256, uint256) {
    poolData.rewardAssets = rewardAssets;
    poolData.rewardPerSeconds = rewardPerSeconds;
    poolData.startTimestamp = roundStartTimestamp;
    poolData.endTimestamp = roundStartTimestamp + (duration * 1 days);
    poolData.lastUpdateTimestamp = roundStartTimestamp;
    poolData.rewardIndex = 1e18;

    return (poolData.startTimestamp, poolData.endTimestamp);
  }

  function resetUserData(StakingPoolV2.PoolData storage poolData, address user) internal {
    poolData.userReward[user] = 0;
    poolData.userIndex[user] = 0;
    poolData.userPrincipal[user] = 0;
  }
}
