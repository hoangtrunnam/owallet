import React, { FunctionComponent } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../stores';
import { PageWithView } from '../../components/page';
import { View, Image, TouchableOpacity } from 'react-native';
import { Text } from '@src/components/text';
import { useSmartNavigation } from '../../navigation.provider';
import { OWBox } from '../../components/card';
import { metrics } from '../../themes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '@src/themes/theme-provider';
import { openLink } from '../../utils/helper';
import imagesAssets from '@src/assets/images';
import { TRON_ID } from '@owallet/common';

export const TxSuccessResultScreen: FunctionComponent = observer(() => {
  const { chainStore } = useStore();
  // const [successAnimProgress] = React.useState(new Animated.Value(0));
  // const [pangpareAnimProgress] = React.useState(new Animated.Value(0));
  const { colors, images } = useTheme();
  const route = useRoute<
    RouteProp<
      Record<
        string,
        {
          chainId?: string;
          // Hex encoded bytes.
          txHash?: string;
        }
      >,
      string
    >
  >();

  const chainId = route.params?.chainId ? route.params?.chainId : chainStore.current?.chainId;
  const txHash = route.params?.txHash;
  console.log('🚀 ~ file: success.tsx:51 ~ constTxSuccessResultScreen:FunctionComponent=observer ~ txHash:', txHash);

  const smartNavigation = useSmartNavigation();

  const chainInfo = chainStore.getChain(chainId);
  const { bottom } = useSafeAreaInsets();
  return (
    <PageWithView>
      <OWBox>
        <View
          style={{
            height: metrics.screenHeight - bottom - 74,
            paddingTop: 80
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Image
              style={{
                width: 24,
                height: 2
              }}
              fadeDuration={0}
              resizeMode="stretch"
              source={images.line_success_short}
            />
            <Image
              style={{
                width: 140,
                height: 32,
                marginLeft: 8,
                marginRight: 9
              }}
              fadeDuration={0}
              resizeMode="stretch"
              source={images.success}
            />
            <Image
              style={{
                width: metrics.screenWidth - 185,
                height: 2
              }}
              fadeDuration={0}
              resizeMode="stretch"
              source={images.line_success_long}
            />
          </View>
          <View
            style={{
              paddingLeft: 32,
              paddingRight: 72
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                fontSize: 24,
                lineHeight: 34,
                paddingTop: 44,
                paddingBottom: 16
              }}
              color={colors['text-title-login']}
            >
              Transaction Completed!
            </Text>
            <Text
              style={{
                fontWeight: '400',
                fontSize: 14,
                lineHeight: 20,

                paddingTop: 6
              }}
            >
              Your transaction has been confirmed by the blockchain. Congratulations!
            </Text>
            {chainInfo.raw.txExplorer && txHash ? (
              <TouchableOpacity
                style={{
                  paddingTop: 32,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={async () => {
                  if (chainInfo.raw.txExplorer && txHash) {
                    await openLink(
                      chainInfo.raw.txExplorer.txUrl.replace(
                        '{txHash}',
                        chainInfo.chainId === TRON_ID || chainInfo.networkType === 'bitcoin'
                          ? txHash
                          : txHash.toUpperCase()
                      )
                    );
                  }
                }}
              >
                <Image
                  style={{
                    width: 22,
                    height: 22,
                    tintColor: colors['background-btn-primary']
                  }}
                  fadeDuration={0}
                  resizeMode="stretch"
                  source={imagesAssets.eye}
                />
                <Text
                  style={{
                    paddingLeft: 6,
                    color: colors['background-btn-primary'],
                    fontWeight: '400',
                    fontSize: 16,
                    lineHeight: 22
                  }}
                >
                  View on Explorer
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={{
              marginTop: 32,
              marginLeft: 25,
              marginRight: 25,
              backgroundColor: colors['background-btn-primary'],
              borderRadius: 8
            }}
            onPress={() => {
              smartNavigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [{ name: 'MainTab' }]
                })
              );
            }}
          >
            <Text
              style={{
                color: 'white',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: 16,
                padding: 16
              }}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </OWBox>
    </PageWithView>
  );
});
