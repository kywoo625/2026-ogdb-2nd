import React from "react";
import { UserCheck, ShieldCheck, ExternalLink, FileSpreadsheet } from "lucide-react";

interface HeaderProps {
  activeTab: "student" | "teacher";
  setActiveTab: (tab: "student" | "teacher") => void;
  spreadsheetUrl: string;
  onOpenGoogleSheet?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, spreadsheetUrl, onOpenGoogleSheet }) => {
  const handleSheetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenGoogleSheet) {
      onOpenGoogleSheet();
    } else {
      window.open(spreadsheetUrl, "_blank");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight leading-tight">
                학생 정보 수집 시스템
              </h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                실시간 구글 시트 연동 지원
              </p>
            </div>
          </div>

          {/* Quick link to spreadsheet */}
          <button
            onClick={handleSheetClick}
            className="md:hidden flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium border border-blue-100 cursor-pointer"
            title="구글 시트 바로가기 (교사 인증 필요)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>시트</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Tab Switcher & Spreadsheet Link */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={handleSheetClick}
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200 cursor-pointer"
            title="구글 시트 바로가기 (교사 인증 필요)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>구글 시트 열기</span>
            <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 w-full md:w-auto">
            <button
              id="student-tab-btn"
              onClick={() => setActiveTab("student")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                activeTab === "student"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>학생용 입력</span>
            </button>
            <button
              id="teacher-tab-btn"
              onClick={() => setActiveTab("teacher")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                activeTab === "teacher"
                  ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>교사용 관리</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
