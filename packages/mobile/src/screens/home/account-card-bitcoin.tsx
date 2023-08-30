import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { View, ViewStyle, Image, StyleSheet } from 'react-native';
import { useStore } from '../../stores';
import { AddressCopyable } from '../../components/address-copyable';
import { useSmartNavigation } from '../../navigation.provider';
import { colors, metrics, spacing, typography } from '../../themes';
import { navigate } from '../../router/root';
import { AddressQRCodeModal } from './components';
import {
  formatBalance,
  getExchangeRate,
  getBalanceValue,
  getBaseDerivationPath
} from '@owallet/bitcoin';
import { AccountBox } from './account-box';
import { btcToFiat } from '@owallet/bitcoin';
import { CoinPretty } from '@owallet/unit';
import { SCREENS } from '@src/common/constants';
export const AccountCardBitcoin: FunctionComponent<{
  containerStyle?: ViewStyle;
}> = observer(({ containerStyle }) => {
  const {
    chainStore,
    accountStore,
    queriesStore,
    priceStore,
    modalStore,
    keyRingStore
  } = useStore();

  const selected = keyRingStore?.multiKeyStoreInfo.find(
    (keyStore) => keyStore?.selected
  );
  const smartNavigation = useSmartNavigation();
  const account = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const balanceBtc = queries.bitcoin.queryBitcoinBalance.getQueryBalance(
    account?.legacyAddress
  )?.balance;

  const totalAmount = useMemo(() => {
    const amount = formatBalance({
      balance: Number(balanceBtc?.toCoin().amount),
      cryptoUnit: 'BTC',
      coin: chainStore.current.chainId
    });
    return amount;
  }, [
    chainStore.current.chainId,
    account?.legacyAddress,
    chainStore.current.networkType,
    balanceBtc
  ]);
  useEffect(() => {
    const getExchange = async () => {
      const exchange = (await getExchangeRate({
        selectedCurrency: priceStore.defaultVsCurrency
      })) as { data: number };
      if (Number(exchange?.data)) {
        setExchangeRate(Number(exchange?.data));
      }
    };
    getExchange();
    return () => {};
  }, [priceStore.defaultVsCurrency]);

  const handleBalanceBtc = (balanceBtc: CoinPretty, exchangeRate: number) => {
    const balanceValueParams = {
      balance: Number(balanceBtc?.toCoin().amount),
      cryptoUnit: 'BTC'
    };
    console.log(
      '🚀 ~ file: account-card-bitcoin.tsx:74 ~ handleBalanceBtc ~ balanceValueParams:',
      balanceValueParams
    );
    const amountData = getBalanceValue(balanceValueParams);

    const currencyFiat = priceStore.defaultVsCurrency;
    const fiat = btcToFiat({
      amount: amountData as number,
      exchangeRate: exchangeRate,
      currencyFiat
    });
    return `$${fiat}`;
  };
  const totalBalance = useMemo(() => {
    if (!!exchangeRate && exchangeRate > 0) {
      return handleBalanceBtc(balanceBtc, exchangeRate);
    }
    return '';
  }, [
    chainStore.current.stakeCurrency.coinDecimals,
    chainStore.current.chainId,
    account?.legacyAddress,
    exchangeRate,
    balanceBtc
  ]);

  const onPressBtnMain = (name) => {
    if (name === 'Buy') {
      navigate('MainTab', { screen: 'Browser', path: 'https://oraidex.io' });
    }
    if (name === 'Receive') {
      _onPressReceiveModal();
    }
    if (name === 'Send') {
      navigate(SCREENS.STACK.Others, {
        screen: SCREENS.SendBtc
      });
      return;
    }
  };

  const _onPressReceiveModal = () => {
    modalStore.setOptions();
    modalStore.setChildren(
      AddressQRCodeModal({
        account,
        chainStore: chainStore.current
      })
    );
  };
  return (
    <AccountBox
      totalBalance={totalBalance}
      addressComponent={
        <AddressCopyable address={account.legacyAddress} maxCharacters={22} />
      }
      name={account?.name || '..'}
      coinType={`${
        keyRingStore.keyRingType === 'ledger'
          ? chainStore?.current?.bip44?.coinType
          : selected?.bip44HDPath?.coinType ??
            chainStore?.current?.bip44?.coinType
      }`}
      hdPath={
        chainStore?.current?.networkType === 'bitcoin'
          ? (getBaseDerivationPath({
              selectedCrypto: chainStore?.current?.chainId as string,
              keyDerivationPath: '44'
            }) as string)
          : ''
      }
      totalAmount={!!totalAmount ? totalAmount : null}
      networkType={'cosmos'}
      onPressBtnMain={onPressBtnMain}
    />
  );
});

const styles = StyleSheet.create({
  textLoadMore: {
    ...typography['h7'],
    color: colors['purple-700']
  },
  containerBtn: {
    alignItems: 'center',
    marginTop: spacing['18'],
    justifyContent: 'center',
    backgroundColor: colors['gray-50'],
    width: metrics.screenWidth - 68,
    height: spacing['40'],
    paddingVertical: spacing['10'],
    borderRadius: spacing['12']
  }
});
