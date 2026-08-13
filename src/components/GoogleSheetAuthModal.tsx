import React, { useState } from "react";
import { Lock, FileSpreadsheet, ShieldCheck, X, AlertCircle } from "lucide-react";

interface GoogleSheetAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetUrl: string;
  onSuccess?: () => void;
}

export const GoogleSheetAuthModal: React.FC<GoogleSheetAuthModalProps> = ({
  isOpen,
  onClose,
  spreadsheetUrl,
  onSuccess,
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("교사 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/teacher/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem("teacher_session", data.token || "true");
        setPassword("");
        onClose();
        if (onSuccess) {
          onSuccess();
        } else if (spreadsheetUrl) {
          window.open(spreadsheetUrl, "_blank");
        }
      } else {
        setError(data.message || "비밀번호가 올바르지 않습니다.");
      }
    } catch (err) {
      setError("교사 인증 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base">구글 시트 열기 - 교사 인증</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-0.5">
              <p className="font-bold">교사 전용 데이터 보호</p>
              <p className="text-emerald-800">
                학생들의 민감한 개인정보가 담긴 구글 시트 접근 및 다운로드는 담임교사 인증 후 가능합니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>교사 비밀번호 입력</span>
              </label>
              <input
                type="password"
                placeholder="교사 비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{loading ? "인증 중..." : "구글 시트 열기"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
