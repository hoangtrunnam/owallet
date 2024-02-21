import React, { FunctionComponent, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { View, ViewStyle } from 'react-native';
import { useStore } from '../../stores';
import { AddressCopyable } from '../../components/address-copyable';
import { useSmartNavigation } from '../../navigation.provider';
import { navigate } from '../../router/root';
import { AddressQRCodeModal } from './components';
import Big from 'big.js';
import { Text } from '@src/components/text';
import { AccountBox } from './account-box';
import { ChainIdEnum, TRON_ID } from '@owallet/common';
import { getOasisInfo } from '@src/utils/helper';
import { SCREENS } from '@src/common/constants';

export const AccountCardEVM: FunctionComponent<{
  containerStyle?: ViewStyle;
  refreshDate?: number;
}> = observer(({ refreshDate }) => {
  const { chainStore, accountStore, queriesStore, priceStore, modalStore, keyRingStore } = useStore();

  const smartNavigation = useSmartNavigation();

  const [oasisAddress, setOasisAddress] = useState('');
  const [oasisBalance, setOasisBalance] = useState('0');

  const account = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);
  const selected = keyRingStore?.multiKeyStoreInfo.find(keyStore => keyStore?.selected);
  const addressDisplay = account.getAddressDisplay(keyRingStore.keyRingLedgerAddresses);
  const addressCore = account.getAddressDisplay(keyRingStore.keyRingLedgerAddresses, false);
  let total: any = queries.evm.queryEvmBalance.getQueryBalance(addressCore)?.balance;

  const onPressBtnMain = name => {
    if (name === 'Buy') {
      // navigate('MainTab', { screen: 'Browser', path: 'https://oraidex.io' });
      navigate(SCREENS.STACK.Others, {
        screen: SCREENS.BuyFiat
      });
    }
    if (name === 'Receive') {
      _onPressReceiveModal();
    }
    if (name === 'Send') {
      if (chainStore.current.chainId === ChainIdEnum.TRON) {
        smartNavigation.navigateSmart('SendTron', {
          currency: chainStore.current.stakeCurrency.coinMinimalDenom
        });
      } else if (chainStore.current.chainId === ChainIdEnum.Oasis) {
        smartNavigation.navigateSmart('SendOasis', {
          currency: chainStore.current.stakeCurrency.coinMinimalDenom,
          maxAmount: oasisBalance
        });
      } else {
        smartNavigation.navigateSmart('Send', {
          currency: chainStore.current.stakeCurrency.coinMinimalDenom
        });
      }
    }
  };

  const _onPressReceiveModal = () => {
    modalStore.setOptions();
    modalStore.setChildren(
      AddressQRCodeModal({
        account,
        chainStore: chainStore.current,
        keyRingStore: keyRingStore,
        address: chainStore.current.chainId === ChainIdEnum.Oasis ? oasisAddress : undefined
      })
    );
  };

  const getOasisWallet = async () => {
    try {
      const { amount, address } = await getOasisInfo(chainStore.current.chainId);
      setOasisBalance(amount);
      setOasisAddress(address);
    } catch (err) {
      console.log('err getOasisInfo', err);
    }
  };

  useEffect(() => {
    getOasisWallet();
  }, [account.bech32Address, refreshDate]);

  const renderAddress = () => {
    if (chainStore.current.chainId === TRON_ID) {
      return (
        <View>
          <View>
            <Text>Base58: </Text>
            <AddressCopyable address={addressDisplay} maxCharacters={22} />
          </View>
          <View>
            <Text>Evmos: </Text>
            <AddressCopyable address={addressCore} maxCharacters={22} />
          </View>
        </View>
      );
    }

    if (chainStore.current.chainId === ChainIdEnum.Oasis) {
      return (
        <View>
          <View>
            <Text>Native: </Text>
            <AddressCopyable address={oasisAddress} maxCharacters={22} />
          </View>
        </View>
      );
    }

    return <AddressCopyable address={addressDisplay} maxCharacters={22} />;
  };
  const totalAmount = () => {
    if (chainStore.current.chainId === ChainIdEnum.Oasis) {
      return (
        `$${
          oasisBalance && priceStore?.getPrice(chainStore.current.stakeCurrency.coinGeckoId)
            ? (
                parseFloat(new Big(parseInt(oasisBalance)).toString()) *
                Number(priceStore?.getPrice(chainStore.current.stakeCurrency.coinGeckoId))
              ).toFixed(6)
            : 0
        }` || '$--'
      );
    }
    if (chainStore.current.chainId !== ChainIdEnum.TRON && total) {
      return (
        '$' +
        (
          parseFloat(new Big(parseInt(total.amount?.int?.value)).div(new Big(10).pow(36)).toString()) *
          priceStore?.getPrice(chainStore?.current?.stakeCurrency?.coinGeckoId)
        ).toFixed(6)
      );
    }
    if (chainStore.current.chainId === ChainIdEnum.TRON && total) {
      return (
        '$' +
        (
          parseFloat(new Big(parseInt(total.amount?.int)).div(new Big(10).pow(24)).toString()) *
          priceStore?.getPrice(chainStore?.current?.stakeCurrency?.coinGeckoId)
        ).toFixed(6)
      );
    }

    return 0;
  };

  const totalBalance = () => {
    if (chainStore.current.chainId === ChainIdEnum.Oasis) {
      return Number(Number(oasisBalance).toFixed(6)) + ` ${chainStore.current?.stakeCurrency.coinDenom}`;
    }

    if (chainStore.current.chainId !== TRON_ID && total) {
      return (
        `${Number(new Big(parseInt(total?.amount?.int)).div(new Big(10).pow(36)).toFixed(6))}` +
        ` ${chainStore.current?.stakeCurrency.coinDenom}`
      );
    }

    if (chainStore.current.chainId === TRON_ID && total) {
      return (
        `${Number(new Big(parseInt(total?.amount?.int)).div(new Big(10).pow(24)).toFixed(6))}` +
        ` ${chainStore.current?.stakeCurrency.coinDenom}`
      );
    }

    return null;
  };

  return (
    <AccountBox
      totalBalance={
        <Text
          style={{
            textAlign: 'center',
            color: 'white',
            fontWeight: '900',
            fontSize: 34,
            lineHeight: 50
          }}
        >
          {totalBalance()}
        </Text>
      }
      coinType={`${
        keyRingStore.keyRingType === 'ledger'
          ? chainStore?.current?.bip44?.coinType
          : selected?.bip44HDPath?.coinType ?? chainStore?.current?.bip44?.coinType
      }`}
      // networkType={'evm'}
      name={account.name || '...'}
      onPressBtnMain={onPressBtnMain}
      totalAmount={`${totalAmount()}`}
      addressComponent={renderAddress()}
    />
  );
});
