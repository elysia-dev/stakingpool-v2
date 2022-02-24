import { ethers } from "ethers";
import { InitRoundData } from "./types/InitRoundData";

export const third: InitRoundData = {
  rewardPerSecond: ethers.utils.parseEther('1250').div(86400),
  year: 2022,
  month: 1,
  day: 30,
  hour: 10,
  minute: 0,
  duration: ethers.BigNumber.from(40).mul(86400).toNumber(),
};
