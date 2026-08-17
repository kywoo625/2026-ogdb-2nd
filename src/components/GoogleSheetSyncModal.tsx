import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Copy, Check, ExternalLink, RefreshCw, AlertCircle, X, Sparkles, Globe } from "lucide-react";

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
  const [testing, setTesting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"script" | "github">("script");
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
 * 학생 정보 수집 구글 시트 자동 연동 스크립트 (최신 안정화 버전)
 * 시트 ID: ${spreadsheetId}
 * 
 * [설치 및 배포 순서]
 * 1. 구글 시트 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 코드를 붙여넣은 후 저장(Ctrl+S)합니다.
 * 3. 우측 상단 [배포] -> [새 배포] 클릭
 * 4. 톱니바퀴 -> [웹 앱] 선택
 * 5. [실행 대상]: 나(Me), [액세스 권한]: '모든 사용자(Anyone)' 필수 선택!
 * 6. [배포] 후 생성된 웹 앱 URL(/exec)을 복사하여 웹앱에 입력하세요.
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "학생 정보 수집 구글 시트 연동 웹앱이 정상 작동 중입니다."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {}
    
    if (!ss) {
      ss = SpreadsheetApp.openById("${spreadsheetId}");
    }
    
    var sheet = ss.getActiveSheet() || ss.getSheets()[0];
    
    // 헤더 행이 비어있다면 자동 생성
    if (sheet.getLastRow() === 0) {
      var headers = ["학반", "번호", "학생 이름", "주민등록번호", "휴대폰번호", "보호자 연락처", "건의 사항", "설정 비밀번호", "제출/수정 일시", "시스템 ID"];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0").setHorizontalAlignment("center");
      sheet.getRange("D:F").setNumberFormat("@");
      sheet.getRange("H:H").setNumberFormat("@");
    }
    
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(contents);
    var records = data.records || [];
    
    if (!Array.isArray(records) && data.record) {
      records = [data.record];
    } else if (!Array.isArray(records) && data.id) {
      records = [data];
    }

    var updatedCount = 0;
    var insertedCount = 0;
    var nowStr = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    var allData = sheet.getDataRange().getValues();
    
    records.forEach(function(rec) {
      var rowValues = [
        String(rec.gradeClass || ""),
        String(rec.studentNumber || ""),
        String(rec.studentName || ""),
        String(rec.rrn || ""),
        String(rec.phone || ""),
        String(rec.parentPhone || ""),
        String(rec.notes || ""),
        String(rec.studentPassword || ""),
        nowStr,
        String(rec.id || "")
      ];

      var targetRowIndex = -1;

      // 1) 시스템 ID로 기존 행 검색
      if (rec.id) {
        for (var r = 1; r < allData.length; r++) {
          if (allData[r][9] && String(allData[r][9]).trim() === String(rec.id).trim()) {
            targetRowIndex = r + 1;
            break;
          }
        }
      }

      // 2) 시스템 ID로 못 찾았다면 [학반 + 이름]으로 매칭
      if (targetRowIndex === -1 && rec.gradeClass && rec.studentName) {
        for (var r = 1; r < allData.length; r++) {
          var rGrade = String(allData[r][0]).trim();
          var rName = String(allData[r][2]).trim();
          if (rGrade === String(rec.gradeClass).trim() && rName === String(rec.studentName).trim()) {
            targetRowIndex = r + 1;
            break;
          }
        }
      }

      if (targetRowIndex > 0) {
        sheet.getRange(targetRowIndex, 1, 1, 10).setValues([rowValues]);
        updatedCount++;
      } else {
        sheet.appendRow(rowValues);
        insertedCount++;
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      updated: updatedCount,
      inserted: insertedCount,
      totalProcessed: records.length
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
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

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setSyncMessage({ success: false, text: "테스트할 웹앱 URL을 입력해주세요." });
      return;
    }
    setTesting(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      setSyncMessage({ success: data.success, text: data.message });
    } catch (err) {
      setSyncMessage({ success: false, text: "연동 테스트 요청 중 오류가 발생했습니다." });
    } finally {
      setTesting(false);
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
            <h3 className="font-bold text-base">구글 시트 연동 및 깃허브 배포 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveSubTab("script")}
            className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === "script"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            구글 시트 실시간 연동 설정
          </button>
          <button
            onClick={() => setActiveSubTab("github")}
            className={`pb-2.5 px-3 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === "github"
                ? "border-blue-600 text-blue-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            깃허브(GitHub) 무료 주소 만들기
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs sm:text-sm">
          {activeSubTab === "script" ? (
            <>
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <span>시트 열기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Webhook input & Test */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    구글 시트 Apps Script 웹앱 URL (Webhook URL)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    반드시 <strong className="text-emerald-700">/exec</strong> 로 끝나는 주소
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !webhookUrl}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors shrink-0 border border-slate-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${testing ? "animate-spin" : ""}`} />
                    {testing ? "점검 중..." : "연동 점검"}
                  </button>
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
                  className={`p-3.5 rounded-xl text-xs font-semibold border flex items-start gap-2.5 ${
                    syncMessage.success
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{syncMessage.text}</span>
                </div>
              )}

              {/* Sync Trigger */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  현재 시스템에 등록된 모든 학생 정보를 구글 시트로 즉시 전송합니다.
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
                    최신 Google Apps Script 연동 코드
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "복사완료!" : "코드 전체 복사"}</span>
                  </button>
                </div>

                <div className="text-[12px] text-slate-600 space-y-1 bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl">
                  <p className="font-bold text-amber-900">⚠️ 연동 오류 방지 체크리스트 (매우 중요)</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                    <li>Apps Script 창에서 상단 <strong>[배포] ➔ [새 배포]</strong>를 클릭하세요.</li>
                    <li>유형: <strong>웹 앱</strong> / 실행 대상: <strong>나</strong></li>
                    <li>액세스 권한: <strong>모든 사용자 (Anyone)</strong> 로 선택해야 학생들의 제출이 정상 기록됩니다.</li>
                  </ul>
                </div>

                <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-44 border border-slate-800">
                  {appsScriptCode}
                </pre>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  깃허브(GitHub)로 무료 홈페이지 주소 만들기
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  깃허브 페이지(GitHub Pages) 또는 Vercel 등을 이용하면 <strong>별도의 유료 API 키나 도메인 비용 없이 영구 무료</strong>로 웹사이트 주소(<code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-mono">https://내아이디.github.io/...</code>)를 만들어 배포할 수 있습니다.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-xs text-slate-900">1. API 키가 필요한가요?</p>
                  <p className="text-xs text-slate-600">
                    <strong>아닙니다!</strong> 본 시스템은 구글 시트의 무료 Webhook(웹 앱 URL)을 통해 동작하므로, 깃허브 배포 시 어떠한 유료 API 키도 필요하지 않습니다.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-xs text-slate-900">2. 깃허브 배포 방법 (3단계)</p>
                  <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 mt-1">
                    <li>좌측 상단/우측 상단의 설정 메뉴에서 <strong>Export to GitHub</strong> 또는 코드를 깃허브 리포지토리에 푸시합니다.</li>
                    <li>깃허브 리포지토리의 <strong>Settings ➔ Pages</strong>로 이동합니다.</li>
                    <li><strong>Build and deployment</strong>에서 Source를 GitHub Actions 또는 Deploy from a branch로 선택하여 배포를 활성화합니다.</li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <p className="font-bold text-xs text-slate-900">3. Vercel / Cloudflare로 원클릭 배포 (가장 추천 ⭐)</p>
                  <p className="text-xs text-slate-600">
                    <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Vercel</a> 또는 <a href="https://pages.cloudflare.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Cloudflare Pages</a>에 깃허브 계정을 연결하면 30초 만에 자동으로 무료 HTTPS 주소가 생성되며 바로 학생들에게 배포할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
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
