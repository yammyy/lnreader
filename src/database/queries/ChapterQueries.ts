import { showToast } from '@utils/showToast';
import {
  ChapterInfo,
  DownloadedChapter,
  UpdateOverview,
  Update,
} from '../types';
import { ChapterItem } from '@plugins/types';

import { getString } from '@strings/translations';
import { NOVEL_STORAGE } from '@utils/Storages';
import { db } from '@database/db';
import NativeFile from '@specs/NativeFile';

// #region Mutations

export const insertChapters = async (
  novelId: number,
  chapters?: ChapterItem[],
) => {
  if (!chapters?.length) {
    return;
  }

  await db.withExclusiveTransactionAsync(async tx => {
    for (let index = 0; index < chapters.length; index++) {
      const chapter = chapters[index];
      const chapterName = chapter.name ?? `Chapter ${String(index + 1).padStart(5, '0')}`;
      const chapterPage = chapter.page || '1';

      const result = await tx.runAsync(
        `
          INSERT INTO Chapter (path, name, releaseTime, novelId, chapterNumber, page, position)
          SELECT ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (SELECT id FROM Chapter WHERE path = ? AND novelId = ?);
        `,
        chapter.path,
        chapterName,
        chapter.releaseTime || '',
        novelId,
        chapter.chapterNumber || null,
        chapterPage,
        index,
        chapter.path,
        novelId,
      );

      const insertId = result.lastInsertRowId;

      if (!insertId || insertId < 0) {
        await tx.runAsync(
          `
            UPDATE Chapter SET
              page = ?, position = ?, name = ?, releaseTime = ?, chapterNumber = ?
            WHERE path = ? AND novelId = ? AND (page != ? OR position != ? OR name != ? OR releaseTime != ? OR chapterNumber != ?);
          `,
          chapterPage,
          index,
          chapterName,
          chapter.releaseTime || '',
          chapter.chapterNumber || null,
          chapter.path,
          novelId,
          chapterPage,
          index,
          chapterName,
          chapter.releaseTime || '',
          chapter.chapterNumber || null,
        );
      }
    }
  });
};

export const insertChaptersAndReturnIndex = async (
  novelId: number,
  chapters?: ChapterItem[],
): Promise<number[]> => {
  if (!chapters?.length) return [];

  await db.withTransactionAsync(async () => {
    const statement = db.prepareSync(`
      INSERT INTO Chapter (path, name, releaseTime, novelId, chapterNumber, page, position)
      VALUES (?, ?, ?, ${novelId}, ?, ?, ?)
      ON CONFLICT(path, novelId) DO UPDATE SET
        page = excluded.page,
        position = excluded.position,
        name = excluded.name,
        releaseTime = excluded.releaseTime,
        chapterNumber = excluded.chapterNumber;
    `);

    try {
      chapters.forEach((chapter, index) => {
        statement.executeSync(
          chapter.path,
          chapter.name ?? 'Chapter ' + String(index + 1).padStart(5, '0'),
          chapter.releaseTime ?? '',
          chapter.chapterNumber ?? null,
          chapter.page ?? '1',
          index,
        );
      });
    } finally {
      statement.finalizeSync();
    }
  });

  // After insert, get the IDs
  const ids: number[] = chapters.map(chapter => {
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM Chapter WHERE novelId = ? AND path = ?`,
      [novelId, chapter.path],
    );
    return row?.id ?? 0;
  });

  return ids;
};

export const insertChapterAndAdjustPositions = async (
  novelId: number,
  newChapter: ChapterItem,
) => {
  await db.withTransactionAsync(async () => {
    // Step 1: shift all chapters after the target position
    const shiftStatement = db.prepareSync(
      `UPDATE Chapter
       SET position = position + 1
       WHERE novelId = ? AND position >= ?`
    );
    try {
      shiftStatement.executeSync(novelId, newChapter.position ?? 0);
    } finally {
      shiftStatement.finalizeSync();
    }

    // Step 2: insert the new chapter at the desired position
    const insertStatement = db.prepareSync(`
      INSERT INTO Chapter (path, name, releaseTime, novelId, chapterNumber, page, position)
      VALUES (?, ?, ?, ${novelId}, ?, ?, ?)
      ON CONFLICT(path, novelId) DO UPDATE SET
        page = excluded.page,
        position = excluded.position,
        name = excluded.name,
        releaseTime = excluded.releaseTime,
        chapterNumber = excluded.chapterNumber;
    `);

    try {
      insertStatement.executeSync(
        newChapter.path,
        newChapter.name ?? 'Chapter',
        newChapter.releaseTime || '',
        newChapter.chapterNumber || null,
        newChapter.page || '1',
        newChapter.position ?? 0,
      );
    } finally {
      insertStatement.finalizeSync();
    }
  });
};

export const updateChapterPath = async (
  novelId: number,
  chapter: { id?: number; path?: string; name?: string; chapterNumber?: string },
) => {
  if (!chapter.id) throw new Error('Chapter ID is required to update path and name');

  const updateStatement = db.prepareSync(`
    UPDATE Chapter
    SET
      path = COALESCE(?, path),
      name = COALESCE(?, name),
      chapterNumber = COALESCE(?, chapterNumber)
    WHERE id = ? AND novelId = ?;
  `);

  try {
    updateStatement.executeSync(
      chapter.path ?? null,
      chapter.name ?? null,
      chapter.chapterNumber ?? null,
      chapter.id,
      novelId,
    );
  } finally {
    updateStatement.finalizeSync();
  }
};

export const markChapterRead = (chapterId: number) =>
  db.runAsync('UPDATE Chapter SET `unread` = 0 WHERE id = ?', chapterId);

export const deleteChapterFromDb = async (chapterId: number) => {
  // Step 1: get the chapter's position and novelId
  const chapter = await db.getFirstAsync<{ position: number; novelId: number }>(
        'SELECT position, novelId FROM Chapter WHERE id = ?',
        chapterId
      );

  if (!chapter) return;

  const { position: currentPosition, novelId } = chapter;

  // Step 2: delete the chapter
  await db.runAsync('DELETE FROM Chapter WHERE id = ?', chapterId);

  // Step 3: shift positions of all following chapters
  await db.runAsync(
    `UPDATE Chapter
     SET position = position - 1
     WHERE novelId = ? AND position > ?`,
    novelId,
    currentPosition
  );
};

export const deleteChaptersFromDb = async (chapterIds: number[]) => {
  if (!chapterIds?.length) return;

  await db.withTransactionAsync(async () => {
    // Step 1: get deleted chapters' positions and novelId
    const chapters = await db.getAllAsync<{ id: number; position: number; novelId: number }>(
      `SELECT id, position, novelId FROM Chapter WHERE id IN (${chapterIds.map(() => '?').join(',')})`,
      ...chapterIds
    );

    if (!chapters.length) return;

    const novelId = chapters[0].novelId;

    // Step 2: delete the chapters
    await db.runAsync(
      `DELETE FROM Chapter WHERE id IN (${chapterIds.map(() => '?').join(',')})`,
      ...chapterIds
    );

    // Step 3: shift positions of remaining chapters in one query
    await db.runAsync(
      `
      UPDATE Chapter
      SET position = position - (
        SELECT COUNT(*)
        FROM Chapter AS deleted
        WHERE deleted.id IN (${chapterIds.map(() => '?').join(',')})
          AND deleted.position < Chapter.position
      )
      WHERE novelId = ?
      `,
      ...chapterIds,
      novelId
    );
  });
};

export const markChaptersRead = (chapterIds: number[]) =>
  db.execAsync(
    `UPDATE Chapter SET \`unread\` = 0 WHERE id IN (${chapterIds.join(',')})`,
  );

export const markChapterUnread = (chapterId: number) =>
  db.runAsync('UPDATE Chapter SET `unread` = 1 WHERE id = ?', chapterId);

export const markChaptersUnread = (chapterIds: number[]) =>
  db.execAsync(
    `UPDATE Chapter SET \`unread\` = 1 WHERE id IN (${chapterIds.join(',')})`,
  );

export const markAllChaptersRead = (novelId: number) =>
  db.runAsync('UPDATE Chapter SET `unread` = 0 WHERE novelId = ?', novelId);

export const markAllChaptersUnread = (novelId: number) =>
  db.runAsync('UPDATE Chapter SET `unread` = 1 WHERE novelId = ?', novelId);

const deleteDownloadedFiles = async (
  pluginId: string,
  novelId: number,
  chapterId: number,
) => {
  try {
    const chapterFolder = `${NOVEL_STORAGE}/${pluginId}/${novelId}/${chapterId}`;
    NativeFile.unlink(chapterFolder);
  } catch {
    throw new Error(getString('novelScreen.deleteChapterError'));
  }
};

// delete downloaded chapter
export const deleteChapter = async (
  pluginId: string,
  novelId: number,
  chapterId: number,
) => {
  await deleteDownloadedFiles(pluginId, novelId, chapterId);
  await db.runAsync(
    'UPDATE Chapter SET isDownloaded = 0 WHERE id = ?',
    chapterId,
  );
};

export const deleteChapters = async (
  pluginId: string,
  novelId: number,
  chapters?: ChapterInfo[],
) => {
  if (!chapters?.length) {
    return;
  }
  const chapterIdsString = chapters?.map(chapter => chapter.id).toString();

  await Promise.all(
    chapters?.map(chapter =>
      deleteDownloadedFiles(pluginId, novelId, chapter.id),
    ),
  );
  await db.execAsync(
    `UPDATE Chapter SET isDownloaded = 0 WHERE id IN (${chapterIdsString})`,
  );
};

export const deleteDownloads = async (chapters: DownloadedChapter[]) => {
  await Promise.all(
    chapters?.map(chapter => {
      deleteDownloadedFiles(chapter.pluginId, chapter.novelId, chapter.id);
    }),
  );
  await db.execAsync('UPDATE Chapter SET isDownloaded = 0');
};

export const deleteReadChaptersFromDb = async () => {
  const chapters = await getReadDownloadedChapters();
  await Promise.all(
    chapters?.map(chapter => {
      deleteDownloadedFiles(chapter.pluginId, chapter.novelId, chapter.novelId);
    }),
  );
  const chapterIdsString = chapters?.map(chapter => chapter.id).toString();
  db.execAsync(
    `UPDATE Chapter SET isDownloaded = 0 WHERE id IN (${chapterIdsString})`,
  );
  showToast(getString('novelScreen.readChaptersDeleted'));
};

export const updateChapterProgress = (chapterId: number, progress: number) =>
  db.runAsync(
    'UPDATE Chapter SET progress = ? WHERE id = ?',
    progress,
    chapterId,
  );

export const updateChapterProgressByIds = (
  chapterIds: number[],
  progress: number,
) =>
  db.runAsync(
    `UPDATE Chapter SET progress = ? WHERE id in (${chapterIds.join(',')})`,
    progress,
  );

export const bookmarkChapter = (chapterId: number) =>
  db.runAsync(
    'UPDATE Chapter SET bookmark = (CASE WHEN bookmark = 0 THEN 1 ELSE 0 END) WHERE id = ?',
    chapterId,
  );

export const markPreviuschaptersRead = (chapterId: number, novelId: number) =>
  db.runAsync(
    'UPDATE Chapter SET `unread` = 0 WHERE id <= ? AND novelId = ?',
    chapterId,
    novelId,
  );

export const markPreviousChaptersUnread = (
  chapterId: number,
  novelId: number,
) =>
  db.runAsync(
    'UPDATE Chapter SET `unread` = 1 WHERE id <= ? AND novelId = ?',
    chapterId,
    novelId,
  );

export const clearUpdates = () =>
  db.execAsync('UPDATE Chapter SET updatedTime = NULL');

// #endregion
// #region Selectors

export const getNovelPluginId = (targetNovelId: number) =>
  db.getFirstAsync<{ pluginId: number }>(
    'SELECT pluginId FROM Novel WHERE id = ?',
    targetNovelId,
  );

export const getCustomPages = (novelId: number) =>
  db.getAllSync<{ page: string }>(
    'SELECT DISTINCT page from Chapter WHERE novelId = ?',
    novelId,
  );

export const getNovelChapters = (novelId: number) =>
  db.getAllAsync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE novelId = ?',
    novelId,
  );

export const getUnreadNovelChapters = (novelId: number) =>
  db.getAllAsync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE novelId = ? AND unread = 1',
    novelId,
  );

export const getAllUndownloadedChapters = (novelId: number) =>
  db.getAllAsync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE novelId = ? AND isDownloaded = 0',
    novelId,
  );

export const getAllUndownloadedAndUnreadChapters = (novelId: number) =>
  db.getAllAsync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE novelId = ? AND isDownloaded = 0 AND unread = 1',
    novelId,
  );

export const getChapter = (chapterId: number) =>
  db.getFirstAsync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE id = ?',
    chapterId,
  );

const getPageChaptersQuery = (
  sort = 'ORDER BY position ASC',
  filter = '',
  limit?: number,
  offset?: number,
) =>
  `
    SELECT * FROM Chapter 
    WHERE novelId = ? AND page = ? 
    ${filter} ${sort} 
    ${limit ? `LIMIT ${limit}` : ''} 
    ${offset ? `OFFSET ${offset}` : ''}`;

export const getPageChapters = (
  novelId: number,
  sort?: string,
  filter?: string,
  page?: string,
  offset?: number,
  limit?: number,
) => {
  return db.getAllAsync<ChapterInfo>(
    getPageChaptersQuery(sort, filter, limit, offset),
    novelId,
    page || '1',
  );
};

export const getChapterCount = (novelId: number, page: string = '1') =>
  db.getFirstSync<{ 'COUNT(*)': number }>(
    'SELECT COUNT(*) FROM Chapter WHERE novelId = ? AND page = ?',
    novelId,
    page,
  )?.['COUNT(*)'] ?? 0;

export const getPageChaptersBatched = (
  novelId: number,
  sort?: string,
  filter?: string,
  page?: string,
  batch: number = 0,
) => {
  return db.getAllSync<ChapterInfo>(
    getPageChaptersQuery(sort, filter, 300, 300 * batch),
    novelId,
    page || '1',
  );
};

export const getPrevChapter = (
  novelId: number,
  chapterPosition: number,
  page: string,
) =>
  db.getFirstAsync<ChapterInfo>(
    `SELECT * FROM Chapter 
      WHERE novelId = ? 
      AND (
        (position < ? AND page = ?) 
        OR page < ?
      )
      ORDER BY position DESC, page DESC`,
    novelId,
    chapterPosition,
    page,
    page,
  );

export const getNextChapter = (
  novelId: number,
  chapterPosition: number,
  page: string,
) =>
  db.getFirstAsync<ChapterInfo>(
    `SELECT * FROM Chapter 
      WHERE novelId = ? 
      AND (
        (page = ? AND position > ?)  
        OR (position = 0 AND page > ?) 
      )
      ORDER BY position ASC, page ASC`,
    novelId,
    page,
    chapterPosition,
    page,
  );

const getReadDownloadedChapters = () =>
  db.getAllAsync<DownloadedChapter>(`
        SELECT Chapter.id, Chapter.novelId, pluginId 
        FROM Chapter
        JOIN Novel
        ON Novel.id = Chapter.novelId AND unread = 0 AND isDownloaded = 1`);

export const getDownloadedChapters = () =>
  db.getAllAsync<DownloadedChapter>(`
    SELECT
      Chapter.*,
      Novel.pluginId, Novel.name as novelName, Novel.cover as novelCover, Novel.path as novelPath
    FROM Chapter
    JOIN Novel
    ON Chapter.novelId = Novel.id
    WHERE Chapter.isDownloaded = 1
  `);

export const getNovelDownloadedChapters = (
  novelId: number,
  startPosition?: number,
  endPosition?: number,
) => {
  if (startPosition !== undefined && endPosition !== undefined) {
    return db.getAllAsync<ChapterInfo>(
      'SELECT * FROM Chapter WHERE novelId = ? AND isDownloaded = 1 AND position >= ? AND position <= ? ORDER BY position ASC',
      novelId,
      startPosition - 1,
      endPosition - 1,
    );
  }

  return db.getAllAsync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE novelId = ? AND isDownloaded = 1 ORDER BY position ASC',
    novelId,
  );
};

export const getUpdatedOverviewFromDb = () =>
  db.getAllAsync<UpdateOverview>(`SELECT
  Novel.id AS novelId,
  Novel.name AS novelName,
  Novel.cover AS novelCover,
  Novel.path AS novelPath,
  DATE(Chapter.updatedTime) AS updateDate, -- Extract the date from updatedTime
  COUNT(*) AS updatesPerDay
FROM
  Chapter
JOIN
  Novel
ON
  Chapter.novelId = Novel.id
WHERE
  Chapter.updatedTime IS NOT NULL
GROUP BY
  Novel.id,
  Novel.name,
  Novel.cover,
  Novel.path,
  DATE(Chapter.updatedTime) -- Group by date and novelId
ORDER BY
  novelId,
  updateDate;

`);

export const getDetailedUpdatesFromDb = async (
  novelId: number,
  onlyDownloadableChapters?: boolean,
) => {
  const result = db.getAllAsync<Update>(
    `
SELECT
  Chapter.*,
  pluginId, Novel.id as novelId, Novel.name as novelName, Novel.path as novelPath, cover as novelCover
FROM
  Chapter
JOIN
  Novel
  ON Chapter.novelId = Novel.id
WHERE novelId = ?  ${
      onlyDownloadableChapters
        ? 'AND Chapter.isDownloaded = 1 '
        : 'AND updatedTime IS NOT NULL'
    }
ORDER BY updatedTime DESC; 
`,
    novelId,
  );

  return await result;
};

export const isChapterDownloaded = (chapterId: number) =>
  !!db.getFirstSync<ChapterInfo>(
    'SELECT * FROM Chapter WHERE id = ? AND isDownloaded = 1',
    chapterId,
  );
