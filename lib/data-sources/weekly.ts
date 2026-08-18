import { getSupabase } from "@/lib/supabase/server-client";
import type { PopularCourseRow, RequestedTeacherRow, EngagementRow, UnderbookedClassRow } from "./types";

// See lib/data-sources/overview.ts for why these call Postgres functions
// instead of joining/aggregating in JS.

export async function getPopularCoursesThisWeek(limit = 10): Promise<PopularCourseRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_popular_courses_this_week", { result_limit: limit });
  if (error) throw error;
  return (
    data as { class_id: string; title: string | null; session_count: number; enrollment_count: number }[]
  ).map((r) => ({
    classId: r.class_id,
    title: r.title ?? "(unnamed class)",
    sessionCount: Number(r.session_count),
    enrollmentCount: Number(r.enrollment_count),
  }));
}

export async function getRequestedTeachersThisWeek(limit = 10): Promise<RequestedTeacherRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_requested_teachers_this_week", { result_limit: limit });
  if (error) throw error;
  return (
    data as {
      teacher_id: string;
      teacher_name: string | null;
      saves_this_week: number;
      sessions_taught_lifetime: number | null;
      learners_taught_lifetime: number | null;
      avg_attendance_rate: number | null;
    }[]
  ).map((r) => ({
    teacherId: r.teacher_id,
    teacherName: r.teacher_name ?? "(unnamed teacher)",
    savesThisWeek: Number(r.saves_this_week),
    sessionsTaughtLifetime: Number(r.sessions_taught_lifetime ?? 0),
    learnersTaughtLifetime: Number(r.learners_taught_lifetime ?? 0),
    avgAttendanceRate: Number(r.avg_attendance_rate ?? 0),
  }));
}

export async function getLearnerEngagementThisWeek(limit = 25): Promise<EngagementRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_learner_engagement_this_week", { result_limit: limit });
  if (error) throw error;
  return (
    data as {
      learner_id: string;
      learner_name: string | null;
      total_seconds_this_week: number;
      sessions_attended_this_week: number;
      courses_completed_total: number;
      last_active_at: string | null;
    }[]
  ).map((r) => ({
    learnerId: r.learner_id,
    learnerName: r.learner_name ?? "(unnamed learner)",
    totalSecondsThisWeek: Number(r.total_seconds_this_week),
    sessionsAttendedThisWeek: Number(r.sessions_attended_this_week),
    coursesCompletedTotal: Number(r.courses_completed_total),
    lastActiveAt: r.last_active_at,
  }));
}

export async function getUnderbookedClasses(fillThreshold = 0.5, limit = 20): Promise<UnderbookedClassRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_underbooked_classes", {
    fill_threshold: fillThreshold,
    result_limit: limit,
  });
  if (error) throw error;
  return (
    data as {
      batch_id: string;
      class_title: string | null;
      teacher_name: string | null;
      size_enrolled: number;
      size_max: number;
      fill_rate: number;
    }[]
  ).map((r) => ({
    batchId: r.batch_id,
    classTitle: r.class_title ?? "(unnamed class)",
    teacherName: r.teacher_name ?? "(unassigned teacher)",
    sizeEnrolled: Number(r.size_enrolled),
    sizeMax: Number(r.size_max),
    fillRate: Number(r.fill_rate),
  }));
}
