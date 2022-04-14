// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import './StakingPoolLogicV3.sol';
import '../interface/IStakingPoolV2.sol';
import '../interface/INextStakingPool.sol';
import '../token/StakedElyfiToken.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract StakingPoolV3 is INextStakingPool {
  using StakingPoolLogicV3 for PoolData;
  constructor(IERC20 stakingAsset_, IERC20 rewardAsset_) {
    stakingAsset = stakingAsset_;
    rewardAsset = rewardAsset_;
    _admin = msg.sender;
  }

  struct PoolData {
    uint8 rewardPerSecondReduceRate;
    uint32 duration;
    uint256 rewardPerSecond;
    uint256 rewardIndex;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 lastUpdateTimestamp;
    uint256 totalPrincipal;
    uint256 nextRewardAmount;
    mapping(address => uint256) userIndex;
    mapping(address => uint256) userReward;
    mapping(address => uint256) userPrincipal;
    bool isOpened;
    bool isFinished;
  }
  address internal _admin;
  IERC20 public stakingAsset;
  IERC20 public rewardAsset;
  PoolData internal _poolData;

  /// @notice Returns reward index of the round
  function getRewardIndex() external view returns (uint256) {
    return _poolData.getRewardIndex();
  }

  /// @notice Returns user accrued reward index of the round
  /// @param user The user address
  function getUserReward(address user) external view returns (uint256) {
    return _poolData.getUserReward(user);
  }

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
    )
  {
    return (
      _poolData.rewardPerSecond,
      _poolData.rewardIndex,
      _poolData.startTimestamp,
      _poolData.endTimestamp,
      _poolData.totalPrincipal,
      _poolData.lastUpdateTimestamp
    );
  }

  function getUserData(address user)
    external
    view
    returns (
      uint256 userIndex,
      uint256 userReward,
      uint256 userPrincipal
    )
  {
    return (_poolData.userIndex[user], _poolData.userReward[user], _poolData.userPrincipal[user]);
  }

  function setPreviousPoolData(address user, uint256 amount) external override {
    _poolData.updateStakingPool(user);
    _poolData.userPrincipal[user] += amount;
    _poolData.totalPrincipal += amount;
  }

  function getContractBalance() external view returns(uint256) {
    return rewardAsset.balanceOf(address(this)) - _poolData.totalPrincipal;
  }

  function initNewPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint32 duration
  ) external override {
    if (_poolData.isFinished == true) revert Finished();
    (uint256 newRoundStartTimestamp, uint256 newRoundEndTimestamp) = _poolData.initRound(
      rewardPerSecond,
      startTimestamp,
      duration
    );
    _poolData.isOpened = true;

    SafeERC20.safeTransferFrom(rewardAsset, msg.sender, address(this), duration * rewardPerSecond);
  }

  modifier onlyAdmin() {
    if (msg.sender != _admin) revert OnlyAdmin();
    _;
  }
}