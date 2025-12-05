import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import color from 'color';

import { TabView, TabBar, TabViewProps, SceneMap } from 'react-native-tab-view';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import BottomSheet from '@components/BottomSheet/BottomSheet';
import { overlay } from 'react-native-paper';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { ThemeColors } from '@theme/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Checkbox, SortItem } from '@components/Checkbox/Checkbox';
import { getString } from '@strings/translations';

interface ChaptersSettingsSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModalMethods | null>;
  theme: ThemeColors;
  sortAndFilterChapters?: (sort?: string, filter?: string) => Promise<void>;
  sort?: string;
  filter?: string;
  showChapterTitles?: boolean;
  setShowChapterTitles?: (v: boolean) => void;
}

const ChaptersSettingsSheet = ({
  bottomSheetRef,
  theme,
  sortAndFilterChapters = async () => {},
  sort = '',
  filter = '',
  showChapterTitles = true,
  setShowChapterTitles = () => {},
}: ChaptersSettingsSheetProps) => {
  const { left, right } = useSafeAreaInsets();
  const layout = useWindowDimensions();

  const sortChapters = useCallback(
    (val: string) => sortAndFilterChapters(val, filter),
    [filter, sortAndFilterChapters],
  );

  const filterChapters = useCallback(
    (val: string) => sortAndFilterChapters(sort, val),
    [sort, sortAndFilterChapters],
  );

  // --- Real scene components ---
  const FirstRoute = useCallback(
    () => (
      <View style={styles.flex}>
        <Checkbox
          theme={theme}
          label={getString('novelScreen.bottomSheet.filters.downloaded')}
          status={
            filter.match('AND isDownloaded=1')
              ? true
              : filter.match('AND isDownloaded=0')
              ? 'indeterminate'
              : false
          }
          onPress={() => {
            if (filter.match('AND isDownloaded=1')) {
              filterChapters(filter.replace(' AND isDownloaded=1', ' AND isDownloaded=0'));
            } else if (filter.match('AND isDownloaded=0')) {
              filterChapters(filter.replace(' AND isDownloaded=0', ''));
            } else {
              filterChapters(filter + ' AND isDownloaded=1');
            }
          }}
        />
        <Checkbox
          theme={theme}
          label={getString('novelScreen.bottomSheet.filters.unread')}
          status={
            filter.match('AND `unread`=1')
              ? true
              : filter.match('AND `unread`=0')
              ? 'indeterminate'
              : false
          }
          onPress={() => {
            if (filter.match(' AND `unread`=1')) {
              filterChapters(filter.replace(' AND `unread`=1', ' AND `unread`=0'));
            } else if (filter.match(' AND `unread`=0')) {
              filterChapters(filter.replace(' AND `unread`=0', ''));
            } else {
              filterChapters(filter + ' AND `unread`=1');
            }
          }}
        />
        <Checkbox
          theme={theme}
          label={getString('novelScreen.bottomSheet.filters.bookmarked')}
          status={!!filter.match('AND bookmark=1')}
          onPress={() => {
            filterChapters(
              filter.match('AND bookmark=1') ? filter.replace(' AND bookmark=1', '') : filter + ' AND bookmark=1'
            );
          }}
        />
      </View>
    ),
    [filter, filterChapters, theme],
  );

  const SecondRoute = useCallback(
    () => (
      <View style={styles.flex}>
        <SortItem
          label={getString('novelScreen.bottomSheet.order.bySource')}
          status={sort === 'ORDER BY position ASC' ? 'asc' : sort === 'ORDER BY position DESC' ? 'desc' : undefined}
          onPress={() =>
            sort === 'ORDER BY position ASC' ? sortChapters('ORDER BY position DESC') : sortChapters('ORDER BY position ASC')
          }
          theme={theme}
        />
        <SortItem
          label={getString('novelScreen.bottomSheet.order.byChapterName')}
          status={sort === 'ORDER BY name ASC' ? 'asc' : sort === 'ORDER BY name DESC' ? 'desc' : undefined}
          onPress={() =>
            sort === 'ORDER BY name ASC' ? sortChapters('ORDER BY name DESC') : sortChapters('ORDER BY name ASC')
          }
          theme={theme}
        />
        <SortItem
          label={getString('novelScreen.bottomSheet.order.byChapterNumber')}
          status={sort === 'ORDER BY chapterNumber ASC' ? 'asc' : sort === 'ORDER BY chapterNumber DESC' ? 'desc' : undefined}
          onPress={() =>
            sort === 'ORDER BY chapterNumber ASC' ? sortChapters('ORDER BY chapterNumber DESC') : sortChapters('ORDER BY chapterNumber ASC')
          }
          theme={theme}
        />
      </View>
    ),
    [sort, sortChapters, theme],
  );

  const ThirdRoute = useCallback(
    () => (
      <View style={styles.flex}>
        <Checkbox
          status={showChapterTitles}
          label={getString('novelScreen.bottomSheet.displays.sourceTitle')}
          onPress={() => setShowChapterTitles(true)}
          theme={theme}
        />
        <Checkbox
          status={!showChapterTitles}
          label={getString('novelScreen.bottomSheet.displays.chapterNumber')}
          onPress={() => setShowChapterTitles(false)}
          theme={theme}
        />
      </View>
    ),
    [setShowChapterTitles, showChapterTitles, theme],
  );

  const renderScene = SceneMap({
    first: FirstRoute,
    second: SecondRoute,
    third: ThirdRoute,
  });

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'first', title: getString('common.filter') },
    { key: 'second', title: getString('common.sort') },
    { key: 'third', title: getString('common.display') },
  ]);

  const renderLabel = useCallback(
    ({ route, color: localColor }: { route: any; color: string }) => <Text style={{ color: localColor }}>{route.title}</Text>,
    [],
  );

  const renderTabBar: TabViewProps<any>['renderTabBar'] = props => (
    <TabBar
      {...props}
      renderLabel={renderLabel}
      indicatorStyle={{ backgroundColor: theme.primary }}
      style={[{ backgroundColor: overlay(2, theme.surface), borderBottomColor: theme.outline }, styles.tabBar]}
      inactiveColor={theme.onSurfaceVariant}
      activeColor={theme.primary}
      pressColor={color(theme.primary).alpha(0.12).string()}
    />
  );

  return (
    <BottomSheet snapPoints={[600]} bottomSheetRef={bottomSheetRef} backgroundStyle={{ backgroundColor: theme.surface }}>
      <BottomSheetView style={[styles.contentContainer, { backgroundColor: overlay(2, theme.surface), marginLeft: left, marginRight: right }]}>
        <View style={{ height: 500 }}>
          <TabView
            navigationState={{ index, routes }}
            renderTabBar={renderTabBar}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default ChaptersSettingsSheet;

const styles = StyleSheet.create({
  contentContainer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flex: 1,
  },
  tabView: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 240,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  tabBar: {
    borderBottomWidth: 1,
    elevation: 0,
  },
});
