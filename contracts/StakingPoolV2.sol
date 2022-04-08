// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import './logic/StakingPoolLogicV2.sol';
import './interface/IStakingPoolV2.sol';
import './interface/INextStakingPool.sol';
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

  constructor(IERC20 stakingAsset_, IERC20 rewardAsset_) StakedElyfiToken(stakingAsset_) {
    stakingAsset = stakingAsset_;
    rewardAsset = rewardAsset_;
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
    bool isOpened;
    bool isFinished;
  }

  address internal _admin;
  address internal _nextContractAddr;
  IERC20 public stakingAsset;
  IERC20 public rewardAsset;
  PoolData internal _poolData;

  /***************** View functions ******************/

  /// @notice Returns reward index of the round
  function getRewardIndex() external view override returns (uint256) {
    return _poolData.getRewardIndex();
  }

  /// @notice Returns user accrued reward index of the round
  /// @param user The user address
  function getUserReward(address user) external view override returns (uint256) {
    return _poolData.getUserReward(user);
  }

  /// @notice Returns the state and data of the round
  /// @return rewardPerSecond The total reward accrued per second in the round
  /// @return rewardIndex The reward index of the round
  /// @return startTimestamp The start timestamp of the round
  /// @return endTimestamp The end timestamp of the round
  /// @return totalPrincipal The total staked amount of the round
  /// @return lastUpdateTimestamp The last update timestamp of the round
  function getPoolData()
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
    return (
      _poolData.rewardPerSecond,
      _poolData.rewardIndex,
      _poolData.startTimestamp,
      _poolData.endTimestamp,
      _poolData.totalPrincipal,
      _poolData.lastUpdateTimestamp
    );
  }

  /// @notice Returns the state and data of the user
  /// @param user The user address
  function getUserData(address user)
    external
    view
    override
    returns (
      uint256 userIndex,
      uint256 userReward,
      uint256 userPrincipal
    )
  {
    return (_poolData.userIndex[user], _poolData.userReward[user], _poolData.userPrincipal[user]);
  }

  /***************** External functions ******************/

  /// @notice Stake the amount of staking asset to pool contract and update data.
  /// @param amount Amount to stake.
  function stake(uint256 amount) external override stakingInitiated {
    if (_poolData.isOpened == false) revert Closed();
    if (amount == 0) revert InvalidAmount();
    _poolData.updateStakingPool(msg.sender);
    _depositFor(msg.sender, amount);

    _poolData.userPrincipal[msg.sender] += amount;
    _poolData.totalPrincipal += amount;

    emit Stake(
      msg.sender,
      amount,
      _poolData.userIndex[msg.sender],
      _poolData.userPrincipal[msg.sender]
    );
  }

  /// @notice Withdraw the amount of principal from the pool contract and update data
  /// @param amount Amount to withdraw
  function withdraw(uint256 amount) external override stakingInitiated {
    _withdraw(amount);
  }

  /// @notice Transfer accrued reward to msg.sender. User accrued reward will be reset and user reward index will be set to the current reward index.
  function claim() external override stakingInitiated {
    _claim(msg.sender);
  }

  /// @notice Migrate the amount of principal to the current round and transfer the rest principal to the caller
  function migrate() external override {
    if (_poolData.isOpened == true) revert Opened();
    if (_nextContractAddr == address(0)) revert NotSetContractAddr();
    if (_poolData.userPrincipal[msg.sender] == 0) revert ZeroPrincipal();
    uint256 amount = _poolData.userPrincipal[msg.sender];

    // Claim reward
    if (_poolData.getUserReward(msg.sender) != 0) {
      _claim(msg.sender);
    }

    // Update current pool
    _poolData.updateStakingPool(msg.sender);

    // Migrate user, total principal 
    _poolData.userPrincipal[msg.sender] -= amount;
    _poolData.totalPrincipal -= amount;

    // Migrate
    _migrateFor(_nextContractAddr, amount);

    // Call next contract
    INextStakingPool nextContract = INextStakingPool(_nextContractAddr);

    // Migrate next contract of user, total principal
    nextContract.setPreviousUserPrincipal(amount);
    nextContract.setPreviousTotalPrincipal(amount);

    emit Migrate(msg.sender);
  }

  /***************** Internal Functions ******************/

  function _withdraw(uint256 amount) internal {
    uint256 amountToWithdraw = amount;

    if (amount == type(uint256).max) {
      amountToWithdraw = _poolData.userPrincipal[msg.sender];
    }
    
    if (_poolData.userPrincipal[msg.sender] < amountToWithdraw)
      revert NotEnoughPrincipal(_poolData.userPrincipal[msg.sender]);

    _poolData.updateStakingPool(msg.sender);

    _poolData.userPrincipal[msg.sender] -= amountToWithdraw;
    _poolData.totalPrincipal -= amountToWithdraw;

    _withdrawTo(msg.sender, amountToWithdraw);

    emit Withdraw(
      msg.sender,
      amountToWithdraw,
      _poolData.userIndex[msg.sender],
      _poolData.userPrincipal[msg.sender]
    );
  }

  function _claim(address user) internal {
    uint256 reward = _poolData.getUserReward(user);

    if (reward == 0) revert ZeroReward();

    _poolData.userReward[user] = 0;
    _poolData.userIndex[user] = _poolData.getRewardIndex();

    SafeERC20.safeTransfer(rewardAsset, user, reward);

    uint256 rewardLeft = rewardAsset.balanceOf(address(this));

    emit Claim(user, reward, rewardLeft);
  }

  /***************** Admin Functions ******************/

  /// @notice Init the new round. After the round closed, staking is not allowed.
  /// @param rewardPerSecond The total accrued reward per second in new round
  /// @param startTimestamp The start timestamp of initiated round
  /// @param duration The duration of the initiated round
  function initNewPool(
    uint256 rewardPerSecond,
    uint256 startTimestamp,
    uint256 duration
  ) external override onlyAdmin {
    if (_poolData.isFinished == true) revert Finished();
    (uint256 newRoundStartTimestamp, uint256 newRoundEndTimestamp) = _poolData.initRound(
      rewardPerSecond,
      startTimestamp,
      duration
    );
    
    _poolData.isOpened = true;

    SafeERC20.safeTransferFrom(rewardAsset, msg.sender, address(this), duration * rewardPerSecond);
    emit InitPool(rewardPerSecond, newRoundStartTimestamp, newRoundEndTimestamp);
  }
  
  function closePool() external onlyAdmin {
    if (_poolData.isOpened == false) revert Closed();
    _poolData.endTimestamp = block.timestamp;
    _poolData.isOpened = false;
    _poolData.isFinished = true;
  }

  function setNextContractAddr(address addr) external onlyAdmin {
    _nextContractAddr = addr;
  }

  function retrieveResidue() external onlyAdmin {
    SafeERC20.safeTransfer(rewardAsset, _admin, rewardAsset.balanceOf(address(this)));
  }

  /***************** Modifier ******************/

  modifier onlyAdmin() {
    if (msg.sender != _admin) revert OnlyAdmin();
    _;
  }

  modifier stakingInitiated() {
    if (_poolData.startTimestamp == 0) revert StakingNotInitiated();
    _;
  }

}