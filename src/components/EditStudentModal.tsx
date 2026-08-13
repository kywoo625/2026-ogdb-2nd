import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { StudentRecord as IStudentRecord } from "../types";

interface EditStudentModalProps {
  isOpen: boolean;
  student: IStudentRecord | null;
  onClose: () => void;
  onSave: (updated: IStudentRecord) => Promise<void>;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onSave,
}) => {
  const [gradeClass, setGradeClass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [rrn, setRrn] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setGradeClass(student.gradeClass || "");
      setStudentName(student.studentName || "");
      setRrn(student.rrn || "");
      setPhone(student.phone || "");
      setParentPhone(student.parentPhone || "");
      setNotes(student.notes || "");
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeClass || !studentName || !rrn || !phone) {
      alert("학반, 이름, 주민번호, 본인 휴대폰번호를 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...student,
        gradeClass: gradeClass.trim(),
        studentName: studentName.trim(),
        rrn: rrn.trim(),
        phone: phone.trim(),
        parentPhone: parentPhone.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert("저장 실패");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-base">학생 정보 수정</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs sm:text-sm max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block font-bold text-slate-700 mb-1">학반</label>
            <input
              type="text"
              value={gradeClass}
              onChange={(e) => setGradeClass(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">학생 이름</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">주민등록번호</label>
            <input
              type="text"
              value={rrn}
              onChange={(e) => setRrn(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">본인 휴대폰번호</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">부모님(보호자) 연락처</label>
            <input
              type="text"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">기타 건의사항 및 참고사항</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "저장 중..." : "저장하기"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
