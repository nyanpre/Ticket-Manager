import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, getOrCreateAnonymousUser } from '../lib/supabase';
import type { Group } from '../types';
import { saveJoinedGroupId } from '../utils/storage';

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [userName, setUserName] = useState('');
  const [groupInfo, setGroupInfo] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroupByToken = async () => {
      if (!token) return;
      const { data } = await supabase.from('groups').select('*').eq('invite_token', token).single();
      if (data) setGroupInfo(data);
      setLoading(false);
    };
    fetchGroupByToken();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !groupInfo) return;

    setJoining(true);
    try {
      const user = await getOrCreateAnonymousUser();
      if (!user) throw new Error('ユーザー情報の取得に失敗しました');

      const { error } = await supabase.from('group_members').upsert([{
        group_id: groupInfo.id,
        user_id: user.id,
        display_name: userName,
        role: 'member'
      }]);

      if (error) throw error;

      saveJoinedGroupId(groupInfo.id);
      navigate(`/group/${groupInfo.id}`);
    } catch (err: any) {
      alert(`参加に失敗しました: ${err.message}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-400">招待を確認中...</div>;
  if (!groupInfo) return <div className="p-8 text-center text-sm text-rose-500">無効な招待URLです</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center px-4 pt-safe pb-safe">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-sm p-6 border border-slate-200/80">
        <h2 className="text-lg font-bold text-slate-800 mb-1">グループ参加</h2>
        <p className="text-slate-500 text-xs mb-6">
          「<span className="font-semibold text-indigo-600">{groupInfo.name}</span>」に参加します
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">ニックネーム</label>
            <input
              type="text"
              required
              placeholder="例: さとう"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={joining}
            className="w-full py-3.5 bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-200 transition"
          >
            {joining ? '参加登録中...' : '参加して開く'}
          </button>
        </form>
      </div>
    </div>
  );
}