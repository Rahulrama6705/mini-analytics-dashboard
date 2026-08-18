import { DailyClassesView } from "@/components/dashboard/daily-classes-view";
import { getTodaysSessions } from "@/lib/data-sources";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const sessions = await getTodaysSessions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Daily</h1>
        <p className="text-sm text-muted-foreground">
          Every class taught today, with teacher and enrollment at a glance. Click a class for the full roster.
        </p>
      </div>

      <DailyClassesView sessions={sessions} />
    </div>
  );
}
