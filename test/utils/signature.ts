import { BigNumber } from '@ethersproject/bignumber';
import { signTypedMessage, TypedMessage } from 'eth-sig-util';
import { ECDSASignature, fromRpcSig } from 'ethereumjs-util';

export const buildDelegationData = (
  chainId: number,
  verifyingContract: string,
  delegatee: string,
  nonce: string,
  expiry: string
) => {
  const typedData: TypedMessage<any> = {
    primaryType: 'Delegation',
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Delegation: [
        { name: 'delegatee', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
    },
    domain: {
      // The ERC712 contract name
      name: 'StakedStakingAssetToken',
      version: '1',
      chainId: chainId,
      verifyingContract: verifyingContract,
    },
    message: {
      delegatee: delegatee,
      nonce: nonce,
      expiry: expiry,
    },
  };
  return typedData;
};

export const getSignatureFromTypedData = (
  privateKey: string,
  typedData: TypedMessage<any>
): ECDSASignature => {
  const signature = signTypedMessage(Buffer.from(privateKey.substring(2, 66), 'hex'), {
    data: typedData,
  });

  return fromRpcSig(signature);
};
