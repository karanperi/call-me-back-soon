import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Settings, ChevronRight, Phone, Calendar, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useReminders, useUpdateReminder, Reminder } from "@/hooks/useReminders";
import { EditReminderDialog } from "@/components/reminders/EditReminderDialog";
import { useCallHistory } from "@/hooks/useCallHistory";
import { useProfile } from "@/hooks/useProfile";
import { format, isToday, startOfDay, endOfDay } from "date-fns";

// Helper to get time-based greeting
const getGreeting = (name: string): { text: string; emoji: string } => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: `Good morning, ${name}`, emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { text: `Good afternoon, ${name}`, emoji: "🌤️" };
  if (hour >= 17 && hour < 21) return { text: `Good evening, ${name}`, emoji: "🌙" };
  return { text: `Good night, ${name}`, emoji: "✨" };
};

// Extract first name from email or return fallback
const getFirstName = (email: string | null | undefined): string => {
  if (!email) return "there";
  const localPart = email.split("@")[0];
  // Capitalize first letter
  return localPart.charAt(0).toUpperCase() + localPart.slice(1).split(/[._-]/)[0];
};

const Home = () => {
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const { data: reminders = [], isLoading } = useReminders();
  const { data: allCallHistory = [] } = useCallHistory();
  const { data: inProgressCalls = [] } = useCallHistory("in_progress");
  const { data: profile } = useProfile();
  const updateReminder = useUpdateReminder();

  // Get user's first name for greeting
  const firstName = getFirstName(profile?.email);
  const greeting = getGreeting(firstName);

  // Get reminder IDs that have in-progress calls
  const inProgressReminderIds = useMemo(() => new Set(
    inProgressCalls
      .filter(call => call.reminder_id)
      .map(call => call.reminder_id)
  ), [inProgressCalls]);

  // Calculate today's completed calls
  const todayCompletedCalls = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return allCallHistory.filter(call => {
      const attemptedAt = new Date(call.attempted_at);
      return attemptedAt >= todayStart && attemptedAt <= todayEnd && call.status === "completed";
    });
  }, [allCallHistory]);

  // Get reminder IDs that were already attempted today
  const attemptedTodayReminderIds = useMemo(() => new Set(
    allCallHistory
      .filter(call => {
        const attemptedAt = new Date(call.attempted_at);
        return isToday(attemptedAt) && call.reminder_id;
      })
      .map(call => call.reminder_id)
  ), [allCallHistory]);

  // "Happening Now" - reminders with in-progress calls
  const happeningNowReminders = useMemo(() => 
    reminders.filter(r => inProgressReminderIds.has(r.id)),
    [reminders, inProgressReminderIds]
  );

  // "Today's Calls" - active reminders scheduled for today, not in-progress, not attempted
  const todaysCallsReminders = useMemo(() => 
    reminders.filter(r => {
      if (!r.is_active) return false;
      if (inProgressReminderIds.has(r.id)) return false;
      if (attemptedTodayReminderIds.has(r.id)) return false;
      return isToday(new Date(r.scheduled_at));
    }),
    [reminders, inProgressReminderIds, attemptedTodayReminderIds]
  );

  // Check if all today's calls are complete
  const allTodayCallsComplete = useMemo(() => {
    const todayReminders = reminders.filter(r => 
      r.is_active && isToday(new Date(r.scheduled_at))
    );
    return todayReminders.length > 0 && todaysCallsReminders.length === 0 && happeningNowReminders.length === 0;
  }, [reminders, todaysCallsReminders, happeningNowReminders]);

  // Count remaining calls today
  const remainingCallsToday = todaysCallsReminders.length + happeningNowReminders.length;

  const toggleReminder = (e: React.MouseEvent, id: string, isActive: boolean) => {
    e.stopPropagation();
    updateReminder.mutate({ id, is_active: !isActive });
  };

  const handleCardClick = (reminder: Reminder) => {
    setEditingReminder(reminder);
  };

  const formatSchedule = (reminder: Reminder) => {
    const date = new Date(reminder.scheduled_at);
    const timeStr = format(date, "h:mm a");
    const freqStr = reminder.frequency.charAt(0).toUpperCase() + reminder.frequency.slice(1);
    return `${timeStr} • ${freqStr}`;
  };

  // Reusable card component
  const ReminderCard = ({ reminder, showInProgress = false }: { reminder: Reminder; showInProgress?: boolean }) => {
    const isInProgress = showInProgress || inProgressReminderIds.has(reminder.id);
    
    return (
      <div
        key={reminder.id}
        onClick={() => handleCardClick(reminder)}
        className="bg-card rounded-lg p-4 card-shadow border border-border flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-colors"
      >
        {/* Avatar with in-progress indicator */}
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
            isInProgress 
              ? "bg-gradient-to-br from-green-500/20 to-green-400/10" 
              : "bg-gradient-to-br from-primary/20 to-primary/10"
          )}>
            {isInProgress ? (
              <Phone className="w-5 h-5 text-green-500 animate-pulse" />
            ) : (
              <span className="text-primary font-semibold">
                {reminder.recipient_name.charAt(0)}
              </span>
            )}
          </div>
          {isInProgress && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {reminder.recipient_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {isInProgress ? (
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
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title=""
        leftElement={
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-foreground">
              {greeting.text} {greeting.emoji}
            </span>
            <span className="text-sm text-muted-foreground">
              {remainingCallsToday} call{remainingCallsToday !== 1 ? "s" : ""} remaining today
            </span>
          </div>
        }
        rightElement={
          <Link to="/profile" className="p-1 hover:bg-secondary rounded-full transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Link>
        }
      />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Happening Now Section */}
            {happeningNowReminders.length > 0 && (
              <section className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                    Happening Now
                  </p>
                </div>
                <div className="space-y-3">
                  {happeningNowReminders.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} showInProgress />
                  ))}
                </div>
              </section>
            )}

            {/* Today's Calls Section */}
            {todaysCallsReminders.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏰</span>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Today's Calls
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {todaysCallsReminders.length} Call{todaysCallsReminders.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {todaysCallsReminders.map((reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty States */}
            {happeningNowReminders.length === 0 && todaysCallsReminders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                {allTodayCallsComplete ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">All done for today!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {todayCompletedCalls.length} call{todayCompletedCalls.length !== 1 ? "s" : ""} completed
                    </p>
                    <Link 
                      to="/history" 
                      className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                    >
                      View in History
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">No calls scheduled today</h3>
                    <p className="text-sm text-muted-foreground">
                      Tap + to create a new reminder
                    </p>
                  </>
                )}
              </div>
            )}

            {/* View All Reminders Link */}
            {reminders.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Link 
                  to="/reminders" 
                  className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                >
                  View All Reminders
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
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
