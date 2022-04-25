import { BigNumber } from 'ethers';
import moment from 'moment';
import { waffle } from 'hardhat';
import { InitRoundData } from '../../data/types/InitRoundData';

export function toTimestamp(
  str: string
): BigNumber {
  return BigNumber.from(moment(str, 'YYYY.MM.DD hh:mm:ss Z').unix())
}

export function roundStartTimestamp(roundData: InitRoundData) {
  return BigNumber.from(
    Date.UTC(roundData.year, roundData.month - 1, roundData.day, roundData.hour, roundData.minute) /
    1000
  );
}

export async function advanceBlock() {
  return waffle.provider.send('evm_mine', []);
}

export async function advanceTime(secondsToIncrease: number) {
  await waffle.provider.send('evm_increaseTime', [secondsToIncrease]);
  return await waffle.provider.send('evm_mine', []);
}

export async function resetTimestampTo(targetInput: BigNumber | number) {
  const target = (targetInput instanceof BigNumber) ? targetInput.toNumber() : targetInput;
  const now = (await waffle.provider.getBlock('latest')).timestamp;
  await waffle.provider.send("evm_increaseTime", [target - now])
  return await waffle.provider.send('evm_mine', []);
}

export async function advanceTimeTo(targetInput: BigNumber | number) {
  const target = (targetInput instanceof BigNumber) ? targetInput.toNumber() : targetInput;
  return await waffle.provider.send('evm_mine', [target]);
}

export async function advanceBlockTo(to: number) {
  for (let i = await waffle.provider.getBlockNumber(); i < to; i++) {
    await advanceBlock();
  }
}

export async function saveEVMSnapshot(): Promise<string> {
  const snapshotId = await waffle.provider.send('evm_snapshot', []);
  return snapshotId;
}

export async function revertFromEVMSnapshot(snapshotId: string) {
  await waffle.provider.send('evm_revert', [snapshotId]);
}

export async function getTimestamp(tx: any) {
  return BigNumber.from((await waffle.provider.getBlock(tx.blockNumber)).timestamp);
}
