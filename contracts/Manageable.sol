// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import './interface/IManageable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/// @dev An owner is able to change the managers.
contract Manageable is IManageable, Ownable {
  mapping(address => bool) managers;

  function setManager(address addr) external onlyOwner {
    _setManager(addr);
  }

  function revokeManager(address addr) external onlyOwner {
    _revokeManager(addr);
  }

  function renounceManager(address addr) external {
    require(addr == msg.sender, "Can only renounce manager for self");
    _revokeManager(addr);
  }

  function isManager(address addr) public view returns (bool) {
    return managers[addr] || addr == owner();
  }

  /***************** private ******************/
  function _setManager(address addr) private {
    if (!isManager(addr)) {
      managers[addr] = true;
      emit SetManager(msg.sender, addr);
    }
  }

  function _revokeManager(address addr) private {
    if (isManager(addr)) {
      managers[addr] = false;
      emit RevokeManager(msg.sender, addr);
    }
  }

  /***************** Modifier ******************/
  modifier onlyManager() {
    if (!isManager(msg.sender)) revert OnlyManager();
    _;
  }
}
