// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
interface IManageable {
  error OnlyManager();
  event SetManager(address admin, address manager);

  /// @param requester owner or the manager himself/herself
  event RevokeManager(address requester, address manager);
}
