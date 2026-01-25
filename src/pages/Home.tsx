import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings, Bell, ChevronRight, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useReminders, useUpdateReminder, Reminder } from "@/hooks/useReminders";
import { EditReminderDialog } from "@/components/reminders/EditReminderDialog";
import { useCallHistory } from "@/hooks/useCallHistory";
import { format } from "date-fns";
import { generateMessageSummary } from "@/lib/summaryUtils";

type Tab = "active" | "upcoming";

const Home = () => {
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const { data: reminders = [], isLoading } = useReminders();
  const { data: inProgressCalls = [] } = useCallHistory("in_progress");
  const updateReminder = useUpdateReminder();
  
  // Get reminder IDs that have in-progress calls
  const inProgressReminderIds = new Set(
    inProgressCalls
      .filter(call => call.reminder_id)
      .map(call => call.reminder_id)
  );

  const toggleReminder = (e: React.MouseEvent, id: string, isActive: boolean) => {
    e.stopPropagation(); // Prevent card click when toggling switch
    updateReminder.mutate({ id, is_active: !isActive });
  };

  const handleCardClick = (reminder: Reminder) => {
    setEditingReminder(reminder);
  };

  // Include reminders that are active OR have an in-progress call
  const activeReminders = reminders.filter((r) => r.is_active || inProgressReminderIds.has(r.id));
  const upcomingReminders = reminders.filter((r) => r.frequency === "once" && new Date(r.scheduled_at) > new Date());

  const displayReminders = activeTab === "active" ? activeReminders : upcomingReminders;
  
  // Helper to check if a reminder has an in-progress call
  const isCallInProgress = (reminderId: string) => inProgressReminderIds.has(reminderId);

  const formatSchedule = (reminder: typeof reminders[0]) => {
    const date = new Date(reminder.scheduled_at);
    const timeStr = format(date, "h:mm a");
    const freqStr = reminder.frequency.charAt(0).toUpperCase() + reminder.frequency.slice(1);
    return `${timeStr} • ${freqStr}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Reminders"
        leftElement={
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">Y</span>
          </div>
        }
        rightElement={
          <Link to="/profile" className="p-1 hover:bg-secondary rounded-full transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Link>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-colors",
              activeTab === "active"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-colors",
              activeTab === "upcoming"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            Upcoming
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayReminders.length > 0 ? (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {activeTab === "active" ? "Daily Calls" : "Scheduled"}
              </p>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {displayReminders.length} Call{displayReminders.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Reminder list */}
            <div className="space-y-3">
              {displayReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  onClick={() => handleCardClick(reminder)}
                  className="bg-card rounded-lg p-4 card-shadow border border-border flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  {/* Avatar with in-progress indicator */}
                  <div className="relative">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      isCallInProgress(reminder.id) 
                        ? "bg-gradient-to-br from-green-500/20 to-green-400/10" 
                        : "bg-gradient-to-br from-primary/20 to-primary/10"
                    )}>
                      {isCallInProgress(reminder.id) ? (
                        <Phone className="w-5 h-5 text-green-500 animate-pulse" />
                      ) : (
                        <span className="text-primary font-semibold">
                          {reminder.recipient_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    {isCallInProgress(reminder.id) && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {reminder.recipient_name}
                      </p>
                      <span className="text-xs text-muted-foreground/70 truncate">
                        {generateMessageSummary(reminder.message)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isCallInProgress(reminder.id) ? (
                        <span className="text-green-500 font-medium">Call in progress...</span>
                      ) : (
                        formatSchedule(reminder)
                      )}
                    </p>
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={reminder.is_active}
                    onCheckedChange={() => {}}
                    onClick={(e) => toggleReminder(e, reminder.id, reminder.is_active)}
                    disabled={updateReminder.isPending}
                  />

                  {/* Chevron */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No reminders yet</h3>
            <p className="text-sm text-muted-foreground">
              Tap + to create your first reminder
            </p>
          </div>
        )}
      </div>

      {/* Edit Reminder Dialog */}
      <EditReminderDialog
        open={!!editingReminder}
        onOpenChange={(open) => !open && setEditingReminder(null)}
        reminder={editingReminder}
      />
    </div>
  );
};

export default Home;
