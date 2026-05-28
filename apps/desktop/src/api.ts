import { invoke } from "@tauri-apps/api/core";
import type {
  CaptureStatus,
  DrillCard,
  ErrorProfile,
  SessionSummary,
  TypingRun,
  TypingStats,
} from "./types";

export const api = {
  getOnboardingComplete: () =>
    invoke<boolean>("get_onboarding_complete"),
  setOnboardingComplete: () => invoke<void>("set_onboarding_complete"),
  startCapture: () => invoke<CaptureStatus>("start_capture"),
  stopCapture: () => invoke<CaptureStatus>("stop_capture"),
  togglePause: () => invoke<CaptureStatus>("toggle_pause_capture"),
  getCaptureStatus: () => invoke<CaptureStatus>("get_capture_status"),
  getErrorProfile: () => invoke<ErrorProfile>("get_error_profile"),
  getSessions: () => invoke<SessionSummary[]>("get_sessions"),
  getBlocklist: () => invoke<string[]>("get_blocklist"),
  addBlocklist: (pattern: string) =>
    invoke<void>("add_blocklist_pattern", { pattern }),
  removeBlocklist: (pattern: string) =>
    invoke<void>("remove_blocklist_pattern", { pattern }),
  exportData: () => invoke<string>("export_data"),
  deleteAllData: () => invoke<void>("delete_all_data"),
  recordTyping: (run: TypingRun) =>
    invoke<TypingStats>("record_typing", { run }),
  getDueDrills: () => invoke<DrillCard[]>("get_due_drills"),
  saveDrillCards: (cards: DrillCard[]) =>
    invoke<void>("save_drill_cards", { cards }),
  getEventCount: () => invoke<number>("get_event_count"),
};
