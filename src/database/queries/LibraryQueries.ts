import { LibraryFilter } from '@screens/library/constants/constants';
import { LibraryNovelInfo, NovelInfo } from '../types';
import { getAllSync } from '../utils/helpers';

export const getLibraryNovelsFromDb = (
  sortOrder?: string,
  filter?: string,
  searchText?: string,
  downloadedOnlyMode?: boolean,
): NovelInfo[] => {
  let query = 'SELECT * FROM Novel WHERE inLibrary = 1';

  if (filter) {
    query += ` AND ${filter} `;
  }
  if (downloadedOnlyMode) {
    query += ' ' + LibraryFilter.DownloadedOnly;
  }

  if (searchText) {
    query += ' AND name LIKE ? ';
  }

  if (sortOrder) {
    query += ` ORDER BY ${sortOrder} `;
  }
  return getAllSync<NovelInfo>([query, [searchText ?? '']]);
};

const getNovelOfCategoryQuery = 'SELECT DISTINCT novelId FROM NovelCategory WHERE 1 = 1 ';
const getNovelsFromIDListQuery = 'SELECT * FROM Novel WHERE inLibrary = 1 ';

export const getLibraryWithCategory = (
                                      categoryId?: number | null,
                                      onlyUpdateOngoingNovels?: boolean,
                                    ): LibraryNovelInfo[] => {
  // 1) Get novelIds from NovelCategory (optionally restrict by categoryId)
  let catQuery = getNovelOfCategoryQuery;
  const preparedArgument: (string | number | null)[] = [];
  if (categoryId) {
      catQuery += ` AND categoryId = ${categoryId}`;
  }

  const idRows = getAllSync<{ novelId: number }>([catQuery, preparedArgument]);

  // If no novelIds found -> return empty result early
  if (!idRows || idRows.length === 0) return [];

  // 2) Query Novel using the collected ids and apply Novel-level filters
  const novelIds = idRows.map(r => r.novelId).join(',');

  let novelQuery = getNovelsFromIDListQuery;

  // Add IN clause for ids (use placeholders)
  novelQuery += ` AND id IN (${novelIds})`;

  // onlyUpdateOngoingNovels -> additional status filter applied to Novel table
  if (onlyUpdateOngoingNovels) {
    novelQuery += ` AND status = 'Ongoing'`;
  }

  const res = getAllSync<LibraryNovelInfo>([novelQuery, preparedArgument]);

  return res;
};
