import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthModal } from '../components/AuthModal';

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [group, setGroup] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });

    if (token) {
      supabase
        .from('groups')
        .select('*')
        .eq('invite_token', token)
        .single()
        .then(({ data }) => setGroup(data));
    }
  }, [token]);

  const handleJoin = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!group) return;

    setJoining(true);
    try {
      const displayName =
        currentUser.user_metadata?.display_name ||
        currentUser.email?.split('@')[0] ||
        'メンバー';

      // 既にグループへ参加済みか確認
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', currentUser.id)
        .single();

      if (!existing) {
        await supabase.from('group_members').insert([
          {
            group_id: group.id,
            user_id: currentUser.id,
            display_name: displayName,
            role: 'member',
          },
        ]);
      }

      navigate(`/group/${group.id}`, { replace: true });
    } catch (err: any) {
      alert(`参加に失敗しました: ${err.message}`);
    } finally {
      setJoining(false);
    }
  };

  if (!token || !group) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Noto_Sans_JP']">
        <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-2">
          <p className="text-xs font-bold text-slate-700">無効な招待リンクです</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Noto_Sans_JP']">
      <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4 shadow-xl border border-slate-200/80">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mx-auto">
          <Ticket className="w-8 h-8" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            招待
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">{group.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">グループへの参加招待が届いています</p>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-2.5 bg-indigo-600 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
        >
          {joining ? '参加処理中...' : currentUser ? 'このグループに参加する' : 'ログインして参加する'}
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
          });
        }}
      />
    </div>
  );
}

export default JoinPage;