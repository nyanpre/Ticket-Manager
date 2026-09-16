// グループ参加時にIDを保存
export const saveJoinedGroupId = (groupId: string) => {
  try {
    const list: string[] = JSON.parse(localStorage.getItem('tm_group_ids') || '[]');
    if (!list.includes(groupId)) {
      list.push(groupId);
      localStorage.setItem('tm_group_ids', JSON.stringify(list));
    }
    localStorage.setItem('tm_last_group_id', groupId);
  } catch (e) {
    console.error(e);
  }
};

// グループ削除時にIDを除外
export const removeJoinedGroupId = (groupId: string) => {
  try {
    const list: string[] = JSON.parse(localStorage.getItem('tm_group_ids') || '[]');
    const updated = list.filter((id) => id !== groupId);
    localStorage.setItem('tm_group_ids', JSON.stringify(updated));

    if (localStorage.getItem('tm_last_group_id') === groupId) {
      localStorage.removeItem('tm_last_group_id');
    }
  } catch (e) {
    console.error(e);
  }
};