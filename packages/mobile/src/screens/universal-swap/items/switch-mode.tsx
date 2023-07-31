import React, { FunctionComponent, useEffect, useState } from 'react';
import { SettingItem } from '../components';
import { Toggle } from '../../../components/toggle';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../../stores';
import delay from 'delay';

export const SettingSwitchModeItem: FunctionComponent<{
  topBorder?: boolean;
}> = observer(({ topBorder }) => {
  const { appInitStore } = useStore();
  console.log('appInitStore.getInitApp.theme: ', appInitStore.getInitApp.theme);

  const [toggle, setToggle] = useState(
    appInitStore.getInitApp.theme == 'dark' ? true : false
  );

  useEffect(() => {
    handleUpdateTheme(toggle, appInitStore.getInitApp.theme);
  }, [toggle, appInitStore.getInitApp.theme]);
  const handleUpdateTheme = async (toggle, theme) => {
    if (toggle && theme === 'light') {
      await delay(130);
      appInitStore.updateTheme('dark');
    } else if (!toggle && theme === 'dark') {
      await delay(130);
      appInitStore.updateTheme('light');
    }
  };
  return (
    <React.Fragment>
      <SettingItem
        label="Dark mode"
        right={
          <Toggle
            on={toggle}
            onChange={(value) => {
              setToggle(value);
            }}
          />
        }
        topBorder={topBorder}
      />
    </React.Fragment>
  );
});
