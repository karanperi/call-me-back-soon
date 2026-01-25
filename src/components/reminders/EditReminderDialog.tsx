import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, X, Trash2, Phone, Loader2, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUpdateReminder, useDeleteReminder, Reminder } from "@/hooks/useReminders";
import { useMakeCall } from "@/hooks/useMakeCall";
import { TIMEZONES, getDefaultTimezone } from "@/lib/timezones";

interface EditReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

type Frequency = "once" | "daily" | "weekly";
type Voice = "friendly_female" | "friendly_male";

export const EditReminderDialog = ({
  open,
  onOpenChange,
  reminder,
}: EditReminderDialogProps) => {
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+44 ");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [frequency, setFrequency] = useState<Frequency>("once");
  const [voice, setVoice] = useState<Voice>("friendly_female");
  const [timezone, setTimezone] = useState(getDefaultTimezone());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const { makeCall, isLoading: isCallingNow } = useMakeCall();

  // Initialize form with reminder data
  useEffect(() => {
    if (reminder) {
      setRecipientName(reminder.recipient_name);
      setPhoneNumber(reminder.phone_number);
      setMessage(reminder.message);
      
      // Convert UTC to local timezone for display
      const userTimezone = getDefaultTimezone();
      setTimezone(userTimezone);
      
      const scheduledDate = new Date(reminder.scheduled_at);
      const zonedDate = toZonedTime(scheduledDate, userTimezone);
      setDate(zonedDate);
      setTime(format(zonedDate, "HH:mm"));
      
      setFrequency(reminder.frequency as Frequency);
      setVoice(reminder.voice as Voice);
    }
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reminder) return;

    // Validation
    if (recipientName.trim().length < 2) {
      toast({ title: "Recipient name must be at least 2 characters", variant: "destructive" });
      return;
    }
    
    const phoneRegex = /^(\+44|0)\s?7\d{3}\s?\d{6}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ""))) {
      toast({ title: "Please enter a valid UK phone number", variant: "destructive" });
      return;
    }
    
    if (!date) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }
    
    if (!message.trim()) {
      toast({ title: "Please enter a message", variant: "destructive" });
      return;
    }

    // Combine date and time in the selected timezone, then convert to UTC
    const [hours, minutes] = time.split(":").map(Number);
    const localDateTime = new Date(date);
    localDateTime.setHours(hours, minutes, 0, 0);
    
    // Convert from selected timezone to UTC
    const scheduledAt = fromZonedTime(localDateTime, timezone);

    if (scheduledAt <= new Date()) {
      toast({ title: "Scheduled time must be in the future", variant: "destructive" });
      return;
    }

    // If scheduled for future, automatically reactivate the reminder
    const shouldActivate = scheduledAt > new Date();

    try {
      await updateReminder.mutateAsync({
        id: reminder.id,
        recipient_name: recipientName.trim(),
        phone_number: phoneNumber.replace(/\s/g, ""),
        message: message.trim(),
        scheduled_at: scheduledAt.toISOString(),
        frequency,
        voice,
        is_active: shouldActivate ? true : reminder.is_active,
      });

      toast({ title: "Reminder updated successfully!" });
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: "Failed to update reminder", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async () => {
    if (!reminder) return;

    try {
      await deleteReminder.mutateAsync(reminder.id);
      toast({ title: "Reminder deleted successfully!" });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      toast({ 
        title: "Failed to delete reminder", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" 
      });
    }
  };

  const handleTestCall = async () => {
    if (!reminder) return;

    try {
      await makeCall({
        reminderId: reminder.id,
        recipientName: reminder.recipient_name,
        phoneNumber: reminder.phone_number,
        message: reminder.message,
        voice: reminder.voice,
      });
    } catch (error) {
      // Error toast is already shown by useMakeCall
      console.error("Test call failed:", error);
    }
  };

  if (!reminder) return null;

  // Get start of today for calendar minimum date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 bg-card z-10 px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onOpenChange(false)}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
              <DialogTitle className="text-lg font-semibold">
                Edit Reminder
              </DialogTitle>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 hover:bg-destructive/10 rounded-full transition-colors text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {/* Recipient Details */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recipient Details
              </p>
              <div className="space-y-2">
                <Label htmlFor="editRecipientName">Recipient Name</Label>
                <Input
                  id="editRecipientName"
                  placeholder="e.g. Grandma Jane"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber">Phone Number</Label>
                <Input
                  id="editPhoneNumber"
                  type="tel"
                  placeholder="+44 7700 000000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Schedule
              </p>
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Date</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                          setDate(selectedDate);
                          setDatePickerOpen(false);
                        }}
                        disabled={(d) => d < today}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-28 space-y-2">
                  <Label htmlFor="editTime">Time</Label>
                  <Input
                    id="editTime"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Timezone Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-popover">
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <div className="flex gap-2">
                  {(["once", "daily", "weekly"] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-full text-sm font-medium transition-colors",
                        frequency === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Call Script
              </p>
              <div className="space-y-2">
                <Label htmlFor="editMessage">Your Message</Label>
                <Textarea
                  id="editMessage"
                  placeholder="Type the message that will be spoken to the recipient..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="italic">
                    The recipient's name will be included in the greeting automatically.
                  </span>
                  <span>{message.length}/500</span>
                </div>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Voice
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVoice("friendly_female")}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all text-left",
                    voice === "friendly_female"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 mb-2" />
                  <p className="font-medium text-sm">Friendly Female</p>
                  <p className="text-xs text-muted-foreground">Warm & Clear</p>
                </button>
                <button
                  type="button"
                  onClick={() => setVoice("friendly_male")}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all text-left",
                    voice === "friendly_male"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-cyan-200 mb-2" />
                  <p className="font-medium text-sm">Friendly Male</p>
                  <p className="text-xs text-muted-foreground">Calm & Professional</p>
                </button>
              </div>
            </div>

            {/* Test Call Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-semibold border-primary text-primary hover:bg-primary/5"
              disabled={isCallingNow || updateReminder.isPending}
              onClick={handleTestCall}
            >
              {isCallingNow ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Test Call Now
                </>
              )}
            </Button>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={updateReminder.isPending || isCallingNow}
            >
              {updateReminder.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the reminder for {reminder.recipient_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReminder.isPending}
            >
              {deleteReminder.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
