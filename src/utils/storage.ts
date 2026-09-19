const GROUP_IDS_KEY = 'tm_group_ids';
const LAST_GROUP_ID_KEY = 'tm_last_group_id';

// 保存されているグループIDリストを取得
export const getJoinedGroupIds = (): string[] => {
  try {
    const raw = localStorage.getItem(GROUP_IDS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to load joined group IDs', e);
    return [];
  }
};

// グループ参加時にIDを保存
export const saveJoinedGroupId = (groupId: string) => {
  if (!groupId) return;
  try {
    const list = getJoinedGroupIds();
    if (!list.includes(groupId)) {
      list.push(groupId);
      localStorage.setItem(GROUP_IDS_KEY, JSON.stringify(list));
    }
    localStorage.setItem(LAST_GROUP_ID_KEY, groupId);
  } catch (e) {
    console.error('Failed to save joined group ID', e);
  }
};

// グループ削除時にIDを除外
export const removeJoinedGroupId = (groupId: string) => {
  if (!groupId) return;
  try {
    const list = getJoinedGroupIds();
    const updated = list.filter((id) => id !== groupId);
    localStorage.setItem(GROUP_IDS_KEY, JSON.stringify(updated));

    if (localStorage.getItem(LAST_GROUP_ID_KEY) === groupId) {
      localStorage.removeItem(LAST_GROUP_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to remove joined group ID', e);
  }
};