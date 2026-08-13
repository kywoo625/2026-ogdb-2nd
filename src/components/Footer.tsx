import React from "react";
import { ShieldCheck, FileSpreadsheet, Lock } from "lucide-react";

interface FooterProps {
  spreadsheetUrl: string;
  onOpenGoogleSheet?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ spreadsheetUrl, onOpenGoogleSheet }) => {
  const handleSheetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenGoogleSheet) {
      onOpenGoogleSheet();
    } else {
      window.open(spreadsheetUrl, "_blank");
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200 mt-12 py-8 text-slate-500 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <p className="font-bold text-slate-700 text-sm flex items-center justify-center md:justify-start gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            학생 정보 수집 및 구글 시트 자동 연동 시스템
          </p>
          <p className="text-slate-400">
            입력된 개인정보(주민등록번호, 휴대폰번호)는 암호화 보호를 통해 담당 선생님만 안전하게 조회 및 다운로드 가능합니다.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={handleSheetClick}
            className="flex items-center gap-1.5 text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>구글 시트 바로가기</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
