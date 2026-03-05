import { useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";

const STORAGE_KEY = "zukai_auth";

export function isAuthenticated() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export default function PasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (data.valid) {
        localStorage.setItem(STORAGE_KEY, "true");
        onAuthenticated();
      } else {
        setError("パスワードが正しくありません");
      }
    } catch {
      setError("認証に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ZukaiMaker</h1>
          <p className="text-sm text-gray-500 mt-1">AI図解作成ツール</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">アクセスパスワード</span>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            autoFocus
            disabled={loading}
          />

          {error && (
            <p className="text-red-500 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                確認中...
              </>
            ) : (
              "ログイン"
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            パスワードは不定期に変更されます
          </p>
        </form>
      </div>
    </div>
  );
}
