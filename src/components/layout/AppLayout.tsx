import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { CreateReminderDialog } from "@/components/reminders/CreateReminderDialog";

export const AppLayout = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      <BottomNav onCreateClick={() => setIsCreateOpen(true)} />
      <CreateReminderDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
    </div>
  );
};
