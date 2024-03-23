import React, {
  FunctionComponent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { registerModal } from "../base";
import { CardModal } from "../card";
import { Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { useStyle } from "../../styles";
import { useStore } from "../../stores";
import Web3 from "web3";
import { Button } from "../../components/button";
import Big from "big.js";
import { observer } from "mobx-react-lite";
import { useUnmount } from "../../hooks";

import ERC20_ABI from "human-standard-token-abi";
import { ScrollView } from "react-native-gesture-handler";
import { TextInput } from "../../components/input";
import {
  useAmountConfig,
  useGasEvmConfig,
  useMemoConfig,
} from "@owallet/hooks";
import { FeeEthereumInSign } from "./fee-ethereum";
import { navigationRef } from "../../router/root";
import axios from "axios";
import { colors } from "../../themes";
import { BottomSheetProps } from "@gorhom/bottom-sheet";
import { ethers } from "ethers";
import WrapViewModal from "@src/modals/wrap/wrap-view-modal";
import { FeeInSign } from "@src/modals/sign/fee";
import ItemReceivedToken from "@src/screens/transactions/components/item-received-token";
import OWButtonGroup from "@src/components/button/OWButtonGroup";
import { CoinPretty, CoinUtils, Dec, Int } from "@owallet/unit";
import { useFeeEvmConfig } from "@owallet/hooks/build/tx/fee-evm";
import { useTheme } from "@src/themes/theme-provider";
import OWText from "@src/components/text/ow-text";
import OWCard from "@src/components/card/ow-card";
import FastImage from "react-native-fast-image";
import { DenomHelper } from "@owallet/common";
import { Bech32Address } from "@owallet/cosmos";

const keyboardVerticalOffset = Platform.OS === "ios" ? 130 : 0;

export const SignEthereumModal: FunctionComponent<{
  isOpen: boolean;
  close: () => void;
  bottomSheetModalConfig?: Omit<BottomSheetProps, "snapPoints" | "children">;
}> = registerModal(
  observer(({}) => {
    useEffect(() => {
      return () => {
        signInteractionStore.reject();
      };
    }, []);
    const {
      chainStore,
      signInteractionStore,
      accountStore,
      sendStore,
      appInitStore,
      queriesStore,
      keyRingStore,
      priceStore,
    } = useStore();
    const [dataSign, setDataSign] = useState(null);
    const [infoSign, setInfoSign] = useState<{
      to: string;
      value: string;
      data: string;
      gas: string;
      gasPrice: string;
      from: string;
      type: string;
      contractAddress: string;
    }>(null);
    const current = chainStore.current;

    const account = accountStore.getAccount(current.chainId);
    const signer = account.getAddressDisplay(
      keyRingStore.keyRingLedgerAddresses,
      false
    );
    const gasConfig = useGasEvmConfig(chainStore, current.chainId, 1);
    const { gasPrice } = queriesStore
      .get(current.chainId)
      .evm.queryGasPrice.getGasPrice();
    const amountConfig = useAmountConfig(
      chainStore,
      current.chainId,
      signer,
      queriesStore.get(current.chainId).queryBalances,
      null
    );

    const memoConfig = useMemoConfig(chainStore, current.chainId);
    const feeConfig = useFeeEvmConfig(
      chainStore,
      current.chainId,
      signer,
      queriesStore.get(current.chainId).queryBalances,
      amountConfig,
      gasConfig,
      true,
      queriesStore.get(current.chainId),
      memoConfig
    );
    const preferNoSetFee = !!account.isSendingMsg;
    useEffect(() => {
      if (!gasPrice) return;
      gasConfig.setGasPriceStep(gasPrice);
      return () => {};
    }, [gasPrice]);
    const preferNoSetMemo = !!account.isSendingMsg;

    const _onPressReject = () => {
      try {
        signInteractionStore.rejectAll();
      } catch (error) {
        console.error(error);
      }
    };
    useEffect(() => {
      if (signInteractionStore.waitingEthereumData) {
        const data = signInteractionStore.waitingEthereumData;

        //@ts-ignore
        const gasDataSign = data?.data?.data?.data?.gas;

        //@ts-ignore
        const gasPriceDataSign = data?.data?.data?.data?.gasPrice;
        chainStore.selectChain(data.data.chainId);
        gasConfig.setGas(Web3.utils.hexToNumber(gasDataSign));
        gasConfig.setGasPrice(Web3.utils.hexToNumberString(gasPriceDataSign));
        if (preferNoSetFee && gasConfig.gas) {
          const gas = new Dec(
            new Int(Web3.utils.hexToNumberString(gasDataSign))
          );
          const gasPrice = new Dec(
            new Int(Web3.utils.hexToNumberString(gasPriceDataSign))
          );
          const feeAmount = gasPrice.mul(gas);
          feeConfig.setManualFee({
            amount: feeAmount.roundUp().toString(),
            denom: chainStore.current.feeCurrencies[0].coinMinimalDenom,
          });
        }

        setDataSign(signInteractionStore.waitingEthereumData);
        const dataSigning = data?.data?.data?.data;
        const hstInterface = new ethers.utils.Interface(ERC20_ABI);
        try {
          const { data, type } = dataSigning;
          if (!data || (type && type !== "erc20")) {
            setInfoSign({
              ...dataSigning,
              from: account.evmosHexAddress,
            });
          } else if (data && type && type === "erc20") {
            const token = hstInterface.parseTransaction({ data });
            const to = token?.args?._to || token?.args?.[0];
            const value = token?.args?._value || token?.args?.[1];

            setInfoSign({
              ...dataSigning,
              value: Web3.utils.toHex(value?.toString()),
              contractAddress: dataSigning.to,
              to,
              from: dataSigning?.from || account.evmosHexAddress,
            });
          }
        } catch (error) {
          console.log("error", error);
          // return undefined;
        }
      }
    }, [signInteractionStore.waitingEthereumData]);
    const approveIsDisabled = (() => {
      return feeConfig.getError() != null || gasConfig.getError() != null;
    })();
    const _onPressApprove = async () => {
      if (!dataSign) return;
      await signInteractionStore.approveEthereumAndWaitEnd({
        gasPrice: Web3.utils.toHex(gasConfig.gasPrice),
        gasLimit: Web3.utils.toHex(gasConfig.gas),
      });
      return;
    };
    const { colors } = useTheme();
    const currencies = chainStore.current.currencies;
    const currency = useMemo(() => {
      if (!infoSign || !currencies?.length) return;
      const currency = currencies.find((item, index) => {
        const denom = new DenomHelper(item.coinMinimalDenom)?.contractAddress;
        if (denom && infoSign?.type === "erc20") {
          if (!infoSign.contractAddress) return;
          return denom === infoSign.contractAddress;
        } else if (!infoSign?.type || infoSign?.type !== "erc20") {
          return (
            item.coinMinimalDenom ===
            chainStore.current.stakeCurrency.coinMinimalDenom
          );
        }
      });
      return currency;
    }, [infoSign, currencies]);
    const checkPrice = () => {
      if (!currency || !infoSign?.value) return;
      const coin = new CoinPretty(
        currency,
        new Dec(Web3.utils.hexToNumberString(infoSign?.value))
      );
      const totalPrice = priceStore.calculatePrice(coin);
      return totalPrice?.toString();
    };
    const checkImageCoin = () => {
      if (!currency) return;
      if (currency?.coinImageUrl)
        return (
          <View
            style={{
              alignSelf: "center",
              paddingVertical: 8,
            }}
          >
            <FastImage
              style={{
                height: 30,
                width: 30,
              }}
              source={{
                uri: currency?.coinImageUrl,
              }}
            />
          </View>
        );
      return null;
    };

    const renderAmount = () => {
      if (!currency || !infoSign?.value) return;
      return new CoinPretty(
        currency,
        new Dec(Web3.utils.hexToNumberString(infoSign?.value))
      )
        ?.maxDecimals(9)
        ?.trim(true)
        ?.toString();
    };

    return (
      <WrapViewModal
        style={{
          backgroundColor: colors["neutral-surface-bg"],
        }}
      >
        <View>
          {/*<View>{renderedMsgs}</View>*/}
          <OWText
            size={16}
            weight={"700"}
            style={{
              textAlign: "center",
              paddingBottom: 20,
            }}
          >
            {`Send confirmation`.toUpperCase()}
          </OWText>
          <OWCard
            style={{
              height: 143,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {checkImageCoin()}
            <OWText
              size={28}
              color={colors["neutral-text-title"]}
              weight={"500"}
            >
              {renderAmount()}
            </OWText>
            <OWText
              style={{
                textAlign: "center",
              }}
              color={colors["neutral-text-body2"]}
              weight={"400"}
            >
              {checkPrice()}
            </OWText>
          </OWCard>
          <View
            style={{
              backgroundColor: colors["neutral-surface-card"],
              paddingHorizontal: 16,
              paddingTop: 16,
              borderRadius: 24,
              marginBottom: 24,
              marginTop: 2,
            }}
          >
            <ItemReceivedToken
              label={"From"}
              valueDisplay={
                infoSign?.from &&
                Bech32Address.shortenAddress(infoSign?.from, 20)
              }
              value={infoSign?.from}
            />
            <ItemReceivedToken
              label={"To"}
              valueDisplay={
                infoSign?.to && Bech32Address.shortenAddress(infoSign?.to, 20)
              }
              value={infoSign?.to}
            />
            <FeeInSign
              feeConfig={feeConfig}
              gasConfig={gasConfig}
              signOptions={{ preferNoSetFee: true }}
              isInternal={true}
            />

            <ItemReceivedToken label={"Memo"} btnCopy={false} />
          </View>
        </View>

        <OWButtonGroup
          labelApprove={"Confirm"}
          labelClose={"Cancel"}
          disabledApprove={approveIsDisabled}
          disabledClose={signInteractionStore.isLoading}
          loadingApprove={signInteractionStore.isLoading}
          styleApprove={{
            borderRadius: 99,
            backgroundColor: colors["primary-surface-default"],
          }}
          onPressClose={_onPressReject}
          onPressApprove={_onPressApprove}
          styleClose={{
            borderRadius: 99,
            backgroundColor: colors["neutral-surface-action3"],
          }}
        />
      </WrapViewModal>
    );
  }),
  {
    disableSafeArea: true,
  }
);
