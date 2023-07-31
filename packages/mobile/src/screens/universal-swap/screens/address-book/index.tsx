import { Bech32Address } from '@owallet/cosmos';
import {
  IMemoConfig,
  IRecipientConfig,
  useAddressBookConfig
} from '@owallet/hooks';
import { RouteProp, useRoute } from '@react-navigation/native';
import { OWButton } from '@src/components/button';
import { OWBox } from '@src/components/card';
import { OWEmpty } from '@src/components/empty';
import OWIcon from '@src/components/ow-icon/ow-icon';
import { Text } from '@src/components/text';
import { useTheme } from '@src/themes/theme-provider';
import { observer } from 'mobx-react-lite';
import React, { FunctionComponent, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { AsyncKVStore } from '../../../../common';
import { OWSubTitleHeader } from '../../../../components/header';
import { SearchIcon, TrashCanIcon } from '../../../../components/icon';
import { TextInput } from '../../../../components/input';
import { PageWithScrollView } from '../../../../components/page';
import { RectButton } from '../../../../components/rect-button';
import { useSmartNavigation } from '../../../../navigation.provider';
import { useConfirmModal } from '../../../../providers/confirm-modal';
import { useStore } from '../../../../stores';
import { useStyle } from '../../../../styles';
import { spacing } from '../../../../themes';

const addressBookItemComponent = {
  inTransaction: RectButton,
  inSetting: View
};

const styling = colors => {
  return StyleSheet.create({
    addressBookRoot: {
      padding: spacing['22'],
      backgroundColor: colors['primary'],
      marginTop: spacing['16'],
      borderRadius: spacing['24']
    },
    addressBookItem: {
      marginTop: spacing['16'],
      backgroundColor: colors['background-item-list'],
      paddingVertical: spacing['12'],
      paddingHorizontal: spacing['16'],
      borderRadius: spacing['8']
    },
    addressBookAdd: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    }
  });
};

const debounce = (fn, delay) => {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
};

export const AddressBookScreen: FunctionComponent = observer(() => {
  const [nameSearch, setNameSearch] = useState<string>('');
  const [contractList, setContractList] = useState<any[]>([]);
  const { chainStore } = useStore();
  const { colors } = useTheme();
  const styles = styling(colors);
  const confirmModal = useConfirmModal();

  const route = useRoute<
    RouteProp<
      Record<
        string,
        {
          recipientConfig?: IRecipientConfig;
          memoConfig?: IMemoConfig;
        }
      >,
      string
    >
  >();

  const recipientConfig = route.params.recipientConfig;
  const memoConfig = route.params.memoConfig;

  const style = useStyle();

  const smartNavigation = useSmartNavigation();

  const chainId = recipientConfig
    ? recipientConfig.chainId
    : chainStore.current.chainId;

  const addressBookConfig = useAddressBookConfig(
    new AsyncKVStore('address_book'),
    chainStore,
    chainId,
    {
      setRecipient: (recipient: string) => {
        if (recipientConfig) {
          recipientConfig.setRawRecipient(recipient);
        }
      },
      setMemo: (memo: string) => {
        if (memoConfig) {
          memoConfig.setMemo(memo);
        }
      }
    }
  );

  const isInTransaction = recipientConfig != null || memoConfig != null;
  const AddressBookItem =
    addressBookItemComponent[isInTransaction ? 'inTransaction' : 'inSetting'];

  const onNameSearch = txt => {
    const searchWord = txt ?? nameSearch;
    if (searchWord) {
      const addressList = addressBookConfig.addressBookDatas;
      if (addressList.length > 0) {
        const newAdressList = addressList.filter(address =>
          address.name.toLowerCase().includes(searchWord.toLowerCase())
        );
        return setContractList(newAdressList);
      }
    }
    return setContractList([]);
  };

  const debouncedHandler = useCallback(debounce(onNameSearch, 300), []);

  const contractData =
    contractList.length > 0
      ? contractList
      : nameSearch !== '' && contractList.length === 0
      ? []
      : addressBookConfig.addressBookDatas;

  return (
    <PageWithScrollView backgroundColor={colors['background']}>
      <OWSubTitleHeader title="Address book" />
      <OWBox>
        <View>
          <TextInput
            inputRight={
              <RectButton onPress={onNameSearch}>
                <SearchIcon color={colors['text-place-holder']} size={20} />
              </RectButton>
            }
            placeholder="Search by address, namespace"
            inputContainerStyle={{
              borderColor: colors['purple-400'],
              borderTopLeftRadius: spacing['8'],
              borderTopRightRadius: spacing['8'],
              borderBottomLeftRadius: spacing['8'],
              borderBottomRightRadius: spacing['8']
            }}
            value={nameSearch}
            onChangeText={text => {
              setNameSearch(text);
              debouncedHandler(text);
            }}
          />
        </View>
        <View style={styles.addressBookAdd}>
          <Text
            style={{
              fontWeight: '400',
              fontSize: 16,
              color: colors['text-label-list']
            }}
          >
            Contact list
          </Text>
          <OWButton
            onPress={() => {
              smartNavigation.navigateSmart('AddAddressBook', {
                chainId,
                addressBookConfig,
                recipient: ''
              });
            }}
            label="Add new contract"
            fullWidth={false}
            type="link"
            style={{
              height: 'auto'
            }}
            size="medium"
            icon={<OWIcon name="add" color={colors['purple-700']} size={16} />}
          />
        </View>

        <View
          style={
            {
              // flex: 1
            }
          }
        >
          {contractData?.length > 0 ? (
            contractData.map((data, i) => {
              return (
                <React.Fragment key={i.toString()}>
                  <AddressBookItem
                    style={styles.addressBookItem}
                    enabled={isInTransaction}
                    onPress={() => {
                      if (isInTransaction) {
                        addressBookConfig.selectAddressAt(i);
                        smartNavigation.goBack();
                      }
                    }}
                  >
                    <View
                      style={style.flatten([
                        'flex-row',
                        'justify-between',
                        'items-center'
                      ])}
                    >
                      <View>
                        <Text variant="body1" typo="bold">
                          {data.name}
                        </Text>
                        {/* <Text
                        style={style.flatten([
                          'body3',
                          'color-text-black-low',
                          'margin-bottom-4'
                        ])}
                      >
                        {data.memo}
                      </Text> */}
                        <Text
                          variant="caption"
                          typo="bold"
                          color={colors['gray-300']}
                        >
                          {Bech32Address.shortenAddress(data.address, 30)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          alignItems: 'flex-start'
                        }}
                        onPress={async () => {
                          if (
                            await confirmModal.confirm({
                              title: 'Remove contact',
                              paragraph:
                                'Are you sure you want to remove this address?',
                              yesButtonText: 'Remove',
                              noButtonText: 'Cancel',
                              titleStyleCustom: {
                                color: colors['orange-800']
                              },
                              modalRootCustom: {
                                alignItems: 'flex-start'
                              },
                              contentStyleCustom: {
                                textAlign: 'left'
                              },
                              noBtnStyleCustom: {
                                backgroundColor: colors['gray-10'],
                                color: colors['purple-700'],
                                borderColor: 'transparent'
                              },
                              yesBtnStyleCustom: {
                                backgroundColor: colors['orange-800']
                              }
                            })
                          ) {
                            await addressBookConfig.removeAddressBook(i);
                          }
                        }}
                      >
                        <TrashCanIcon
                          color={
                            style.get('color-text-black-very-very-low').color
                          }
                          size={24}
                        />
                      </TouchableOpacity>
                    </View>
                  </AddressBookItem>
                </React.Fragment>
              );
            })
          ) : (
            <OWEmpty />
          )}
        </View>
      </OWBox>
    </PageWithScrollView>
  );
});

export * from './add';
