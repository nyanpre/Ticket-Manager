import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, Check, Home, User, CircleDollarSign, Activity, Trash2 } from 'lucide-react';
import { supabase, getOrCreateAnonymousUser } from '../lib/supabase';
import type { Group, GroupMember } from '../types';
import { removeJoinedGroupId } from '../utils/storage';

interface Props {
  group: Group;
  members: GroupMember[];
  onOpenMyPage?: () => void;
  onOpenSettlement?: () => void;
  onOpenActivity?: () => void;
}

export function GroupHeader({ group, members, onOpenMyPage, onOpenSettlement, onOpenActivity }: Props) {
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getOrCreateAnonymousUser().then((user) => {
      if (!user) return;
      const currentMember = members.find((m) => m.user_id === user.id);
      setIsAdmin(currentMember?.role === 'admin');
    });
  }, [members]);

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/join?token=${group.invite_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteGroup = async () => {
    const confirmed = window.confirm(`本当に"${group.name}"を削除しますか？\n登録されたイベントや精算情報もすべて削除されます。`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from('groups').delete().eq('id', group.id);
      if (error) throw error;

      removeJoinedGroupId(group.id);
      alert('グループを削除しました。');
      navigate('/', { replace: true });
    } catch (err: any) {
      alert(`削除に失敗しました: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/')}
            title="グループ一覧へ戻る"
            className="p-2.5 bg-slate-100 active:bg-slate-200 text-slate-600 rounded-2xl transition shrink-0"
          >
            <Home className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">
                Group
              </span>
              {isAdmin && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  管理者
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-0.5">{group.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-end">
          {isAdmin && (
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              title="グループを削除"
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenActivity && (
            <button
              onClick={onOpenActivity}
              title="履歴"
              className="p-2 bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl transition"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenSettlement && (
            <button
              onClick={onOpenSettlement}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 active:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition shrink-0"
            >
              <CircleDollarSign className="w-3.5 h-3.5" />
              精算
            </button>
          )}

          {onOpenMyPage && (
            <button
              onClick={onOpenMyPage}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 active:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              マイページ
            </button>
          )}

          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 active:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '済' : '招待'}
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
          <Users className="w-3.5 h-3.5" />
          <span>メンバー ({members.length}人)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <span
              key={m.id}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border ${
                m.role === 'admin'
                  ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {m.display_name} {m.role === 'admin' && '(主)'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}