import { ethers } from "ethers";
import { InitRoundData } from "./types/InitRoundData";

export const third: InitRoundData = {
  rewardPerSecond: ethers.utils.parseEther('1'),
  year: 2021,
  month: 9,
  day: 25,
  hour: 10,
  minute: 0,
  duration: ethers.BigNumber.from(40).mul(86400).toNumber(),
};
