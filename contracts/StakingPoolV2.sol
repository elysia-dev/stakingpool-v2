// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import './logic/StakingPoolLogicV2.sol';
import './interface/IStakingPoolV2.sol';
import './token/StakedElyfiToken.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/// @title Elyfi StakingPool contract
/// @notice Users can stake their asset and earn reward for their staking.
/// The reward calculation is based on the reward index and user balance. The amount of reward index change
/// is inversely proportional to the total amount of supply. Accrued rewards can be obtained by multiplying
/// the difference between the user index and the current index by the user balance. User index and the pool
/// index is updated and aligned with in the staking and withdrawing action.
/// @author Elysia
contract StakingPoolV2 is IStakingPoolV2, StakedElyfiToken {
  using StakingPoolLogicV2 for PoolData;

  constructor(IERC20 stakingAsset_) StakedElyfiToken(stakingAsset_) {
    stakingAsset = stakingAsset_;
    _admin = msg.sender;
  }

  struct PoolData {
    uint256 rewardPerSecond;
    uint256 rewardIndex;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 totalPrincipal;
    uint256 lastUpdateTimestamp;
    mapping(address => uint256) userIndex;
    mapping(address => uint256) userReward;
    mapping(address => uint256) userPrincipal;
    IERC20 rewardAsset;
    bool isPause;
  }

  uint8 public currentPoolID;
  IERC20 stakingAsset;
  address internal _admin;
  mapping(uint8 => PoolData) internal _poolID;

  /***************** View functions ******************/

  /// @notice Returns reward index of the round
  /// @param poolID The round of the pool
  function getRewardIndex(uint8 poolID) external view override returns (uint256) {
    PoolData storage poolData = _poolID[poolID];
    return poolData.getRewardIndex();
  }

  /// @notice Returns user accrued reward index of the round
  /// @param user The user address
  /// @param poolID The pool ID of the pool
  function getUserReward(address user, uint8 poolID) external view override returns (uint256) {
    PoolData storage poolData = _poolID[poolID];
    return poolData.getUserReward(user);
  }

  /// @notice Returns the state and data of the round
  /// @param poolID The pool ID of the pool
  /// @return rewardPerSecond The total reward accrued per second in the round
  /// @return rewardIndex The reward index of the round
  /// @return startTimestamp The start timestamp of the round
  /// @return endTimestamp The end timestamp of the round
  /// @return totalPrincipal The total staked amount of the round
  /// @return lastUpdateTimestamp The last update timestamp of the round
  function getPoolData(uint8 poolID)
    external
    view
    override
    returns (
      uint256 rewardPerSecond,
      uint256 rewardIndex,
      uint256 startTimestamp,
      uint256 endTimestamp,
      uint256 totalPrincipal,
      uint256 lastUpdateTimestamp
    )
  {
    PoolData storage poolData = _poolID[poolID];
    return (
      poolData.rewardPerSecond,
      poolData.rewardIndex,
      poolData.startTimestamp,
      poolData.endTimestamp,
      poolData.totalPrincipal,
      poolData.lastUpdateTimestamp
    );
  }

  /// @notice Returns the state and data of the user
  /// @param poolID The round of the pool
  /// @param user The user address
  function getUserData(uint8 poolID, address user)
    external
    view
    override
    returns (
      uint256 userIndex,
      uint256 userReward,
      uint256 userPrincipal
    )
  {
    PoolData storage poolData = _poolID[poolID];

    return (poolData.userIndex[user], poolData.userReward[user], poolData.userPrincipal[user]);
  }

  /***************** External functions ******************/

  /// @notice Stake the amount of staking asset to pool contract and update data.
  /// @param amount Amount to stake.
  /// @param poolID The pool ID of the pool
  function stake(uint256 amount, uint8 poolID) external override {
    if(_isOpen(poolID) == false) revert InvalidPoolID();
  
    PoolData storage poolData = _poolID[poolID];
    if (poolID > currentPoolID) revert NotInitiatedRound(poolID, currentPoolID);
    if (amount == 0) revert InvalidAmount();

    poolData.updateStakingPool(poolID, msg.sender);

    _depositFor(msg.sender, amount);

    poolData.userPrincipal[msg.sender] += amount;
    poolData.totalPrincipal += amount;

    emit Stake(
      msg.sender,
      amount,
      poolData.userIndex[msg.sender],
      poolData.userPrincipal[msg.sender],
      poolID
    );
  }

  /// @notice Withdraw the amount of principal from the pool contract and update data
  /// @param amount Amount to withdraw
  /// @param poolID The pool ID to withdraw
  function withdraw(uint256 amount, uint8 poolID) external override {
    _withdraw(amount, poolID);
  }

  /// @notice Transfer accrued reward to msg.sender. User accrued reward will be reset and user reward index will be set to the current reward index.
  /// @param poolID The pool ID to claim
  function claim(uint8 poolID) external override {
    _claim(msg.sender, poolID);
  }

  /// @notice Migrate the amount of principal to the current round and transfer the rest principal to the caller
  /// @param amount Amount to migrate.
  /// @param fromPoolID The closed pool ID to migrate, source
  /// @param toPoolID The opened pool, destination
  function migrate(uint256 amount, uint8 fromPoolID, uint8 toPoolID) external override {
    if (toPoolID > currentPoolID) revert NotInitiatedRound(toPoolID, currentPoolID);
    if (_isOpen(toPoolID) == false) revert InvalidPoolID();
    if (_isOpen(fromPoolID) == true) revert InvalidPoolID();


    PoolData storage poolData = _poolID[fromPoolID];
    uint256 userPrincipal = poolData.userPrincipal[msg.sender];

    if (userPrincipal == 0) revert ZeroPrincipal();

    uint256 amountToWithdraw = userPrincipal - amount;

    // Claim reward
    if (poolData.getUserReward(msg.sender) != 0) {
      _claim(msg.sender, fromPoolID);
    }

    // Withdraw
    if (amountToWithdraw != 0) {
      _withdraw(amountToWithdraw, fromPoolID);
    }

    // Update current pool
    PoolData storage currentPoolData = _poolID[toPoolID];
    currentPoolData.updateStakingPool(toPoolID, msg.sender);

    // Migrate user principal
    poolData.userPrincipal[msg.sender] -= amount;
    currentPoolData.userPrincipal[msg.sender] += amount;

    // Migrate total principal
    poolData.totalPrincipal -= amount;
    currentPoolData.totalPrincipal += amount;

    emit Stake(
      msg.sender,
      amount,
      currentPoolData.userIndex[msg.sender],
      currentPoolData.userPrincipal[msg.sender],
      toPoolID
    );

    emit Migrate(msg.sender, amount, fromPoolID, toPoolID);
  }

  /***************** Internal Functions ******************/

  function _withdraw(uint256 amount, uint8 poolID) internal {
    PoolData storage poolData = _poolID[poolID];
    uint256 amountToWithdraw = amount;

    if (poolID > currentPoolID) revert NotInitiatedRound(poolID, currentPoolID);
    if (amount == type(uint256).max) {
      amountToWithdraw = poolData.userPrincipal[msg.sender];
    }
    if (poolData.userPrincipal[msg.sender] < amountToWithdraw)
      revert NotEnoughPrincipal(poolData.userPrincipal[msg.sender]);

    poolData.updateStakingPool(poolID, msg.sender);

    poolData.userPrincipal[msg.sender] -= amountToWithdraw;
    poolData.totalPrincipal -= amountToWithdraw;

    _withdrawTo(msg.sender, amountToWithdraw);

    emit Withdraw(
      msg.sender,
      amountToWithdraw,
      poolData.userIndex[msg.sender],
      poolData.userPrincipal[msg.sender],
      poolID
    );
  }

  function _claim(address user, uint8 poolID) internal {
    if (poolID > currentPoolID) revert NotInitiatedRound(poolID, currentPoolID);

    PoolData storage poolData = _poolID[poolID];

    uint256 reward = poolData.getUserReward(user);

    if (reward == 0) revert ZeroReward();

    poolData.userReward[user] = 0;
    poolData.userIndex[user] = poolData.getRewardIndex();

    SafeERC20.safeTransfer(_poolID[poolID].rewardAsset, user, reward);

    uint256 rewardLeft = _poolID[poolID].rewardAsset.balanceOf(address(this));

    emit Claim(user, reward, rewardLeft, poolID);
  }

  function _isOpen(uint8 poolID) internal view returns (bool) {
    PoolData storage poolData =  _poolID[poolID];
    if (poolData.startTimestamp > block.timestamp || poolData.endTimestamp < block.timestamp)
      return false;
    else 
      return true;
  }

  /***************** Admin Functions ******************/

  /// @notice Init the new round. After the round closed, staking is not allowed.
  /// @param rewardPerSecond The total accrued reward per second in new pool
  /// @param startTimestamp The start timestamp of initiated pool
  /// @param duration The duration of the initiated pool
  function initNewPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint256 duration,
    IERC20 rewardAsset_
  ) external override payable onlyAdmin {

    uint8 newPoolID = currentPoolID + 1;

    (uint256 newRoundStartTimestamp, uint256 newRoundEndTimestamp) = _poolID[newPoolID].initRound(
      rewardPerSecond,
      startTimestamp,
      duration,
      rewardAsset_
    );

    SafeERC20.safeTransferFrom(rewardAsset_, msg.sender, address(this), duration * rewardPerSecond);

    currentPoolID = newPoolID;
    emit InitRound(rewardPerSecond, newRoundStartTimestamp, newRoundEndTimestamp, currentPoolID);
  }

  function retrieveResidue(uint8 poolID) external onlyAdmin {
    SafeERC20.safeTransfer(_poolID[poolID].rewardAsset, _admin, _poolID[poolID].rewardAsset.balanceOf(address(this)));
  }


  /***************** Modifier ******************/

  modifier onlyAdmin() {
    if (msg.sender != _admin) revert OnlyAdmin();
    _;
  }

  modifier isNotPause(uint8 poolID) {
    if (_poolID[poolID].isPause == false) revert();
    _;
  }
}
