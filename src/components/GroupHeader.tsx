import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  User, 
  CircleDollarSign, 
  Activity, 
  MoreVertical, 
  Trash2,
  Users,
  ShieldCheck
} from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getOrCreateAnonymousUser().then((user) => {
      if (!user) return;
      const currentMember = members.find((m) => m.user_id === user.id);
      setIsAdmin(currentMember?.role === 'admin');
    });
  }, [members]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/join?token=${group.invite_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteGroup = async () => {
    setMenuOpen(false);
    const confirmed = window.confirm(`本当に「${group.name}」を削除しますか？\n登録されたイベントや精算データもすべて完全に削除されます。`);
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
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3 font-['Noto_Sans_JP']">
      {/* 1. ナビゲーション & グループ情報 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/')}
            title="グループ一覧へ戻る"
            className="p-2 -ml-1 text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-2xl transition shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 truncate leading-tight">
                {group.name}
              </h1>
              {isAdmin && (
                <span className="whitespace-nowrap inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  管理者
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 招待 & メニュー */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 active:bg-indigo-100 text-xs font-bold rounded-xl transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'コピー済' : '招待'}</span>
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-xl transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 border-b border-slate-100">
                メニュー
              </div>
              {isAdmin ? (
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleting}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? '削除中...' : 'グループを削除'}
                </button>
              ) : (
                <div className="px-3 py-2 text-[11px] text-slate-400">
                  管理者のみ操作可能
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. クイックアクションバー（1行分のコンパクト設計） */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={onOpenMyPage}
          className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-100 border border-slate-200/60 rounded-xl transition"
        >
          <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">マイページ</span>
        </button>

        <button
          onClick={onOpenSettlement}
          className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-100 border border-slate-200/60 rounded-xl transition"
        >
          <CircleDollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">精算まとめ</span>
        </button>

        <button
          onClick={onOpenActivity}
          className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-50 hover:bg-slate-100/80 active:bg-slate-100 border border-slate-200/60 rounded-xl transition"
        >
          <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">履歴</span>
        </button>
      </div>

      {/* 3. メンバー一覧 */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0">
          <Users className="w-3.5 h-3.5" />
          <span>{members.length}人</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {members.map((m) => (
            <span
              key={m.id}
              className={`whitespace-nowrap px-2.5 py-0.5 text-[11px] rounded-lg font-medium border ${
                m.role === 'admin'
                  ? 'bg-amber-50/80 border-amber-200/80 text-amber-800 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
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