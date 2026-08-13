import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Edit3, Send, ShieldAlert } from "lucide-react";
import { StudentInput } from "../types";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  inputData: StudentInput;
  isSubmitting: boolean;
  isUpdate: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  inputData,
  isSubmitting,
  isUpdate,
}) => {
  const [showFullRrn, setShowFullRrn] = useState(false);

  if (!isOpen) return null;

  // Mask RRN for privacy check
  const maskedRrn = () => {
    if (!inputData.rrn) return "";
    const parts = inputData.rrn.split("-");
    if (parts.length === 2 && parts[1].length > 0) {
      return `${parts[0]}-${parts[1][0]}${"*".repeat(Math.max(0, parts[1].length - 1))}`;
    }
    return inputData.rrn;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">입력 정보 확인</h3>
              <p className="text-blue-100 text-xs mt-0.5">
                제출 전 입력하신 내용이 정확한지 확인해주세요.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-blue-900 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              {isUpdate
                ? "기존에 제출한 정보가 새 내용으로 수정됩니다."
                : "제출 버튼을 누르면 담당 교사의 구글 시트에 정보가 등록됩니다."}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3.5">
            {/* Grade/Class */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">학반</span>
              <span className="text-sm font-bold text-slate-900 bg-blue-100/70 text-blue-800 px-2.5 py-0.5 rounded-md">
                {inputData.gradeClass}
              </span>
            </div>

            {/* Name */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">학생 이름</span>
              <span className="text-sm font-bold text-slate-900">{inputData.studentName}</span>
            </div>

            {/* RRN */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">주민등록번호</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-slate-900">
                  {showFullRrn ? inputData.rrn : maskedRrn()}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFullRrn(!showFullRrn)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/60 transition-colors"
                  title={showFullRrn ? "가리기" : "번호 보기"}
                >
                  {showFullRrn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Student Phone */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">본인 휴대폰번호</span>
              <span className="text-sm font-bold text-slate-900">{inputData.phone}</span>
            </div>

            {/* Parent Phone */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">부모님(보호자) 연락처</span>
              <span className="text-sm font-bold text-slate-900">
                {inputData.parentPhone || "(미입력)"}
              </span>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1 pb-2.5 border-b border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500">기타 건의사항 및 참고사항</span>
              <span className="text-xs font-medium text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 min-h-[38px] whitespace-pre-wrap">
                {inputData.notes ? inputData.notes : "(작성한 건의사항 없음)"}
              </span>
            </div>

            {/* Student Password */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">설정한 본인 비밀번호</span>
              <span className="text-xs font-bold font-mono bg-amber-50 text-amber-800 px-2 py-1 rounded border border-amber-200">
                {"•".repeat(inputData.studentPassword?.length || 4)} (보호됨)
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>제출 후에도 언제든지 본인 학반/이름 검색으로 수정이 가능합니다.</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            id="modal-edit-btn"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <Edit3 className="w-4 h-4" />
            <span>다시 수정</span>
          </button>
          <button
            id="modal-confirm-submit-btn"
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>제출 중...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{isUpdate ? "수정 완료 제출" : "최종 제출하기"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
