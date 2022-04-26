import { BigNumber } from 'ethers';
import { WAD } from './constants';

export function wadMul(m: BigNumber, n: BigNumber): BigNumber {
  const halfWad = BigNumber.from(WAD).div(2);

  return m.mul(n).add(halfWad).div(WAD);
}

export function wadDiv(m: BigNumber, n: BigNumber): BigNumber {
  const half = n.div(2);

  return half.add(m.mul(WAD)).div(n);
}

