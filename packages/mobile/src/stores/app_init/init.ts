import { observable, action, makeObservable, computed } from 'mobx';
import { create, persist } from 'mobx-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRC20_LIST } from '@owallet/common';

export class AppInit {
  @persist('object')
  @observable
  protected initApp: {
    status: boolean;
    date_updated: null | number;
    theme: 'dark' | 'light';
    visibleTabBar?: string;
    trc20_list: Array<any>;
    cachePrices: Object;
  };
  @observable
  protected notiData: {};

  constructor() {
    makeObservable(this);
    this.initApp = {
      visibleTabBar: null,
      status: true,
      date_updated: null,
      theme: 'light',
      trc20_list: TRC20_LIST,
      cachePrices: {}
    };
  }

  @computed
  get getInitApp() {
    return this.initApp;
  }

  @action
  updateInitApp() {
    this.initApp = { ...this.initApp, status: false };
  }

  @action
  updateDate(date) {
    this.initApp = { ...this.initApp, date_updated: date };
  }

  @action
  updateTheme(theme) {
    this.initApp = { ...this.initApp, theme };
  }
  @action
  updateVisibleTabBar(visibleTabBar) {
    this.initApp = { ...this.initApp, visibleTabBar };
  }
  @action
  updateTRC20List(list) {
    this.initApp = { ...this.initApp, trc20_list: list };
  }
  @action
  updateCachePrices(prices) {
    this.initApp = { ...this.initApp, cachePrices: prices };
  }
}

const hydrate = create({
  storage: AsyncStorage, // or AsyncStorage in react-native.
  jsonify: true // if you use AsyncStorage, here shoud be true
});

export const appInit = new AppInit();

hydrate('appInit', appInit).then(() => console.log('appInit hydrated'));
