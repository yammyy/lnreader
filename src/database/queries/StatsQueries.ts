import { countBy } from 'lodash-es';
import { LibraryStats } from '../types';
import { getAllAsync, getFirstAsync } from '../utils/helpers';

const getLibraryStatsQuery = `
  SELECT COUNT(distinct novelId) as novelsCount, COUNT(DISTINCT pluginId) as sourcesCount
  FROM Novel join NovelCategory on Novel.id=NovelCategory.novelId
  WHERE inLibrary = 1 and categoryId <> -1
  `;

const getChaptersReadCountQuery = `
  SELECT COUNT(distinct Chapter.id) as chaptersRead
  FROM Chapter
  JOIN Novel ON Chapter.novelId = Novel.id
  JOIN NovelCategory ON Novel.id = NovelCategory.novelId
  WHERE Chapter.unread = 0 AND Novel.inLibrary = 1 AND categoryId <> -1
`;

const getChaptersTotalCountQuery = `
  SELECT COUNT(distinct Chapter.id) as chaptersCount
  FROM Chapter
  JOIN Novel ON Chapter.novelId = Novel.id
  JOIN NovelCategory ON Novel.id = NovelCategory.novelId
  WHERE Novel.inLibrary = 1 AND categoryId <> -1
`;

const getChaptersUnreadCountQuery = `
  SELECT COUNT(distinct Chapter.id) as chaptersUnread
  FROM Chapter
  JOIN Novel ON Chapter.novelId = Novel.id
  JOIN NovelCategory ON Novel.id = NovelCategory.novelId
  WHERE Chapter.unread = 1 AND Novel.inLibrary = 1 AND categoryId <> -1
`;

const getChaptersDownloadedCountQuery = `
  SELECT COUNT(distinct Chapter.id) as chaptersDownloaded
  FROM Chapter
  JOIN Novel ON Chapter.novelId = Novel.id
  JOIN NovelCategory ON Novel.id = NovelCategory.novelId
  WHERE Chapter.isDownloaded = 1 AND Novel.inLibrary = 1 AND categoryId <> -1
`;

const getNovelGenresQuery = `
  SELECT distinct LOWER(n.genres) AS genres
  FROM Novel n
  WHERE n.inLibrary = 1
    AND EXISTS (
      SELECT 1
      FROM NovelCategory nc
      WHERE nc.novelId = n.id
        AND nc.categoryId <> -1
    )
  `;

const getNovelStatusQuery = `
  SELECT status
  FROM Novel n
  WHERE n.inLibrary = 1
    AND EXISTS (
      SELECT 1
      FROM NovelCategory nc
      WHERE nc.novelId = n.id
        AND nc.categoryId <> -1
    )
  `;

export const getLibraryStatsFromDb = async (): Promise<LibraryStats> => {
  return getFirstAsync([getLibraryStatsQuery]) as any;
};

export const getChaptersTotalCountFromDb = async (): Promise<LibraryStats> => {
  return getFirstAsync([getChaptersTotalCountQuery]) as any;
};

export const getChaptersReadCountFromDb = async (): Promise<LibraryStats> => {
  return getFirstAsync([getChaptersReadCountQuery]) as any;
};

export const getChaptersUnreadCountFromDb = async (): Promise<LibraryStats> => {
  return getFirstAsync([getChaptersUnreadCountQuery]) as any;
};

export const getChaptersDownloadedCountFromDb =
  async (): Promise<LibraryStats> => {
    return getFirstAsync([getChaptersDownloadedCountQuery]) as any;
  };

export const getNovelGenresFromDb = async (): Promise<LibraryStats> => {
  const genres: string[] = [];
  // Helper: capitalize each word in a string
  const capitalize = (s: string) =>
    s
      .trim() // Trim the whole string first
      .split(' ').
      map(word => {
        const w = word.trim();   // Safety: trim each word
        if (!w) return "";        // Skip empty pieces
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
  await getAllAsync([getNovelGenresQuery]).then(res => {
    (res as any).forEach((item: { genres: string }) => {
      const novelGenres = item.genres?.split(/\s*,\s*/);

      if (novelGenres?.length) {
        genres.push(...novelGenres.map(capitalize));
      }
    });
  });
  return { genres: countBy(genres) };
};

export const getNovelStatusFromDb = async (): Promise<LibraryStats> => {
  const status: string[] = [];
  await getAllAsync([getNovelStatusQuery]).then(res => {
    (res as any).forEach((item: { status: string }) => {
      const novelStatus = item.status?.split(/\s*,\s*/);

      if (novelStatus?.length) {
        status.push(...novelStatus);
      }
    });
  });
  return { status: countBy(status) };
};
