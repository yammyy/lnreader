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
