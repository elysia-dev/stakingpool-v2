import { Assertion, util, expect } from 'chai';
import PoolData from '../types/PoolData';
import UserData from '../types/UserData';

const flag = util.flag;

declare global {
  export namespace Chai {
    interface Assertion {
      equalUserData(expectedData: UserData): void;
      equalPoolData(expect: PoolData): void;
    }
  }
}

Assertion.addMethod('equalPoolData', function (expectedData: PoolData) {
  const actualData = <PoolData>this._obj;

  (Object.keys(actualData) as (keyof PoolData)[]).forEach((key) => {
    expect(expectedData[key]).to.eq(actualData[key]);
  });
});

Assertion.addMethod('equalUserData', function (expectedData: UserData) {
  const actualData = <UserData>this._obj;

  (Object.keys(actualData) as (keyof UserData)[]).forEach((key) => {
    expect(expectedData[key]).to.eq(actualData[key]);
  });
});
