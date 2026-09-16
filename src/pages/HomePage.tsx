import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Plus, Users, ChevronRight } from 'lucide-react';
import { supabase, getOrCreateAnonymousUser } from '../lib/supabase';
import type { Group } from '../types';
import { saveJoinedGroupId } from '../utils/storage';

export function HomePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    setLoading(true);
    try {
      const storedIds: string[] = JSON.parse(localStorage.getItem('tm_group_ids') || '[]');
      if (storedIds.length > 0) {
        const { data } = await supabase.from('groups').select('*').in('id', storedIds);
        if (data) setGroups(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !adminName.trim()) return;

    setCreating(true);
    try {
      const user = await getOrCreateAnonymousUser();
      if (!user) throw new Error('ユーザー情報の取得に失敗しました');

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ name: groupName }])
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{
          group_id: group.id,
          user_id: user.id,
          display_name: adminName,
          role: 'admin'
        }]);

      if (memberError) throw memberError;

      saveJoinedGroupId(group.id);
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      alert(`作成に失敗しました: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pt-safe pb-safe">
      <div className="max-w-md w-full mx-auto px-4 py-6 space-y-5 flex-1">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-100">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Ticket-Manager</h1>
            <p className="text-xs text-slate-400">グループ一覧</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-700">参加中のグループ</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600"
            >
              <Plus className="w-3.5 h-3.5" />
              新しいグループを作る
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">読み込み中...</div>
          ) : groups.length === 0 && !showCreateForm ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">参加しているグループはありません</p>
              <p className="text-[11px] text-slate-400">右上の「新しいグループを作る」から登録してください</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => {
                    localStorage.setItem('tm_last_group_id', g.id);
                    navigate(`/group/${g.id}`);
                  }}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between active:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{g.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-800 mb-4">新規グループ作成</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">グループ名</label>
                <input
                  type="text"
                  required
                  placeholder="例: いつもの遠征組"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ニックネーム</label>
                <input
                  type="text"
                  required
                  placeholder="例: たなか"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {creating ? '作成中...' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}