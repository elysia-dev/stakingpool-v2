import { ethers } from "ethers";
import { InitRoundData } from "./types/InitRoundData";
import { SECONDSPERDAY} from '../test/utils/constants'

export const third: InitRoundData = {
  rewardPerSecond: ethers.utils.parseEther('1'),
  year: 2021,
  month: 11,
  day: 10,
  hour: 9,
  minute: 0,
  duration: ethers.BigNumber.from(30).mul(SECONDSPERDAY).toNumber(),
};
