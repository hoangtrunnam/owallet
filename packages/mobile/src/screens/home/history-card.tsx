import { OWEmpty } from "@src/components/empty";
import { useTheme } from "@src/themes/theme-provider";
import { observer } from "mobx-react-lite";
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { CardBody } from "../../components/card";
import { useStore } from "../../stores";
import { _keyExtract } from "../../utils/helper";
import OWIcon from "@src/components/ow-icon/ow-icon";
import { Text } from "@src/components/text";
import { useSmartNavigation } from "@src/navigation.provider";
import { RightArrowIcon } from "@src/components/icon";
import { ChainIdEnum } from "@owallet/common";
import { API } from "@src/common/api";
import moment from "moment";
import { Bech32Address } from "@owallet/cosmos";
import OWFlatList from "@src/components/page/ow-flat-list";
import { chainIcons } from "@oraichain/oraidex-common";
import { SCREENS } from "@src/common/constants";
import { navigate } from "@src/router/root";

export const HistoryCard: FunctionComponent<{
  containerStyle?: ViewStyle;
}> = observer(({ containerStyle }) => {
  const { accountStore, appInitStore } = useStore();
  const { colors } = useTheme();
  const theme = appInitStore.getInitApp.theme;

  const [histories, setHistories] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadMore, setLoadMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const accountOrai = accountStore.getAccount(ChainIdEnum.Oraichain);

  const getWalletHistory = async () => {
    try {
      setLoading(true);
      const res = await API.getGroupHistory(
        {
          address: accountOrai.bech32Address,
          offset,
          limit: 2,
        },
        {
          baseURL: "https://staging.owallet.dev/",
        }
      );

      if (res && res.status === 200) {
        setHistories({ ...histories, ...res.data.data });
        setLoadMore(false);
        setLoading(false);
        if (res.data.total > offset) {
          setOffset(offset + 2);
        }
      }
    } catch (err) {
      setLoadMore(false);
      setLoading(false);
      console.log("getWalletHistory err", err);
    }
  };

  useEffect(() => {
    getWalletHistory();
  }, [accountOrai.bech32Address]);

  const styles = styling(colors);

  const renderHistoryItem = useCallback(
    (item) => {
      if (item) {
        const fromChainIcon = chainIcons.find(
          (c) => c.chainId === item.fromToken?.chainId ?? ChainIdEnum.Oraichain
        );
        const toChainIcon = chainIcons.find(
          (c) => c.chainId === item.toToken?.chainId ?? ChainIdEnum.Oraichain
        );
        return (
          <TouchableOpacity
            onPress={() => {
              console.log("ote,", item);

              navigate(SCREENS.HistoryDetail, {
                item,
              });
            }}
            style={styles.btnItem}
          >
            <View style={styles.leftBoxItem}>
              <View style={styles.iconWrap}>
                <OWIcon
                  type="images"
                  source={{ uri: fromChainIcon?.Icon }}
                  size={28}
                />
              </View>
              <View style={styles.chainWrap}>
                <OWIcon
                  type="images"
                  source={{ uri: toChainIcon?.Icon }}
                  size={16}
                />
              </View>

              <View style={styles.pl10}>
                <Text
                  size={14}
                  color={colors["neutral-text-heading"]}
                  weight="600"
                >
                  {item.type}
                </Text>
                <Text weight="400" color={colors["neutral-text-body"]}>
                  {Bech32Address.shortenAddress(item.fromAddress, 16)}
                </Text>
              </View>
            </View>
            <View style={styles.rightBoxItem}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text weight="500" color={colors["neutral-text-heading"]}>
                    {item.fromAmount} {item.fromToken?.asset ?? ""}
                  </Text>
                  <Text
                    style={styles.profit}
                    color={colors["success-text-body"]}
                  >
                    {"+"}${item.value.toFixed(6)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 0.5,
                    justifyContent: "center",
                    paddingLeft: 20,
                  }}
                >
                  <RightArrowIcon
                    height={12}
                    color={colors["neutral-text-heading"]}
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      }
    },
    [theme]
  );

  const renderListHistoryItem = ({ item }) => {
    if (item) {
      return (
        <View style={{ paddingTop: 16 }}>
          <Text size={14} color={colors["neutral-text-heading"]} weight="600">
            {moment(Number(item)).format("DD/MM/YY")}
          </Text>
          {histories?.[item]?.map((h) => {
            return renderHistoryItem(h);
          })}
        </View>
      );
    }
  };

  const onEndReached = () => {
    console.log("reached the end");
    getWalletHistory();
  };

  const onRefresh = () => {
    console.log("refresh");
    setLoading(true);
  };

  const renderContent = () => {
    return (
      <>
        <OWFlatList
          data={Object.keys(histories)}
          onEndReached={onEndReached}
          renderItem={renderListHistoryItem}
          loading={loading}
          loadMore={loadMore}
          onRefresh={onRefresh}
          refreshing={loading}
          ListEmptyComponent={() => {
            return (
              <CardBody style={{ paddingHorizontal: 0, paddingTop: 8 }}>
                <OWEmpty type="cash" />
              </CardBody>
            );
          }}
        />
      </>
    );
  };

  return <>{renderContent()}</>;
});

const styling = (colors) =>
  StyleSheet.create({
    wrapHeaderTitle: {
      flexDirection: "row",
    },
    pl10: {
      paddingLeft: 10,
    },
    leftBoxItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    rightBoxItem: {
      alignItems: "flex-end",
    },
    btnItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 8,
    },
    profit: {
      fontWeight: "400",
      lineHeight: 20,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: colors["neutral-text-action-on-dark-bg"],
    },
    chainWrap: {
      width: 18,
      height: 18,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors["neutral-text-action-on-dark-bg"],
      position: "absolute",
      bottom: -6,
      left: 20,
    },
    active: {
      borderBottomColor: colors["primary-surface-default"],
      borderBottomWidth: 2,
    },
  });
