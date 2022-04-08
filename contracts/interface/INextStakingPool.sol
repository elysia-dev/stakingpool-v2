// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface INextStakingPool {
    function setPreviousUserPrincipal(uint256 amount) external;
    function setPreviousTotalPrincipal(uint256 amount) external;
}