import { useState, useEffect } from 'react';
import { User, X, Check, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdated: () => void;
  isInitialSetup?: boolean; // 初回登録時の強制入力モード
}

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  isInitialSetup = false,
}: Props) {
  const currentName =
    currentUser?.user_metadata?.display_name &&
    !currentUser.user_metadata.display_name.includes('@')
      ? currentUser.user_metadata.display_name
      : '';

  const [displayName, setDisplayName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const name =
        currentUser?.user_metadata?.display_name &&
        !currentUser.user_metadata.display_name.includes('@')
          ? currentUser.user_metadata.display_name
          : '';
      setDisplayName(name);
      setErrorMessage('');
      setSuccess(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setSuccess(false);

    try {
      const newName = displayName.trim();

      // 1. Supabase Auth のユーザーメタデータを更新
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: newName },
      });
      if (authError) throw authError;

      // 2. 所属しているグループメンバー情報も同期更新
      if (currentUser?.id) {
        await supabase
          .from('group_members')
          .update({ display_name: newName })
          .eq('user_id', currentUser.id);
      }

      setSuccess(true);
      onProfileUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || '名前の更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (!isInitialSetup && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-['Noto_Sans_JP']"
    >
      <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">
              {isInitialSetup ? 'ニックネームの設定' : 'マイページ（名前設定）'}
            </h2>
          </div>
          {!isInitialSetup && (
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleUpdate} className="p-5 space-y-4">
          {isInitialSetup && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
              <p className="text-xs font-bold text-indigo-950">ようこそ！</p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                チケット共同管理で使用する表示名（ニックネーム）を入力してください。
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              設定が完了しました！
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">表示名（ニックネーム）</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="例: たろう"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              ※他のグループ参加者にはこの名前が表示されます（メールアドレスは公開されません）。
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full py-2.5 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? '保存中...' : isInitialSetup ? '設定して始める' : '名前を保存する'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;