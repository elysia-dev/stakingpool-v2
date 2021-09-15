import { ethers } from "ethers";

export interface InitRoundData {
    rewardPerSecond: ethers.BigNumber;
    year: number;
    month: number;
    day: number;
    hour: number
    minute: number
    duration: number;
  }