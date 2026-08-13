import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StudentForm } from "./components/StudentForm";
import { TeacherPortal } from "./components/TeacherPortal";
import { Footer } from "./components/Footer";
import { GoogleSheetAuthModal } from "./components/GoogleSheetAuthModal";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/188uRW5c5hB3PVAC50EP_yxwG_cT59TsC/edit?usp=sharing";
const SPREADSHEET_ID = "188uRW5c5hB3PVAC50EP_yxwG_cT59TsC";

export default function App() {
  const [activeTab, setActiveTab] = useState<"student" | "teacher">("student");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(SPREADSHEET_URL);
  const [spreadsheetId, setSpreadsheetId] = useState(SPREADSHEET_ID);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sync/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.spreadsheetUrl) setSpreadsheetUrl(data.spreadsheetUrl);
          if (data.spreadsheetId) setSpreadsheetId(data.spreadsheetId);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenGoogleSheet = () => {
    const isTeacherSession = sessionStorage.getItem("teacher_session");
    if (isTeacherSession) {
      window.open(spreadsheetUrl, "_blank");
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        spreadsheetUrl={spreadsheetUrl}
        onOpenGoogleSheet={handleOpenGoogleSheet}
      />

      <main className="flex-1 pb-12">
        {activeTab === "student" ? (
          <StudentForm
            spreadsheetUrl={spreadsheetUrl}
            onSubmissionComplete={() => {
              // Can switch or update
            }}
          />
        ) : (
          <TeacherPortal
            spreadsheetUrl={spreadsheetUrl}
            spreadsheetId={spreadsheetId}
          />
        )}
      </main>

      <Footer
        spreadsheetUrl={spreadsheetUrl}
        onOpenGoogleSheet={handleOpenGoogleSheet}
      />

      <GoogleSheetAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        spreadsheetUrl={spreadsheetUrl}
      />
    </div>
  );
}
