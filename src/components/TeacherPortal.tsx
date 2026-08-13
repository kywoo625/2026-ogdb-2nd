import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Lock,
  Search,
  FileSpreadsheet,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  Key,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
  ExternalLink,
} from "lucide-react";
import { StudentRecord } from "../types";
import { GoogleSheetSyncModal } from "./GoogleSheetSyncModal";
import { EditStudentModal } from "./EditStudentModal";
import { PasswordChangeModal } from "./PasswordChangeModal";

interface TeacherPortalProps {
  spreadsheetUrl: string;
  spreadsheetId: string;
}

const PRESET_CLASSES = [
  "전체 학반",
  "2학년 1반", "2학년 2반", "2학년 3반", "2학년 4반", "2학년 5반",
  "2학년 6반", "2학년 7반", "2학년 8반", "2학년 9반", "2학년 10반",
  "1학년 1반", "1학년 2반", "1학년 3반", "3학년 1반", "3학년 2반"
];

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ spreadsheetUrl, spreadsheetId }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Data state
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState("전체 학반");
  const [searchQuery, setSearchQuery] = useState("");
  const [revealRrn, setRevealRrn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  // Manual Add Form State
  const [newGradeClass, setNewGradeClass] = useState("1학년 1반");
  const [newName, setNewName] = useState("");
  const [newRrn, setNewRrn] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Check cached session
  useEffect(() => {
    const sessionToken = sessionStorage.getItem("teacher_session");
    if (sessionToken) {
      setIsAuthenticated(true);
      fetchStudents();
    }
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch("/api/teacher/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("teacher_session", data.token || "true");
        fetchStudents();
      } else {
        setLoginError(data.message || "비밀번호가 올바르지 않습니다.");
      }
    } catch (err) {
      setLoginError("서버 접속 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("teacher_session");
    setIsAuthenticated(false);
    setPasswordInput("");
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesClass = selectedClass === "전체 학반" || s.gradeClass === selectedClass;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.studentName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.gradeClass.toLowerCase().includes(q);

      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery]);

  // Handle Delete
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`${name} 학생의 정보를 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.message || "삭제 실패");
      }
    } catch (err) {
      alert("삭제 요청 실패");
    }
  };

  // Handle Edit Save
  const handleSaveEditedStudent = async (updated: StudentRecord) => {
    try {
      const res = await fetch(`/api/students/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const data = await res.json();
      if (data.success) {
        setStudents((prev) => prev.map((s) => (s.id === updated.id ? data.student : s)));
      } else {
        alert(data.message || "수정 실패");
      }
    } catch (err) {
      alert("수정 중 오류 발생");
    }
  };

  // Handle Manual Add
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRrn.trim() || !newPhone.trim()) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/students/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeClass: newGradeClass,
          studentName: newName.trim(),
          rrn: newRrn.trim(),
          phone: newPhone.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddStudentOpen(false);
        setNewName("");
        setNewRrn("");
        setNewPhone("");
        fetchStudents();
      } else {
        alert(data.message || "등록 실패");
      }
    } catch (err) {
      alert("등록 요청 실패");
    }
  };

  // Export CSV (UTF-8 BOM for Excel)
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      alert("내보낼 학생 정보가 없습니다.");
      return;
    }

    const headers = ["학반", "학생 이름", "주민등록번호", "본인 휴대폰번호", "부모님(보호자) 연락처", "기타 건의사항 및 참고사항", "제출일시", "최종수정일시"];
    const rows = filteredStudents.map((s) => [
      `"${s.gradeClass || ""}"`,
      `"${s.studentName || ""}"`,
      `"${s.rrn || ""}"`,
      `"${s.phone || ""}"`,
      `"${s.parentPhone || ""}"`,
      `"${(s.notes || "").replace(/"/g, '""')}"`,
      `"${new Date(s.submittedAt).toLocaleString("ko-KR")}"`,
      `"${new Date(s.updatedAt || s.submittedAt).toLocaleString("ko-KR")}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `학생정보_${selectedClass.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mask RRN
  const formatRrnDisplay = (rrnStr: string) => {
    if (revealRrn) return rrnStr;
    if (!rrnStr) return "";
    const parts = rrnStr.split("-");
    if (parts.length === 2 && parts[1].length > 0) {
      return `${parts[0]}-${parts[1][0]}******`;
    }
    return rrnStr.slice(0, 7) + "******";
  };

  // Unauthenticated Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 mb-2">
              교사 전용 접속
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">담임교사 로그인</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              본인 학반 학생들의 제출 정보를 조회하려면 비밀번호를 입력해 주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">교사 비밀번호</label>
              <input
                type="password"
                placeholder="교사 전용 비밀번호 입력"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">💡 로그인 안내</p>
              <p>• 부여받으신 교사 비밀번호를 입력해주세요.</p>
              <p>• 로그인 후 상단 [비밀번호 변경] 메뉴에서 원하시는 비밀번호로 변경하실 수 있습니다.</p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>로그인 및 정보 열람</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="max-w-6xl mx-auto my-6 px-4 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-md font-bold border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 담임교사 시스템
            </span>
            <span className="text-slate-400 text-xs">| 실시간 수집 목록</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">학반별 학생 정보 관리 Dashboard</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            담임선생님 본인 반 학생들의 주민등록번호 및 연락처 정보를 안전하게 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>비밀번호 변경</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">선택 학반 제출 인원</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {filteredStudents.length} <span className="text-xs text-slate-400 font-normal">명</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">전체 학교 제출 총계</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {students.length} <span className="text-xs text-slate-400 font-normal">명</span>
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Filter className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">구글 시트 연동 상태</p>
            <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 실시간 동기화 지원
            </p>
          </div>
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>연동 설정</span>
          </button>
        </div>
      </div>

      {/* Main Filter & Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Class selector */}
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>담임 학반 선택:</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {PRESET_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            <span className="text-xs text-slate-400 font-medium">
              ({selectedClass} 정보 {filteredStudents.length}건 표시)
            </span>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="이름 또는 전화번호 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRevealRrn(!revealRrn)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              {revealRrn ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{revealRrn ? "주민번호 가리기" : "주민번호 원본 보기"}</span>
            </button>

            <button
              onClick={fetchStudents}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              <span>새로고침</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀/CSV 다운로드</span>
            </button>

            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>학생 정보 수동 추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Add Form Toggle Box */}
      {isAddStudentOpen && (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" /> 학생 정보 직접 추가
            </h3>
            <button
              onClick={() => setIsAddStudentOpen(false)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              닫기
            </button>
          </div>

          <form onSubmit={handleAddStudentSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">학반</label>
              <input
                type="text"
                value={newGradeClass}
                onChange={(e) => setNewGradeClass(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">학생 이름</label>
              <input
                type="text"
                placeholder="이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">주민번호</label>
              <input
                type="text"
                placeholder="000000-0000000"
                value={newRrn}
                onChange={(e) => setNewRrn(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">휴대폰번호</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shrink-0"
                >
                  등록
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Student Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[12px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-3">학반</th>
                <th className="py-3.5 px-3">학생 이름</th>
                <th className="py-3.5 px-3">주민등록번호</th>
                <th className="py-3.5 px-3">본인 연락처</th>
                <th className="py-3.5 px-3">부모님 연락처</th>
                <th className="py-3.5 px-3">기타 건의사항</th>
                <th className="py-3.5 px-3">제출/수정일시</th>
                <th className="py-3.5 px-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <p className="font-semibold text-sm">해당 학반에 등록된 학생 정보가 없습니다.</p>
                    <p className="text-xs mt-1">학생들이 제출하거나, 위 [학생 정보 수동 추가]로 직접 입력할 수 있습니다.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100 text-xs">
                        {student.gradeClass}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-800">{student.studentName}</td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-800">
                      {formatRrnDisplay(student.rrn)}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-800">{student.phone}</td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-600">
                      {student.parentPhone || "-"}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-600 max-w-[180px] truncate" title={student.notes || ""}>
                      {student.notes || "-"}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-500 font-mono">
                      {new Date(student.updatedAt || student.submittedAt).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="정보 수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.studentName)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        spreadsheetUrl={spreadsheetUrl}
        spreadsheetId={spreadsheetId}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={!!editingStudent}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={handleSaveEditedStudent}
      />

      {/* Change Password Modal */}
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
