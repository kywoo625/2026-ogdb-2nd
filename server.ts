import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

interface StudentRecord {
  id: string;
  gradeClass: string;
  studentName: string;
  rrn: string;
  phone: string;
  parentPhone?: string;
  notes?: string;
  studentPassword?: string;
  submittedAt: string;
  updatedAt: string;
  syncedToSheet?: boolean;
}

interface DBData {
  teacherPassword: string;
  webhookUrl: string;
  spreadsheetUrl: string;
  spreadsheetId: string;
  students: StudentRecord[];
  lastSyncedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const DEFAULT_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/188uRW5c5hB3PVAC50EP_yxwG_cT59TsC/edit?usp=sharing";
const DEFAULT_SPREADSHEET_ID = "188uRW5c5hB3PVAC50EP_yxwG_cT59TsC";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB state
function loadDB(): DBData {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DBData = {
      teacherPassword: "0903",
      webhookUrl: "",
      spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      students: [
        {
          id: "std-sample-1",
          gradeClass: "2학년 1반",
          studentName: "김민준",
          rrn: "080315-3123456",
          phone: "010-1234-5678",
          parentPhone: "010-8765-4321",
          notes: "체육 활동 시 호흡기 질환 유의 요청",
          studentPassword: "1234",
          submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          syncedToSheet: false,
        },
        {
          id: "std-sample-2",
          gradeClass: "2학년 1반",
          studentName: "이서연",
          rrn: "080722-4234567",
          phone: "010-9876-5432",
          parentPhone: "010-7654-3210",
          notes: "",
          studentPassword: "1234",
          submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          syncedToSheet: false,
        },
        {
          id: "std-sample-3",
          gradeClass: "2학년 2반",
          studentName: "박도윤",
          rrn: "081105-3345678",
          phone: "010-5555-7777",
          parentPhone: "010-3333-2222",
          notes: "동아리 활동 연극부 희망",
          studentPassword: "1234",
          submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          syncedToSheet: false,
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.teacherPassword) parsed.teacherPassword = "0903";
    if (!parsed.spreadsheetUrl) parsed.spreadsheetUrl = DEFAULT_SPREADSHEET_URL;
    if (!parsed.spreadsheetId) parsed.spreadsheetId = DEFAULT_SPREADSHEET_ID;
    if (!Array.isArray(parsed.students)) parsed.students = [];
    return parsed;
  } catch (err) {
    console.error("Error reading db.json, returning default", err);
    return {
      teacherPassword: "0903",
      webhookUrl: "",
      spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
      spreadsheetId: DEFAULT_SPREADSHEET_ID,
      students: []
    };
  }
}

function saveDB(data: DBData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving db.json", err);
  }
}

// Trigger optional webhook sync to Google Apps Script
async function triggerWebhookSync(db: DBData, records: StudentRecord[]) {
  if (!db.webhookUrl || db.webhookUrl.trim() === "") {
    return { success: false, message: "구글 시트 Webhook URL이 설정되지 않았습니다." };
  }

  try {
    const response = await fetch(db.webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SYNC_STUDENTS",
        spreadsheetId: db.spreadsheetId,
        records: records,
        timestamp: new Date().toISOString()
      }),
    });

    if (response.ok) {
      // Mark as synced
      const recordIds = new Set(records.map(r => r.id));
      db.students = db.students.map(s => recordIds.has(s.id) ? { ...s, syncedToSheet: true } : s);
      db.lastSyncedAt = new Date().toISOString();
      saveDB(db);
      return { success: true, message: "구글 시트로 성공적으로 동기화되었습니다." };
    } else {
      const text = await response.text().catch(() => "");
      return { success: false, message: `웹훅 응답 오류 (${response.status}): ${text}` };
    }
  } catch (err: any) {
    console.error("Webhook sync error:", err);
    return { success: false, message: `동기화 실패: ${err?.message || "네트워크 오류"}` };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Verify teacher password
  app.post("/api/teacher/verify", (req: Request, res: Response) => {
    const { password } = req.body;
    const db = loadDB();
    if (password === db.teacherPassword) {
      res.json({ success: true, token: "teacher-authenticated-session" });
    } else {
      res.status(401).json({ success: false, message: "비밀번호가 올바르지 않습니다." });
    }
  });

  // Change teacher password
  app.post("/api/teacher/change-password", (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const db = loadDB();
    if (currentPassword !== db.teacherPassword) {
      return res.status(401).json({ success: false, message: "현재 비밀번호가 일치하지 않습니다." });
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: "새 비밀번호는 최소 4자리 이상이어야 합니다." });
    }

    db.teacherPassword = newPassword.trim();
    saveDB(db);
    res.json({ success: true, message: "비밀번호가 성공적으로 변경되었습니다." });
  });

  // Get all students (Teacher or filtered)
  app.get("/api/students", (req: Request, res: Response) => {
    const db = loadDB();
    const gradeClass = req.query.gradeClass as string | undefined;

    let results = db.students;
    if (gradeClass && gradeClass !== "전체") {
      results = results.filter(s => s.gradeClass === gradeClass);
    }

    // Sort by submittedAt descending
    results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    res.json({
      success: true,
      students: results,
      stats: {
        totalSubmissions: db.students.length,
        syncedCount: db.students.filter(s => s.syncedToSheet).length,
        lastSyncedAt: db.lastSyncedAt
      }
    });
  });

  // Student search for existing submission to modify
  app.post("/api/students/lookup", (req: Request, res: Response) => {
    const { gradeClass, studentName, studentPassword } = req.body;
    if (!gradeClass || !studentName) {
      return res.status(400).json({ success: false, message: "학반과 이름을 입력해주세요." });
    }

    const db = loadDB();
    const target = db.students.find(
      s => s.gradeClass.trim() === gradeClass.trim() && s.studentName.trim() === studentName.trim()
    );

    if (!target) {
      return res.json({ success: true, found: false, message: "해당 학반과 이름으로 제출된 기존 정보가 없습니다." });
    }

    // Verify password if target has a set password
    if (target.studentPassword && target.studentPassword.trim() !== "") {
      if (!studentPassword || studentPassword.trim() !== target.studentPassword.trim()) {
        return res.json({
          success: false,
          found: true,
          message: "설정하신 본인 비밀번호가 일치하지 않습니다. 비밀번호를 다시 확인해주세요."
        });
      }
    }

    res.json({ success: true, found: true, student: target });
  });

  // Submit student info (New or Update)
  app.post("/api/students/submit", async (req: Request, res: Response) => {
    const { gradeClass, studentName, rrn, phone, parentPhone, notes, studentPassword, existingId } = req.body;

    if (!gradeClass || !studentName || !rrn || !phone || !studentPassword) {
      return res.status(400).json({ success: false, message: "필수 항목(학반, 이름, 주민번호, 휴대폰번호, 본인 설정 비밀번호)을 모두 입력해주세요." });
    }

    const db = loadDB();
    const now = new Date().toISOString();

    let targetIndex = -1;
    if (existingId) {
      targetIndex = db.students.findIndex(s => s.id === existingId);
    } else {
      // Check if student with same gradeClass & studentName already exists to update
      targetIndex = db.students.findIndex(
        s => s.gradeClass.trim() === gradeClass.trim() && s.studentName.trim() === studentName.trim()
      );
    }

    if (targetIndex >= 0) {
      const existing = db.students[targetIndex];
      // Verify password
      if (existing.studentPassword && existing.studentPassword.trim() !== "" && existing.studentPassword.trim() !== studentPassword.trim()) {
        return res.status(401).json({
          success: false,
          message: "기존 제출 정보에 설정된 본인 비밀번호가 일치하지 않습니다."
        });
      }
    }

    let record: StudentRecord;
    let isUpdate = false;

    if (targetIndex >= 0) {
      // Update existing
      isUpdate = true;
      record = {
        ...db.students[targetIndex],
        gradeClass: gradeClass.trim(),
        studentName: studentName.trim(),
        rrn: rrn.trim(),
        phone: phone.trim(),
        parentPhone: parentPhone ? parentPhone.trim() : "",
        notes: notes ? notes.trim() : "",
        studentPassword: studentPassword.trim(),
        updatedAt: now,
        syncedToSheet: false
      };
      db.students[targetIndex] = record;
    } else {
      // Create new
      record = {
        id: `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        gradeClass: gradeClass.trim(),
        studentName: studentName.trim(),
        rrn: rrn.trim(),
        phone: phone.trim(),
        parentPhone: parentPhone ? parentPhone.trim() : "",
        notes: notes ? notes.trim() : "",
        studentPassword: studentPassword.trim(),
        submittedAt: now,
        updatedAt: now,
        syncedToSheet: false
      };
      db.students.push(record);
    }

    saveDB(db);

    // Auto sync to webhook if configured
    if (db.webhookUrl && db.webhookUrl.trim() !== "") {
      triggerWebhookSync(db, [record]).catch(err => console.error("Auto sync error:", err));
    }

    res.json({
      success: true,
      isUpdate,
      record,
      message: isUpdate ? "기존 정보가 성공적으로 수정되었습니다!" : "정보가 성공적으로 제출되었습니다!"
    });
  });

  // Update specific student (Teacher edit)
  app.put("/api/students/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { gradeClass, studentName, rrn, phone, parentPhone, notes, studentPassword } = req.body;

    const db = loadDB();
    const index = db.students.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "해당 학생 정보가 존재하지 않습니다." });
    }

    const updated: StudentRecord = {
      ...db.students[index],
      gradeClass: gradeClass || db.students[index].gradeClass,
      studentName: studentName || db.students[index].studentName,
      rrn: rrn || db.students[index].rrn,
      phone: phone || db.students[index].phone,
      parentPhone: parentPhone !== undefined ? parentPhone : db.students[index].parentPhone,
      notes: notes !== undefined ? notes : db.students[index].notes,
      studentPassword: studentPassword || db.students[index].studentPassword,
      updatedAt: new Date().toISOString(),
      syncedToSheet: false
    };

    db.students[index] = updated;
    saveDB(db);

    res.json({ success: true, student: updated, message: "학생 정보가 수정되었습니다." });
  });

  // Delete student record (Teacher delete)
  app.delete("/api/students/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const db = loadDB();
    const initialLen = db.students.length;
    db.students = db.students.filter(s => s.id !== id);

    if (db.students.length === initialLen) {
      return res.status(404).json({ success: false, message: "삭제할 학생 정보를 찾을 수 없습니다." });
    }

    saveDB(db);
    res.json({ success: true, message: "학생 정보가 삭제되었습니다." });
  });

  // Get Sync Config
  app.get("/api/sync/config", (_req: Request, res: Response) => {
    const db = loadDB();
    res.json({
      success: true,
      spreadsheetUrl: db.spreadsheetUrl,
      spreadsheetId: db.spreadsheetId,
      webhookUrl: db.webhookUrl,
      lastSyncedAt: db.lastSyncedAt
    });
  });

  // Save Sync Config
  app.post("/api/sync/config", (req: Request, res: Response) => {
    const { webhookUrl, spreadsheetUrl, spreadsheetId } = req.body;
    const db = loadDB();

    if (webhookUrl !== undefined) db.webhookUrl = webhookUrl.trim();
    if (spreadsheetUrl) db.spreadsheetUrl = spreadsheetUrl.trim();
    if (spreadsheetId) db.spreadsheetId = spreadsheetId.trim();

    saveDB(db);
    res.json({ success: true, message: "구글 시트 연동 설정이 저장되었습니다." });
  });

  // Trigger manual bulk sync to Google Sheet
  app.post("/api/sync/trigger", async (_req: Request, res: Response) => {
    const db = loadDB();
    if (!db.webhookUrl || db.webhookUrl.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Google Apps Script Webhook URL을 설정해야 연동이 가능합니다. '연동 설정' 안내를 참고해 주세요."
      });
    }

    const result = await triggerWebhookSync(db, db.students);
    res.json(result);
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[학생 정보 수집 App] Server running on http://localhost:${PORT}`);
  });
}

startServer();
