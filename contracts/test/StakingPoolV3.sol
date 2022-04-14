// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import './StakingPoolLogicV3.sol';
import '../interface/INextStakingPool.sol';
import '../token/StakedElyfiToken.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract StakingPoolV3 is INextStakingPool, StakedElyfiToken {
  using StakingPoolLogicV3 for PoolData;
  constructor(IERC20 stakingAsset_, IERC20 rewardAsset_) StakedElyfiToken(stakingAsset_) {
    stakingAsset = stakingAsset_;
    rewardAsset = rewardAsset_;
    _admin = msg.sender;
  }

  struct PoolData {
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




  //=================== view ==================
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
    return stakingAsset.balanceOf(address(this));
  }


  // ================   main  ==============
  function stake(uint256 amount) external {
    _poolData.updateStakingPool(msg.sender);
    _depositFor(msg.sender, amount);

    _poolData.userPrincipal[msg.sender] += amount;
    _poolData.totalPrincipal += amount;
  }

  function withdraw(uint256 amount) external  {
    _withdraw(amount);
  }

  /// @notice Transfer accrued reward to msg.sender. User accrued reward will be reset and user reward index will be set to the current reward index.
  function claim() external {
    _claim(msg.sender);
  }

  function _withdraw(uint256 amount) internal {
    uint256 amountToWithdraw = amount;

    if (amount == type(uint256).max) {
      amountToWithdraw = _poolData.userPrincipal[msg.sender];
    }
    
    _poolData.updateStakingPool(msg.sender);

    _poolData.userPrincipal[msg.sender] -= amountToWithdraw;
    _poolData.totalPrincipal -= amountToWithdraw;

    _withdrawTo(msg.sender, amountToWithdraw);
  }

  function _claim(address user) internal {
    uint256 reward = _poolData.getUserReward(user);

    _poolData.userReward[user] = 0;
    _poolData.userIndex[user] = _poolData.getRewardIndex();

    SafeERC20.safeTransfer(rewardAsset, user, reward);

    uint256 rewardLeft = rewardAsset.balanceOf(address(this));

  }


  function initNewPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint32 duration
  ) external override {
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