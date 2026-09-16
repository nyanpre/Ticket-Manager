import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Users, Plus, LogIn, LogOut, ChevronRight, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Group } from '../types/index';
import { AuthModal } from '../components/AuthModal';
import { ProfileModal } from '../components/ProfileModal';

export function HomePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  // 表示名チェック：未設定またはメールアドレスのままの場合は初回登録モーダルを開く
  const checkDisplayNameSetup = (user: any) => {
    if (!user) return;
    const name = user.user_metadata?.display_name;
    if (!name || name.includes('@')) {
      setIsInitialSetup(true);
      setShowProfileModal(true);
    } else {
      setIsInitialSetup(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        checkDisplayNameSetup(user);
        fetchUserGroups(user.id);
      } else {
        setGroups([]);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        checkDisplayNameSetup(user);
        fetchUserGroups(user.id);
      } else {
        setGroups([]);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserGroups = async (userId: string) => {
    setLoading(true);
    try {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberData && memberData.length > 0) {
        const groupIds = memberData.map((m) => m.group_id);
        const { data: groupData } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)
          .order('created_at', { ascending: false });

        setGroups(groupData || []);
      } else {
        setGroups([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser) return;

    setCreating(true);
    try {
      const inviteToken = crypto.randomUUID().slice(0, 8);
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .insert([{ name: newGroupName.trim(), invite_token: inviteToken }])
        .select()
        .single();

      if (groupErr) throw groupErr;

      // メールアドレスは使わずニックネームを使用
      const userDisplayName = currentUser.user_metadata?.display_name || 'メンバー';

      const { error: memberErr } = await supabase.from('group_members').insert([
        {
          group_id: group.id,
          user_id: currentUser.id,
          display_name: userDisplayName,
          role: 'admin',
        },
      ]);

      if (memberErr) throw memberErr;

      setShowCreateModal(false);
      setNewGroupName('');
      navigate(`/group/${group.id}`);
    } catch (err: any) {
      alert(`グループ作成エラー: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      setIsInitialSetup(false);
    }
  };

  // メールアドレスを画面に出さないためのニックネーム取得
  const safeDisplayName =
    currentUser?.user_metadata?.display_name && !currentUser.user_metadata.display_name.includes('@')
      ? currentUser.user_metadata.display_name
      : 'メンバー';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Noto_Sans_JP']">
      <div className="max-w-md w-full mx-auto px-4 py-6 space-y-4 flex-1">
        {/* ヘッダー */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm shadow-indigo-200">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Ticket-Manager</h1>
              <p className="text-xs text-slate-400">グループ一覧</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    setIsInitialSetup(false);
                    setShowProfileModal(true);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50/60 rounded-xl transition"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>設定</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2 py-1.5 rounded-xl transition"
                  title="ログアウト"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 active:bg-indigo-100 px-3 py-1.5 rounded-xl transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ログイン</span>
              </button>
            )}
          </div>
        </div>

        {/* ユーザー情報バー / 未ログインバナー */}
        {currentUser ? (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-600">
              {safeDisplayName} さんのグループ
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              新しいグループを作る
            </button>
          </div>
        ) : (
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-4 text-center space-y-2">
            <p className="text-xs font-bold text-indigo-950">ログインするとグループを永続保持できます</p>
            <p className="text-[11px] text-slate-500">
              Codespacesの再起動や別端末・別ブラウザでもデータが消えなくなります。
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 active:bg-indigo-700 px-4 py-2 rounded-xl transition"
            >
              ログイン / アカウント作成
            </button>
          </div>
        )}

        {/* グループ一覧リスト */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">読み込み中...</div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-500">参加しているグループはありません</p>
            {currentUser && (
              <p className="text-[11px] text-slate-400">右上の「新しいグループを作る」から作成してください</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/group/${group.id}`)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer active:bg-slate-50 transition"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{group.name}</h3>
                  <span className="text-[10px] text-slate-400">作成日: {group.created_at.split('T')[0]}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* グループ作成モーダル */}
      {showCreateModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 font-['Noto_Sans_JP']"
        >
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h2 className="text-sm font-bold text-slate-800">グループ新規作成</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                placeholder="グループ名（例: 遠征仲間）"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  {creating ? '作成中...' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 認証モーダル */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              checkDisplayNameSetup(user);
              fetchUserGroups(user.id);
            }
          });
        }}
      />

      {/* プロフィール設定モーダル（初回名前入力 & 通常の変更） */}
      <ProfileModal
        isOpen={showProfileModal}
        isInitialSetup={isInitialSetup}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onProfileUpdated={refreshCurrentUser}
      />
    </div>
  );
}

export default HomePage;