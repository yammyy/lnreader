import { BackgroundTaskMetadata } from '@services/ServiceManager';
import { NOVEL_STORAGE } from '@utils/Storages';
import NativeFile from '@specs/NativeFile';
import { db } from '@database/db';
import { getString } from '@strings/translations';

export const importChapter = async (
  {
    pluginId,
    novelId,
    chapterId,
    chapterName,
    filename,
    uri,
  }: {
    pluginId: number;
    novelId: number;
    chapterId: number;
    chapterName: string;
    filename: string;
    uri: string;
  },
  setMeta: (transformer: (meta: BackgroundTaskMetadata) => BackgroundTaskMetadata) => void,
) => {
  setMeta(meta => ({
    ...meta,
    isRunning: true,
    progress: 0,
    progressText: getString('common.preparing'),
  }));


  try {
    // 1. Make directory for the chapter
    const chapterDir = `${NOVEL_STORAGE}/${pluginId}/${novelId}/${chapterId}`;
    if (NativeFile.exists(chapterDir)) {
      NativeFile.unlink(chapterDir); // remove old directory
    }
    NativeFile.mkdir(chapterDir);

    // Add .nomedia file
    const nomediaPath = chapterDir + '/.nomedia';
    NativeFile.writeFile(nomediaPath, ',');

    const chapterFilePath = `${chapterDir}/index.html`;
    NativeFile.copyFile(uri, chapterFilePath);

    console.log('File name:', chapterFilePath);

    // 2. Insert chapter row in database
    const releaseTime = new Date().toISOString();
    await db.runAsync(
      `UPDATE Chapter
       SET releaseTime = ?, isDownloaded = 1
       WHERE id = ?`,
      releaseTime,
      chapterId
    );

    // 3. Update progress
    setMeta(meta => ({
      ...meta,
      progress: 1,
      progressText: getString('common.done'),
      isRunning: false,
    }));
  } catch (error: any) {
    setMeta(meta => ({
      ...meta,
      isRunning: false,
      progressText: getString('advancedSettingsScreen.chapterInsertFailed'),
    }));
    throw error;
  }

};

export const moveChapterFiles = async (oldPluginId: number, newPluginId: number,
                                oldChapterId: number, newChapterId: number,
                                oldNovelId: number, targetNovelId: number) => {
  const oldDir = `${NOVEL_STORAGE}/${oldPluginId}/${oldNovelId}/${oldChapterId}`;
  const newDir = `${NOVEL_STORAGE}/${newPluginId}/${targetNovelId}/${newChapterId}`;

  console.log("Old dir: " + oldDir);
  console.log("New dir: " + newDir);

  if (!NativeFile.exists(oldDir)) {
    console.warn(`Old chapter folder does not exist: ${oldDir}`);
    return;
  }

  if (NativeFile.exists(newDir)) {
    NativeFile.unlink(newDir); // remove old copy in target
  }
  NativeFile.mkdir(newDir);

  console.log('Created:', newDir);

  // Add .nomedia file
  const nomediaPath = newDir + '/.nomedia';
  NativeFile.writeFile(nomediaPath, ',');

  const oldFilePath = `${oldDir}/index.html`;
  const newFilePath = `${newDir}/index.html`;
  NativeFile.copyFile(oldFilePath, newFilePath);

  await db.runAsync(
    `UPDATE Chapter
     SET isDownloaded = 1
     WHERE id = ?`,
    newChapterId
  );

  console.log('File name:', newFilePath);
};

