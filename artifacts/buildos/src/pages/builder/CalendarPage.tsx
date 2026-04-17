import { BuilderLayout } from "@/components/layout/BuilderLayout";
import CalendarView from "@/components/calendar/CalendarView";

export default function CalendarPage() {
  return (
    <BuilderLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">All project events and deadlines across your organization</p>
        </div>
        <CalendarView />
      </div>
    </BuilderLayout>
  );
}
