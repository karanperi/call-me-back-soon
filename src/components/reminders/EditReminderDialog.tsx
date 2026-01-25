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
import { InternationalPhoneInput } from "@/components/phone/InternationalPhoneInput";
import { TestCallConfirmation } from "./TestCallConfirmation";
import { FrequencyPicker } from "./FrequencyPicker";
import { useState, useEffect } from "react";
import { format, getDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUpdateReminder, useDeleteReminder, Reminder } from "@/hooks/useReminders";
import { useMakeCall } from "@/hooks/useMakeCall";
import { TIMEZONES, getDefaultTimezone } from "@/lib/timezones";
import { FrequencyConfig, dbFieldsToConfig, configToDbFields, getDefaultConfig } from "@/lib/recurrenceUtils";

interface EditReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

type Voice = "friendly_female" | "friendly_male";

export const EditReminderDialog = ({
  open,
  onOpenChange,
  reminder,
}: EditReminderDialogProps) => {
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("09:00");
  const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig>(
    getDefaultConfig("once", new Date())
  );
  const [voice, setVoice] = useState<Voice>("friendly_female");
  const [timezone, setTimezone] = useState(getDefaultTimezone());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTestCallConfirm, setShowTestCallConfirm] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const { makeCall, isLoading: isCallingNow } = useMakeCall();

  // Update date and time when timezone changes
  const handleTimezoneChange = (newTimezone: string) => {
    if (date && time) {
      // Convert current date/time from old timezone to UTC, then to new timezone
      const [hours, minutes] = time.split(":").map(Number);
      const currentDateTime = new Date(date);
      currentDateTime.setHours(hours, minutes, 0, 0);
      
      // Convert from old timezone to UTC
      const utcTime = fromZonedTime(currentDateTime, timezone);
      // Convert from UTC to new timezone
      const newZonedTime = toZonedTime(utcTime, newTimezone);
      
      setDate(newZonedTime);
      setTime(format(newZonedTime, "HH:mm"));
    }
    setTimezone(newTimezone);
  };

  const handlePhoneChange = (e164Value: string, isValid: boolean) => {
    setPhoneNumber(e164Value);
    setIsPhoneValid(isValid);
  };

  // Initialize form with reminder data
  useEffect(() => {
    if (reminder) {
      setRecipientName(reminder.recipient_name);
      setPhoneNumber(reminder.phone_number);
      setIsPhoneValid(true); // Existing numbers are assumed valid
      setMessage(reminder.message);
      
      // Convert UTC to local timezone for display
      const userTimezone = getDefaultTimezone();
      setTimezone(userTimezone);
      
      const scheduledDate = new Date(reminder.scheduled_at);
      const zonedDate = toZonedTime(scheduledDate, userTimezone);
      setDate(zonedDate);
      setTime(format(zonedDate, "HH:mm"));
      
      // Convert reminder to FrequencyConfig
      const config = dbFieldsToConfig({
        frequency: reminder.frequency,
        recurrence_interval: (reminder as any).recurrence_interval,
        recurrence_days_of_week: (reminder as any).recurrence_days_of_week,
        recurrence_day_of_month: (reminder as any).recurrence_day_of_month,
        recurrence_week_of_month: (reminder as any).recurrence_week_of_month,
        repeat_until: reminder.repeat_until,
        max_occurrences: (reminder as any).max_occurrences,
      });
      setFrequencyConfig(config);
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
    
    if (!isPhoneValid || !phoneNumber) {
      toast({ title: "Please enter a valid phone number", variant: "destructive" });
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
      const dbFields = configToDbFields(frequencyConfig);
      await updateReminder.mutateAsync({
        id: reminder.id,
        recipient_name: recipientName.trim(),
        phone_number: phoneNumber, // Already in E.164 format
        message: message.trim(),
        scheduled_at: scheduledAt.toISOString(),
        frequency: dbFields.frequency,
        recurrence_interval: dbFields.recurrence_interval,
        recurrence_days_of_week: dbFields.recurrence_days_of_week,
        recurrence_day_of_month: dbFields.recurrence_day_of_month,
        recurrence_week_of_month: dbFields.recurrence_week_of_month,
        repeat_until: dbFields.repeat_until,
        max_occurrences: dbFields.max_occurrences,
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

  const handleTestCallClick = () => {
    setShowTestCallConfirm(true);
  };

  const handleTestCallConfirm = async () => {
    if (!reminder) return;

    try {
      await makeCall({
        reminderId: reminder.id,
        recipientName: recipientName || reminder.recipient_name,
        phoneNumber: phoneNumber || reminder.phone_number,
        message: message || reminder.message,
        voice: voice || reminder.voice,
      });
      setShowTestCallConfirm(false);
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
          <DialogHeader className="sticky top-0 bg-card z-10 px-4 pt-4 pb-3 border-b border-border safe-area-top">
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
            <InternationalPhoneInput
              id="editPhoneNumber"
              value={phoneNumber}
              onChange={handlePhoneChange}
              label="Phone Number"
              showCostEstimate={true}
            />
          </div>

            {/* Schedule */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Schedule
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
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
                <div className="w-full sm:w-32 space-y-2">
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
                <Select value={timezone} onValueChange={handleTimezoneChange}>
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

              <FrequencyPicker
                referenceDate={date || new Date()}
                value={frequencyConfig}
                onChange={setFrequencyConfig}
              />
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
              disabled={isCallingNow || updateReminder.isPending || !isPhoneValid}
              onClick={handleTestCallClick}
            >
              <Phone className="mr-2 h-5 w-5" />
              Test Call Now
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

      {/* Test Call Confirmation Dialog */}
      <TestCallConfirmation
        open={showTestCallConfirm}
        onOpenChange={setShowTestCallConfirm}
        onConfirm={handleTestCallConfirm}
        recipientName={recipientName || reminder.recipient_name}
        phoneNumber={phoneNumber || reminder.phone_number}
        voice={voice || reminder.voice}
        isLoading={isCallingNow}
      />
    </>
  );
};
