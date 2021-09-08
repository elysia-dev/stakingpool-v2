// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';

contract StakedElyfiToken is ERC20, ERC20Permit, ERC20Votes {
  IERC20 public immutable underlying;

  constructor(IERC20 underlyingToken)
    ERC20('StakedElyfiToken', 'SELFI')
    ERC20Permit('StakedElyfiToken')
  {
    underlying = underlyingToken;
  }

  // The following functions are overrides required by Solidity.

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override(ERC20, ERC20Votes) {
    super._afterTokenTransfer(from, to, amount);
  }

  function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
    super._mint(to, amount);
  }

  function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
    super._burn(account, amount);
  }

  /// @dev Allow a user to deposit underlying tokens and mint the corresponding number of wrapped tokens.
  /// @notice This function is based on the openzeppelin ERC20Wrapper
  function _depositFor(address account, uint256 amount) internal virtual returns (bool) {
    SafeERC20.safeTransferFrom(underlying, _msgSender(), address(this), amount);
    _mint(account, amount);
    return true;
  }

  /// @dev Allow a user to burn a number of wrapped tokens and withdraw the corresponding number of underlying tokens.
  /// @notice This function is based on the openzeppelin ERC20Wrapper
  function _withdrawTo(address account, uint256 amount) internal virtual returns (bool) {
    _burn(_msgSender(), amount);
    SafeERC20.safeTransfer(underlying, account, amount);
    return true;
  }
}
