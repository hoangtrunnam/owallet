import {
  ChainInfo,
  OWallet as IOWallet,
  Ethereum as IEthereum,
  TronWeb as ITronWeb,
  Bitcoin as IBitcoin,
  OWalletIntereactionOptions,
  OWalletMode,
  OWalletSignOptions,
  Key,
  EthereumMode,
  RequestArguments,
  TronWebMode,
  ChainInfoWithoutEndpoints,
  BitcoinMode
} from '@owallet/types';
import { BACKGROUND_PORT, MessageRequester } from '@owallet/router';
import { BroadcastMode, AminoSignResponse, StdSignDoc, StdTx, OfflineSigner, StdSignature } from '@cosmjs/launchpad';

import {
  EnableAccessMsg,
  GetKeyMsg,
  SuggestChainInfoMsg,
  SuggestTokenMsg,
  SendTxMsg,
  RequestEthereumMsg,
  GetSecret20ViewingKey,
  RequestSignAminoMsg,
  GetPubkeyMsg,
  ReqeustEncryptMsg,
  RequestDecryptMsg,
  GetTxEncryptionKeyMsg,
  RequestVerifyADR36AminoSignDoc,
  RequestSignEthereumTypedDataMsg,
  SignEthereumTypedDataObject,
  RequestSignDecryptDataMsg,
  RequestSignReEncryptDataMsg,
  RequestPublicKeyMsg,
  GetChainInfosWithoutEndpointsMsg,
  RequestUniversalSwapMsg
} from '@owallet/background';
import { SecretUtils } from 'secretjs/types/enigmautils';

import { OWalletEnigmaUtils } from './enigma';
import { DirectSignResponse, OfflineDirectSigner } from '@cosmjs/proto-signing';

import { CosmJSOfflineSigner, CosmJSOfflineSignerOnlyAmino } from './cosmjs';
import deepmerge from 'deepmerge';
import Long from 'long';
import { Buffer } from 'buffer';
import {
  RequestSignDirectMsg,
  RequestSignEthereumMsg,
  RequestSignTronMsg,
  RequestSignBitcoinMsg,
  GetDefaultAddressTronMsg
} from './msgs';
import { TRON_ID } from '@owallet/common';

export class OWallet implements IOWallet {
  protected enigmaUtils: Map<string, SecretUtils> = new Map();

  public defaultOptions: OWalletIntereactionOptions = {};

  constructor(
    public readonly version: string,
    public readonly mode: OWalletMode,
    protected readonly requester: MessageRequester
  ) {}

  async getChainInfosWithoutEndpoints(): Promise<ChainInfoWithoutEndpoints[]> {
    const msg = new GetChainInfosWithoutEndpointsMsg();
    return (await this.requester.sendMessage(BACKGROUND_PORT, msg)).chainInfos;
  }

  async enable(chainIds: string | string[]): Promise<void> {
    if (typeof chainIds === 'string') {
      chainIds = [chainIds];
    }

    await this.requester.sendMessage(BACKGROUND_PORT, new EnableAccessMsg(chainIds));
  }

  async experimentalSuggestChain(chainInfo: ChainInfo): Promise<void> {
    const msg = new SuggestChainInfoMsg(chainInfo);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async handleUniversalSwap(chainId: string, data: object): Promise<object> {
    const msg = new RequestUniversalSwapMsg(chainId, data);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getKey(chainId: string): Promise<Key> {
    const msg = new GetKeyMsg(chainId);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async sendTx(chainId: string, tx: StdTx | Uint8Array, mode: BroadcastMode): Promise<Uint8Array> {
    const msg = new SendTxMsg(chainId, tx, mode);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async signAmino(
    chainId: string,
    signer: string,
    signDoc: StdSignDoc,
    signOptions: OWalletSignOptions = {}
  ): Promise<AminoSignResponse> {
    const msg = new RequestSignAminoMsg(
      chainId,
      signer,
      signDoc,
      deepmerge(this.defaultOptions.sign ?? {}, signOptions)
    );
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  // then here to sign
  async signDirect(
    chainId: string,
    signer: string,
    signDoc: {
      bodyBytes?: Uint8Array | null;
      authInfoBytes?: Uint8Array | null;
      chainId?: string | null;
      accountNumber?: Long | null;
    },
    signOptions: OWalletSignOptions = {}
  ): Promise<DirectSignResponse> {
    const msg = new RequestSignDirectMsg(
      chainId,
      signer,
      {
        bodyBytes: signDoc.bodyBytes,
        authInfoBytes: signDoc.authInfoBytes,
        chainId: signDoc.chainId,
        accountNumber: signDoc.accountNumber ? signDoc.accountNumber.toString() : null
      },
      deepmerge(this.defaultOptions.sign ?? {}, signOptions)
    );

    const response = await this.requester.sendMessage(BACKGROUND_PORT, msg);

    return {
      signed: {
        bodyBytes: response.signed.bodyBytes,
        authInfoBytes: response.signed.authInfoBytes,
        chainId: response.signed.chainId,
        accountNumber: Long.fromString(response.signed.accountNumber)
      },
      signature: response.signature
    };
  }

  async signAndBroadcastTron(chainId: string, data: object): Promise<{ rawTxHex: string }> {
    const msg = new RequestSignTronMsg(chainId, data);
    console.log('data signAndBroadcastTron:', data, msg);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async signArbitrary(chainId: string, signer: string, data: string | Uint8Array): Promise<StdSignature> {
    let isADR36WithString = false;
    if (typeof data === 'string') {
      data = Buffer.from(data).toString('base64');
      isADR36WithString = true;
    } else {
      data = Buffer.from(data).toString('base64');
    }

    const signDoc = {
      chain_id: '',
      account_number: '0',
      sequence: '0',
      fee: {
        gas: '0',
        amount: []
      },
      msgs: [
        {
          type: 'sign/MsgSignData',
          value: {
            signer,
            data
          }
        }
      ],
      memo: ''
    };

    const msg = new RequestSignAminoMsg(chainId, signer, signDoc, {
      isADR36WithString
    });
    return (await this.requester.sendMessage(BACKGROUND_PORT, msg)).signature;
  }

  async verifyArbitrary(
    chainId: string,
    signer: string,
    data: string | Uint8Array,
    signature: StdSignature
  ): Promise<boolean> {
    if (typeof data === 'string') {
      data = Buffer.from(data);
    }

    return await this.requester.sendMessage(
      BACKGROUND_PORT,
      new RequestVerifyADR36AminoSignDoc(chainId, signer, data, signature)
    );
  }

  getOfflineSigner(chainId: string): OfflineSigner & OfflineDirectSigner {
    return new CosmJSOfflineSigner(chainId, this);
  }

  getOfflineSignerOnlyAmino(chainId: string): OfflineSigner {
    return new CosmJSOfflineSignerOnlyAmino(chainId, this);
  }

  async getOfflineSignerAuto(chainId: string): Promise<OfflineSigner | OfflineDirectSigner> {
    const key = await this.getKey(chainId);
    if (key.isNanoLedger) {
      return new CosmJSOfflineSignerOnlyAmino(chainId, this);
    }
    return new CosmJSOfflineSigner(chainId, this);
  }

  async suggestToken(chainId: string, contractAddress: string, viewingKey?: string): Promise<void> {
    const msg = new SuggestTokenMsg(chainId, contractAddress, viewingKey);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getSecret20ViewingKey(chainId: string, contractAddress: string): Promise<string> {
    const msg = new GetSecret20ViewingKey(chainId, contractAddress);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getEnigmaPubKey(chainId: string): Promise<Uint8Array> {
    return await this.requester.sendMessage(BACKGROUND_PORT, new GetPubkeyMsg(chainId));
  }

  async getEnigmaTxEncryptionKey(chainId: string, nonce: Uint8Array): Promise<Uint8Array> {
    return await this.requester.sendMessage(BACKGROUND_PORT, new GetTxEncryptionKeyMsg(chainId, nonce));
  }

  async enigmaEncrypt(
    chainId: string,
    contractCodeHash: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    msg: object
  ): Promise<Uint8Array> {
    return await this.requester.sendMessage(BACKGROUND_PORT, new ReqeustEncryptMsg(chainId, contractCodeHash, msg));
  }

  async enigmaDecrypt(chainId: string, ciphertext: Uint8Array, nonce: Uint8Array): Promise<Uint8Array> {
    if (!ciphertext || ciphertext.length === 0) {
      return new Uint8Array();
    }

    return await this.requester.sendMessage(BACKGROUND_PORT, new RequestDecryptMsg(chainId, ciphertext, nonce));
  }

  getEnigmaUtils(chainId: string): SecretUtils {
    if (this.enigmaUtils.has(chainId)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.enigmaUtils.get(chainId)!;
    }

    const enigmaUtils = new OWalletEnigmaUtils(chainId, this);
    this.enigmaUtils.set(chainId, enigmaUtils);
    return enigmaUtils;
  }
}

export class Ethereum implements IEthereum {
  constructor(
    public readonly version: string,
    public readonly mode: EthereumMode,
    public initChainId: string,
    protected readonly requester: MessageRequester
  ) {
    this.initChainId = initChainId;
  }

  async request(args: RequestArguments): Promise<any> {
    const chainId = args.chainId ?? this.initChainId;
    if (args.method === 'wallet_switchEthereumChain') {
      const msg = new RequestEthereumMsg(chainId, args.method, args.params);
      const result = await this.requester.sendMessage(BACKGROUND_PORT, msg);
      this.initChainId = result;
      return result;
    } else if (args.method === 'eth_sendTransaction') {
      try {
        const { rawTxHex } = await this.signAndBroadcastEthereum(chainId, args.params[0]);
        return rawTxHex;
      } catch (err) {
        console.log('eth_sendTransaction err', err);
      }
    } else {
      const msg = new RequestEthereumMsg(chainId, args.method, args.params);
      const result = await this.requester.sendMessage(BACKGROUND_PORT, msg);
      return result;
    }
  }

  async handleRequest(args: RequestArguments, chainId: string): Promise<any> {
    let result;
    switch (args.method) {
      case 'wallet_addEthereumChain':
        await this.experimentalSuggestChain(args.params[0]);
        break;
      case 'eth_chainId':
        if (chainId?.toString()?.startsWith('0x')) {
          result = chainId;
        } else result = '0x0';
        break;
      case 'public_key':
        result = await this.getPublicKey(chainId);
        break;
      case 'eth_initChainId' as any:
        result = this.initChainId;
        break;
      case 'eth_sendTransaction':
        const { rawTxHex } = await this.signAndBroadcastEthereum(chainId, args.params[0]);
        result = rawTxHex;
        break;
      case 'eth_signTypedData_v4':
        result = await this.signEthereumTypeData(chainId, args.params[0]);
        break;
      case 'eth_signReEncryptData':
        result = await this.signReEncryptData(chainId, args.params[0]);
        break;
      case 'eth_signDecryptData':
        result = await this.signDecryptData(chainId, args.params[0]);
        break;
      case 'eth_getTransactionReceipt':
      // case 'eth_chainId':
      case 'eth_accounts':
      case 'net_version':
      case 'eth_blockNumber':
      case 'eth_estimateGas':
      default:
        const msg = new RequestEthereumMsg(chainId, args.method, args.params);
        result = await this.requester.sendMessage(BACKGROUND_PORT, msg);
        break;
    }
    return result;
  }

  async signAndBroadcastEthereum(chainId: string, data: object): Promise<{ rawTxHex: string }> {
    const msg = new RequestSignEthereumMsg(chainId, data);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async experimentalSuggestChain(chainInfo: ChainInfo): Promise<void> {
    const msg = new SuggestChainInfoMsg(chainInfo);
    console.log('🚀 ~ file: core.ts ~ line 313 ~ Ethereum ~ experimentalSuggestChain ~ chainInfo', chainInfo);
    await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async signEthereumTypeData(chainId: string, data: SignEthereumTypedDataObject): Promise<any> {
    try {
      const msg = new RequestSignEthereumTypedDataMsg(chainId, data);
      const result = await this.requester.sendMessage(BACKGROUND_PORT, msg);
      console.log('RESULT AFTER ALL!!!!!!!!!!!!');
      return result;
    } catch (error) {
      console.log(error, 'error on send message!!!!!!!!!!!!!!!');
    }
  }

  async signAndBroadcastTron(chainId: string, data: object): Promise<{ rawTxHex: string }> {
    const msg = new RequestSignTronMsg(chainId, data);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getPublicKey(chainId: string): Promise<object> {
    const msg = new RequestPublicKeyMsg(chainId);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async signDecryptData(chainId: string, data: object): Promise<object> {
    const msg = new RequestSignDecryptDataMsg(chainId, data);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  // thang2
  async signReEncryptData(chainId: string, data: object): Promise<object> {
    const msg = new RequestSignReEncryptDataMsg(chainId, data);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  // async sign()
  // async asyncRequest(): Promise<void> {
  //   console.log('');
  // }
  // async getKey(chainId: string): Promise<Key> {
  //   const msg = new GetKeyMsg(chainId);
  //   return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  // }
}

export class TronWeb implements ITronWeb {
  constructor(
    public readonly version: string,
    public readonly mode: TronWebMode,
    public initChainId: string,
    protected readonly requester: MessageRequester
  ) {
    this.initChainId = initChainId;
  }

  async sign(transaction: object): Promise<object> {
    const msg = new RequestSignTronMsg(TRON_ID, transaction);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }

  async getDefaultAddress(): Promise<object> {
    const msg = new GetDefaultAddressTronMsg(TRON_ID);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }
}
export class Bitcoin implements IBitcoin {
  constructor(
    public readonly version: string,
    public readonly mode: BitcoinMode,
    public initChainId: string,
    protected readonly requester: MessageRequester
  ) {
    this.initChainId = initChainId;
  }
  async signAndBroadcast(chainId: string, data: object): Promise<{ rawTxHex: string }> {
    const msg = new RequestSignBitcoinMsg(chainId, data);
    return await this.requester.sendMessage(BACKGROUND_PORT, msg);
  }
}
