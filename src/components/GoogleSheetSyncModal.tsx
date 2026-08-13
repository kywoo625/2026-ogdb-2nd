import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Copy, Check, ExternalLink, RefreshCw, AlertCircle, X, Sparkles } from "lucide-react";

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  spreadsheetUrl: string;
  spreadsheetId: string;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  spreadsheetUrl,
  spreadsheetId,
}) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Fetch current config on load
  useEffect(() => {
    if (isOpen) {
      fetch("/api/sync/config")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.webhookUrl) {
            setWebhookUrl(data.webhookUrl);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Google Apps Script template code
  const appsScriptCode = `/**
 * 구글 시트 웹앱 스크립트 (학생 정보 자동 수집)
 * 구글 시트 ID: ${spreadsheetId}
 * 
 * [설치 방법]
 * 1. 구글 시트 (${spreadsheetUrl}) 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 2. 기존 코드를 모두 삭제하고 본 코드를 붙여넣기 합니다.
 * 3. 우측 상단 [배포] -> [새 배포] 클릭
 * 4. 유형 선택 [웹 앱] -> 액세스 권한 [모든 사용자(Anyone)] 설정 후 [배포]
 * 5. 생성된 "웹 앱 URL"을 아래 웹앱 설정에 붙여넣으세요!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 헤더 행이 없다면 자동 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["학반", "학생 이름", "주민등록번호", "휴대폰번호", "제출/수정 일시", "시스템 ID"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    var data = JSON.parse(e.postData.contents);
    var records = data.records || [];
    
    records.forEach(function(rec) {
      // 기존에 동일 ID가 있는지 검색하여 업데이트
      var finder = sheet.createTextFinder(rec.id);
      var results = finder.findAll();
      var nowStr = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      
      if (results.length > 0) {
        var row = results[0].getRow();
        sheet.getRange(row, 1, 1, 6).setValues([[
          rec.gradeClass,
          rec.studentName,
          rec.rrn,
          rec.phone,
          nowStr,
          rec.id
        ]]);
      } else {
        sheet.appendRow([
          rec.gradeClass,
          rec.studentName,
          rec.rrn,
          rec.phone,
          nowStr,
          rec.id
        ]);
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({ result: "success", count: records.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage({ success: true, text: "웹훅 URL 설정이 성공적으로 저장되었습니다!" });
      } else {
        setSyncMessage({ success: false, text: "저장에 실패했습니다." });
      }
    } catch (err) {
      setSyncMessage({ success: false, text: "서버 저장 연결 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync/trigger", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncMessage({ success: true, text: data.message || "구글 시트로 동기화 완료!" });
      } else {
        setSyncMessage({ success: false, text: data.message || "동기화 실패" });
      }
    } catch (err) {
      setSyncMessage({ success: false, text: "동기화 요청 실패" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">구글 시트 연동 설정 및 동기화</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs sm:text-sm">
          {/* Target Sheet Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-900">연동대상 지정 구글 시트</p>
              <p className="text-xs text-emerald-700 font-mono mt-0.5 truncate max-w-md">
                ID: {spreadsheetId}
              </p>
            </div>
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>시트 열기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Webhook input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              구글 시트 Apps Script 웹앱 URL (Webhook URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors shrink-0"
              >
                {saving ? "저장 중..." : "URL 저장"}
              </button>
            </div>
          </div>

          {syncMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                syncMessage.success
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-rose-50 text-rose-900 border-rose-200"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{syncMessage.text}</span>
            </div>
          )}

          {/* Sync Trigger */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              현재 저장된 학생 정보 전체를 구글 시트로 즉시 전송합니다.
            </p>
            <button
              onClick={handleTriggerSync}
              disabled={syncing || !webhookUrl}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "동기화 중..." : "구글 시트로 즉시 동기화"}</span>
            </button>
          </div>

          {/* Guide Section with Script */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                1분 만에 구글 시트 연동 스크립트 설정하기
              </span>
              <button
                onClick={handleCopyCode}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "복사완료!" : "스크립트 코드 복사"}</span>
              </button>
            </div>

            <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 border border-slate-800">
              {appsScriptCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
