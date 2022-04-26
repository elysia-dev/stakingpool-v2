// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

/// @title Math library
/// @dev Provides mul and div function for wads (decimal numbers with 18 digits precision)
library WadMath {
  uint256 internal constant WAD = 1e18;
  uint256 internal constant halfWAD = WAD / 2;

  /// @dev Multiplies two wad, rounding half up to the nearest wad
  /// @param a Wad
  /// @param b Wad
  /// @return The result of a*b, in wad
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0 || b == 0) {
      return 0;
    }
    return (a * b + halfWAD) / WAD;
  }

  /// @dev Divides two wad, rounding half up to the nearest wad
  /// @param a Wad
  /// @param b Wad
  /// @return The result of a/b, in wad
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b != 0, 'Division by Zero');
    uint256 halfB = b / 2;
    return (a * WAD + halfB) / b;
  }
}
