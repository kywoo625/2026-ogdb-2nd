import React, { useState } from "react";
import { User, CreditCard, Phone, School, CheckCircle, Search, RefreshCw, AlertCircle, Sparkles, Edit3, KeyRound, MessageSquare, HeartHandshake } from "lucide-react";
import { StudentRecord } from "../types";
import { ConfirmModal } from "./ConfirmModal";

interface StudentFormProps {
  onSubmissionComplete?: () => void;
  spreadsheetUrl: string;
}

const PRESET_CLASSES = [
  "2학년 1반", "2학년 2반", "2학년 3반", "2학년 4반", "2학년 5반",
  "2학년 6반", "2학년 7반", "2학년 8반", "2학년 9반", "2학년 10반"
];

export const StudentForm: React.FC<StudentFormProps> = ({ onSubmissionComplete, spreadsheetUrl }) => {
  // Main form state
  const [gradeClass, setGradeClass] = useState("2학년 1반");
  const [customClass, setCustomClass] = useState("");
  const [isCustomClassMode, setIsCustomClassMode] = useState(false);
  const [studentNumber, setStudentNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [rrnFront, setRrnFront] = useState(""); // 6 digits
  const [rrnBack, setRrnBack] = useState("");   // 7 digits
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  // Search/Edit mode state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchGradeClass, setSearchGradeClass] = useState("2학년 1반");
  const [searchName, setSearchName] = useState("");
  const [searchPassword, setSearchPassword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  // Flow & Modal state
  const [existingId, setExistingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedRecord, setSubmittedRecord] = useState<StudentRecord | null>(null);

  // Format RRN input
  const handleRrnFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setRrnFront(val);
    if (val.length === 6) {
      document.getElementById("rrn-back-input")?.focus();
    }
  };

  const handleRrnBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 7);
    setRrnBack(val);
  };

  // Format phone number automatically (010-XXXX-XXXX)
  const formatPhone = (val: string) => {
    let raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length > 3 && raw.length <= 7) {
      return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    } else if (raw.length > 7) {
      return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
    }
    return raw;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleParentPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParentPhone(formatPhone(e.target.value));
  };

  const finalGradeClass = isCustomClassMode ? customClass.trim() : gradeClass;
  const fullRrn = `${rrnFront}-${rrnBack}`;

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!finalGradeClass) {
      newErrors.gradeClass = "학반을 선택하거나 입력해주세요.";
    }
    if (!studentName.trim()) {
      newErrors.studentName = "학생 이름을 입력해주세요.";
    }
    if (rrnFront.length !== 6 || rrnBack.length !== 7) {
      newErrors.rrn = "주민등록번호 13자리를 정확히 입력해주세요.";
    }
    if (phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "올바른 본인 휴대폰번호를 입력해주세요.";
    }
    if (!studentPassword.trim() || studentPassword.trim().length < 4) {
      newErrors.studentPassword = "정보 수정 시 사용할 비밀번호를 4자리 이상 설정해주세요.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clicked "입력 정보 확인" button
  const handleVerifyClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsConfirmOpen(true);
    }
  };

  // Perform submission
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/students/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeClass: finalGradeClass,
          studentNumber: studentNumber.trim(),
          studentName: studentName.trim(),
          rrn: fullRrn,
          phone: phone.trim(),
          parentPhone: parentPhone.trim(),
          notes: notes.trim(),
          studentPassword: studentPassword.trim(),
          existingId: existingId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmittedRecord(data.record);
        setIsConfirmOpen(false);
        if (onSubmissionComplete) onSubmissionComplete();
      } else {
        alert(data.message || "제출 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("서버 연결에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search existing record to modify
  const handleSearchExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) {
      setSearchMessage("학생 이름을 입력해주세요.");
      return;
    }
    if (!searchPassword.trim()) {
      setSearchMessage("처음 제출 시 설정하신 비밀번호를 입력해주세요.");
      return;
    }

    setSearchLoading(true);
    setSearchMessage(null);

    try {
      const res = await fetch("/api/students/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeClass: searchGradeClass,
          studentName: searchName.trim(),
          studentPassword: searchPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.found && data.student) {
        const std: StudentRecord = data.student;
        setExistingId(std.id);
        setGradeClass(std.gradeClass);
        setIsCustomClassMode(!PRESET_CLASSES.includes(std.gradeClass));
        if (!PRESET_CLASSES.includes(std.gradeClass)) setCustomClass(std.gradeClass);
        setStudentNumber(std.studentNumber || "");
        setStudentName(std.studentName);

        // Split RRN
        if (std.rrn.includes("-")) {
          const parts = std.rrn.split("-");
          setRrnFront(parts[0] || "");
          setRrnBack(parts[1] || "");
        } else {
          setRrnFront(std.rrn.slice(0, 6));
          setRrnBack(std.rrn.slice(6));
        }

        setPhone(std.phone || "");
        setParentPhone(std.parentPhone || "");
        setNotes(std.notes || "");
        setStudentPassword(std.studentPassword || searchPassword.trim());

        setIsSearchMode(false);
        setSearchMessage(null);
      } else {
        setSearchMessage(data.message || "입력하신 학반, 이름, 비밀번호에 해당하는 제출 기록이 없습니다.");
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setSearchMessage("조회 중 오류가 발생했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Reset form to submit new
  const handleResetForm = () => {
    setSubmittedRecord(null);
    setExistingId(null);
    setStudentNumber("");
    setStudentName("");
    setRrnFront("");
    setRrnBack("");
    setPhone("");
    setParentPhone("");
    setNotes("");
    setStudentPassword("");
    setSearchPassword("");
    setErrors({});
  };

  // Render Completion Success Screen
  if (submittedRecord) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-3xl shadow-xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
            제출 완료
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {existingId ? "정보 수정이 완료되었습니다!" : "정보 제출이 완료되었습니다!"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            입력하신 정보가 구글 시트와 시스템 DB에 안전하게 등록되었습니다.
          </p>
        </div>

        {/* Receipt Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500">신청 학반 / 이름</span>
            <span className="text-sm font-bold text-slate-900">
              {submittedRecord.gradeClass} {submittedRecord.studentName}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500">휴대폰번호</span>
            <span className="text-sm font-medium text-slate-800">{submittedRecord.phone}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <span className="text-xs font-semibold text-slate-500">제출일시</span>
            <span className="text-xs text-slate-600 font-mono">
              {new Date(submittedRecord.updatedAt || submittedRecord.submittedAt).toLocaleString("ko-KR")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">구글 시트 연동</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 연동 접수됨
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleResetForm}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>새 정보 입력하기</span>
          </button>
          <button
            onClick={() => {
              setSubmittedRecord(null);
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            <span>다시 수정하기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-6 px-4">
      {/* Top Banner & Toggle search mode */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 rounded-3xl shadow-xl mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold backdrop-blur-xs flex items-center gap-1">
              <School className="w-3.5 h-3.5" /> 학생 전용 입력 창
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSearchMode(!isSearchMode);
                setSearchMessage(null);
              }}
              className="text-xs bg-white text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearchMode ? "새로 작성하기" : "이전 제출 정보 조회/수정"}</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
            {existingId
              ? "기존 제출 정보를 수정하고 있습니다"
              : isSearchMode
              ? "이전에 제출한 정보 찾기"
              : "학생 인적사항 입력"}
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">
            {isSearchMode
              ? "본인의 학반과 이름을 입력하여 수정할 기존 제출 내역을 가져옵니다."
              : "정확한 주민등록번호와 연락처를 입력해주시기 바랍니다."}
          </p>
        </div>
      </div>

      {/* Existing Submission Lookup Form */}
      {isSearchMode ? (
        <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-md mb-6 space-y-4 animate-in fade-in duration-200">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <span>제출 내역 검색 및 수정 요청</span>
          </h3>

          <form onSubmit={handleSearchExisting} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">학반 선택</label>
                <select
                  value={searchGradeClass}
                  onChange={(e) => setSearchGradeClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {PRESET_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">학생 이름</label>
                <input
                  type="text"
                  placeholder="예: 홍길동"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">설정한 비밀번호</label>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={searchPassword}
                  onChange={(e) => setSearchPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {searchMessage && (
              <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{searchMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={searchLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {searchLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>검색 중...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>내 정보 조회하기</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : null}

      {/* Main Student Entry Form */}
      <form onSubmit={handleVerifyClick} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {existingId && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold">기존에 제출한 기록을 수정하는 모드입니다.</span>
            </div>
            <button
              type="button"
              onClick={handleResetForm}
              className="text-amber-800 underline hover:text-amber-950 font-semibold"
            >
              신규 등록으로 변경
            </button>
          </div>
        )}

        {/* 1. Grade/Class Section */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600" />
            <span>1. 학반 선택</span>
          </label>

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESET_CLASSES.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    setGradeClass(cls);
                    setIsCustomClassMode(false);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    !isCustomClassMode && gradeClass === cls
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>

            {/* Custom Class toggle option */}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCustomClassMode(!isCustomClassMode)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
              >
                {isCustomClassMode ? "목록에서 선택하기" : "직접 학반 입력하기"}
              </button>
            </div>

            {isCustomClassMode && (
              <input
                type="text"
                placeholder="예: 2학년 11반"
                value={customClass}
                onChange={(e) => setCustomClass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>
          {errors.gradeClass && <p className="text-red-500 text-xs mt-1 font-medium">{errors.gradeClass}</p>}
        </div>

        {/* 2. Student Number Section */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>2. 번호</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">숫자만 입력 (예: 1번, 15번)</span>
          </label>
          <input
            type="text"
            placeholder="출석번호 입력 (예: 1번, 15번 등)"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>

        {/* 3. Name Section */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span>3. 학생 이름</span>
          </label>
          <input
            type="text"
            placeholder="성함을 입력해주세요 (예: 홍길동)"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
          {errors.studentName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.studentName}</p>}
        </div>

        {/* 4. Resident Registration Number (RRN) */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>4. 주민등록번호</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">하이픈(-) 자동입력</span>
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="앞 6자리 (YYMMDD)"
              value={rrnFront}
              onChange={handleRrnFrontChange}
              className="w-full text-center tracking-widest px-3 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-slate-400 font-bold text-lg">-</span>
            <input
              id="rrn-back-input"
              type="password"
              inputMode="numeric"
              placeholder="뒤 7자리"
              value={rrnBack}
              onChange={handleRrnBackChange}
              className="w-full text-center tracking-widest px-3 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          {errors.rrn && <p className="text-red-500 text-xs mt-1 font-medium">{errors.rrn}</p>}
        </div>

        {/* 5. Phone Number */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>5. 본인 휴대폰번호</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">숫자만 입력</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="010-0000-0000"
            value={phone}
            onChange={handlePhoneChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</p>}
        </div>

        {/* 6. Emergency Parent Phone Number */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-rose-500" />
              <span>6. 비상시 연락가능한 부모님(보호자) 연락처</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">선택/추천</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="010-0000-0000 (부모님 또는 보호자 번호)"
            value={parentPhone}
            onChange={handleParentPhoneChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold tracking-wider focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* 7. Notes / Suggestions */}
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>7. 기타 건의사항 및 참고사항 (자유롭게 입력)</span>
          </label>
          <textarea
            rows={3}
            placeholder="선생님께 전달하고 싶은 말씀, 건강상의 유의사항, 동아리/진로 건의사항 등을 자유롭게 적어주세요."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
        </div>

        {/* 8. Student Personal Password Setting */}
        <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-2">
          <label className="block text-sm font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-700" />
              <span>8. 정보 보호용 본인 비밀번호 설정 (필수)</span>
            </span>
            <span className="text-xs text-amber-800 font-semibold">숫자 또는 문자 4자리 이상</span>
          </label>
          <p className="text-xs text-slate-600">
            추후 본인이 입력한 정보나 건의사항을 수정하고자 할 때 본인 확인용으로 사용됩니다.
          </p>
          <input
            type="password"
            placeholder="비밀번호 설정 (예: 1234)"
            value={studentPassword}
            onChange={(e) => setStudentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-amber-300 bg-white text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          {errors.studentPassword && <p className="text-red-500 text-xs font-medium">{errors.studentPassword}</p>}
        </div>

        {/* Submit Verification Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base rounded-2xl shadow-lg shadow-blue-600/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>입력 정보 확인 및 제출하기</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalSubmit}
        inputData={{
          gradeClass: finalGradeClass,
          studentNumber: studentNumber.trim(),
          studentName: studentName.trim(),
          rrn: fullRrn,
          phone: phone.trim(),
          parentPhone: parentPhone.trim(),
          notes: notes.trim(),
          studentPassword: studentPassword.trim(),
        }}
        isSubmitting={isSubmitting}
        isUpdate={!!existingId}
      />
    </div>
  );
};
