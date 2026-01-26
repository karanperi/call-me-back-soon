import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { CreateReminderDialog } from "@/components/reminders/CreateReminderDialog";
import { useReminders } from "@/hooks/useReminders";

export const AppLayout = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: reminders = [] } = useReminders();

  // Show tooltip only for new users who haven't created any reminders yet
  const showTooltip = reminders.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      <BottomNav 
        onCreateClick={() => setIsCreateOpen(true)} 
        showTooltip={showTooltip}
      />
      <CreateReminderDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
    </div>
  );
};
