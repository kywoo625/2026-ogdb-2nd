export interface StudentRecord {
  id: string;
  gradeClass: string; // e.g. "2학년 1반"
  studentName: string; // e.g. "홍길동"
  rrn: string; // 주민등록번호 e.g. "050123-3456789"
  phone: string; // 본인 휴대폰번호 e.g. "010-1234-5678"
  parentPhone?: string; // 비상시 연락가능한 부모님 연락처 e.g. "010-9876-5432"
  notes?: string; // 기타 건의사항 및 자유 메모
  studentPassword?: string; // 학생 설정 비밀번호
  submittedAt: string; // ISO string
  updatedAt: string; // ISO string
  syncedToSheet?: boolean;
}

export interface StudentInput {
  gradeClass: string;
  studentName: string;
  rrn: string;
  phone: string;
  parentPhone?: string;
  notes?: string;
  studentPassword?: string;
}

export interface SheetSyncConfig {
  spreadsheetUrl: string;
  spreadsheetId: string;
  webhookUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface TeacherAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
}

export interface AppStats {
  totalSubmissions: number;
  classCounts: Record<string, number>;
  lastSubmissionAt?: string;
  syncedCount: number;
}
