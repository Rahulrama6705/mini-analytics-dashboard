import { getSupabase } from "@/lib/supabase/server-client";
import type { TeacherOverviewRow } from "./types";

export async function getTeachersOverview(limit = 100): Promise<TeacherOverviewRow[]> {
  const { data, error } = await getSupabase().rpc("dashboard_teachers_overview", { result_limit: limit });
  if (error) throw error;
  return (
    data as {
      teacher_id: string;
      teacher_name: string | null;
      sessions_taught: number;
      learners_taught: number;
      avg_attendance_rate: number | null;
      lifetime_earnings: number | null;
    }[]
  ).map((r) => ({
    teacherId: r.teacher_id,
    teacherName: r.teacher_name ?? "(unnamed teacher)",
    sessionsTaught: Number(r.sessions_taught),
    learnersTaught: Number(r.learners_taught),
    avgAttendanceRate: Number(r.avg_attendance_rate ?? 0),
    lifetimeEarnings: Number(r.lifetime_earnings ?? 0),
  }));
}
