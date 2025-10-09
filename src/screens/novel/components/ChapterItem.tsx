/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useCallback, useMemo, memo, ReactNode, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import color from 'color';
import {
  ChapterBookmarkButton,
  DownloadButton,
} from './Chapter/ChapterDownloadButtons';
import { Button, IconButtonV2 } from '@components';
import { ThemeColors } from '@theme/types';
import { ChapterInfo } from '@database/types';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { Swipeable } from 'react-native-gesture-handler';
import AddChapterModal from './AddChapterModal';

interface ChapterItemProps {
  isDownloading?: boolean;
  isBookmarked?: boolean;
  chapter: ChapterInfo;
  theme: ThemeColors;
  showChapterTitles: boolean;
  isSelected?: boolean;
  downloadChapter: () => void;
  deleteChapter: () => void;
  onSelectPress?: (chapter: ChapterInfo) => void;
  onSelectLongPress?: (chapter: ChapterInfo) => void;
  navigateToChapter: (chapter: ChapterInfo) => void;
  setChapterDownloaded?: (value: boolean) => void;
  handleDeleteChapter?: (chapter: ChapterInfo) => void;
  handleAddChapter?: (chapter: ChapterInfo & { path?: string; name?: string }) => void;
  left?: ReactNode;
  isLocal: boolean;
  isUpdateCard?: boolean;
  novelName: string;
}

const ChapterItem: React.FC<ChapterItemProps> = ({
  isDownloading,
  isBookmarked,
  chapter,
  theme,
  showChapterTitles,
  downloadChapter,
  deleteChapter,
  isSelected,
  onSelectPress,
  onSelectLongPress,
  navigateToChapter,
  setChapterDownloaded,
  handleDeleteChapter,
  handleAddChapter,
  isLocal,
  left,
  isUpdateCard,
  novelName,
}) => {
  const [addModalVisible, setAddModalVisible] = useState(false);

  const { id, name, unread, releaseTime, bookmark, chapterNumber, progress } =
    chapter;

  // Memoized styles
  const leftActionStyle = useMemo(
    () => [styles.buttonGroup, { backgroundColor: theme.inverseSurface }],
    [theme.inverseSurface],
  );
  const rightActionStyle = useMemo(
    () => [styles.buttonGroup, { backgroundColor: theme.error }],
    [theme.error],
  );

  isBookmarked ??= bookmark;

  const swipeableRef = useRef<Swipeable>(null);

  // Memoized render actions
  const renderLeftActions = useCallback(
    (_progress: any, _dragX: any, ref: any) => (
      <View style={leftActionStyle}>
        <IconButtonV2
          name="earth-box-plus"
          size={22}
          color={theme.primary}
          onPress={() => {
            swipeableRef.current?.close();
            setAddModalVisible(true);
          }}
          theme={theme}
        />
      </View>
    ),
    [leftActionStyle, theme, setAddModalVisible],
  );

  const renderRightActions = useCallback(
    (_progress: any, _dragX: any, ref: any) => (
      <View style={rightActionStyle}>
        <IconButtonV2
          name="delete"
          size={22}
          color={theme.onError}
          onPress={() => {
            swipeableRef.current?.close();
            handleDeleteChapter?.(chapter);
          }}
          theme={theme}
        />
      </View>
    ),
    [rightActionStyle, theme, handleDeleteChapter],
  );

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        dragOffsetFromLeftEdge={30}
        dragOffsetFromRightEdge={30}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
      >
        <View key={'chapterItem' + id}>
          <Pressable
            style={[
              styles.chapterCardContainer,
              isSelected && {
                backgroundColor: color(theme.primary).alpha(0.12).string(),
              },
            ]}
            onPress={() => {
              if (onSelectPress) {
                onSelectPress(chapter);
              } else {
                navigateToChapter(chapter);
              }
            }}
            onLongPress={() => onSelectLongPress?.(chapter)}
            android_ripple={{ color: theme.rippleColor }}
          >
            <View style={styles.row}>
              {left}
              {isBookmarked ? <ChapterBookmarkButton theme={theme} /> : null}
              <View style={{ flex: 1 }}>
                {isUpdateCard ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: unread ? theme.onSurface : theme.outline,
                    }}
                    numberOfLines={1}
                  >
                    {novelName}
                  </Text>
                ) : null}
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {unread ? (
                    <MaterialCommunityIcons
                      name="circle"
                      color={theme.primary}
                      size={8}
                      style={styles.unreadIcon}
                    />
                  ) : null}

                  <Text
                    style={{
                      fontSize: isUpdateCard ? 12 : 14,
                      color: !unread
                        ? theme.outline
                        : bookmark
                        ? theme.primary
                        : theme.onSurface,
                      flex: 1,
                    }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {showChapterTitles
                      ? name
                      : getString('novelScreen.chapterChapnum', {
                          num: chapterNumber,
                        })}
                    {chapter.path ? ` — ${chapter.path}` : ''}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {releaseTime && !isUpdateCard ? (
                    <Text
                      style={[
                        {
                          color: !unread
                            ? theme.outline
                            : bookmark
                            ? theme.primary
                            : theme.onSurfaceVariant,
                          marginTop: 4,
                        },
                        styles.text,
                      ]}
                      numberOfLines={1}
                    >
                      {releaseTime}
                    </Text>
                  ) : null}
                  {!isUpdateCard && progress && progress > 0 && chapter.unread ? (
                    <Text
                      style={{
                        color: theme.outline,
                        marginLeft: chapter.releaseTime ? 5 : 0,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                      numberOfLines={1}
                    >
                      {chapter.releaseTime ? '•  ' : null}
                      {getString('novelScreen.progress', { progress })}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
            {!isLocal ? (
              <DownloadButton
                isDownloading={isDownloading}
                isDownloaded={chapter.isDownloaded}
                chapterId={chapter.id}
                theme={theme}
                setChapterDownloaded={setChapterDownloaded}
                deleteChapter={deleteChapter}
                downloadChapter={downloadChapter}
              />
            ) : null}
          </Pressable>
        </View>
      </Swipeable>

      <AddChapterModal
        visible={addModalVisible}
        onDismiss={() => setAddModalVisible(false)}
        onSave={(path, name) => {
          handleAddChapter?.({
            ...chapter,
            path,
            name,
          });
        }}
      />
    </>
  );
};

export default memo(ChapterItem);

const styles = StyleSheet.create({
  chapterCardContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  text: {
    fontSize: 12,
  },
  unreadIcon: {
    marginRight: 4,
  },
});
