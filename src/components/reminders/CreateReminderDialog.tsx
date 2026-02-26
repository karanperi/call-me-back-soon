import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CalendarIcon, X, Globe, Info } from "lucide-react";
import { ContactPickerIcon } from "@/components/contacts/ContactPickerIcon";
import { InternationalPhoneInput } from "@/components/phone/InternationalPhoneInput";
import { FrequencyPicker } from "./FrequencyPicker";
import { TemplatePicker, TemplateType } from "./TemplatePicker";
import { MedicationReminderForm } from "./MedicationReminderForm";
import { VoiceInputSection } from "./VoiceInputSection";
import { VoiceSelector, VoiceType } from "@/components/voices/VoiceSelector";
import { format, addMinutes } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useCreateReminder, useCreateMultipleReminders, ReminderInsert } from "@/hooks/useReminders";
import { TIMEZONES, getDefaultTimezone } from "@/lib/timezones";
import { FrequencyConfig, getDefaultConfig, configToDbFields } from "@/lib/recurrenceUtils";
import { useVoiceDisableStatus } from "@/hooks/useVoiceDisableStatus";
import { useContacts } from "@/hooks/useContacts";
import { ParsedVoiceReminder } from "@/hooks/useVoiceReminderParser";

export interface InitialReminderData {
  recipientName?: string;
  phoneNumber?: string;
  message?: string;
  voice?: "friendly_female" | "friendly_male";
}

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: InitialReminderData;
}

type Voice = VoiceType;

export const CreateReminderDialog = ({
  open,
  onOpenChange,
  initialData,
}: CreateReminderDialogProps) => {
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("quick");

  // Voice input state (session-level - resets when dialog opens)
  const [sessionFailureCount, setSessionFailureCount] = useState(0);
  const [showTypeSwitch, setShowTypeSwitch] = useState(false);
  const [switchedFromTemplate, setSwitchedFromTemplate] = useState<'quick' | 'medication' | null>(null);
  const [voiceData, setVoiceData] = useState<ParsedVoiceReminder | null>(null);

  // Global disable status (persisted in localStorage)
  const { 
    isVoiceDisabledGlobally, 
    remainingDisableTime,
    disableVoiceFor24Hours,
    checkAndClearIfExpired,
  } = useVoiceDisableStatus();

  // Contacts for phone lookup
  const { data: contacts } = useContacts();

  const getDefaultDateTime = useCallback((tz: string) => {
    const now = new Date();
    const oneMinuteFromNow = addMinutes(now, 1);
    const zonedTime = toZonedTime(oneMinuteFromNow, tz);
    return {
      date: zonedTime,
      time: format(zonedTime, "HH:mm"),
    };
  }, []);

  const defaultTz = getDefaultTimezone();
  const defaultDateTime = getDefaultDateTime(defaultTz);

  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDateTime.date);
  const [time, setTime] = useState(defaultDateTime.time);
  const [frequencyConfig, setFrequencyConfig] = useState<FrequencyConfig>(
    getDefaultConfig("once", defaultDateTime.date)
  );
  const [voice, setVoice] = useState<Voice>("friendly_female");
  const [timezone, setTimezone] = useState(defaultTz);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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

  // Populate form with initial data when dialog opens (for duplicate feature)
  useEffect(() => {
    if (initialData && open) {
      if (initialData.recipientName) setRecipientName(initialData.recipientName);
      if (initialData.phoneNumber) {
        setPhoneNumber(initialData.phoneNumber);
        setIsPhoneValid(true); // Trust existing E.164 format
      }
      if (initialData.message) setMessage(initialData.message);
      if (initialData.voice) setVoice(initialData.voice);
    }
  }, [initialData, open]);

  // Reset voice session state when dialog opens
  useEffect(() => {
    if (open) {
      setSessionFailureCount(0);
      setShowTypeSwitch(false);
      setSwitchedFromTemplate(null);
      setVoiceData(null);
      checkAndClearIfExpired();
    }
  }, [open, checkAndClearIfExpired]);

  // Clear form for voice input
  const clearFormForVoice = useCallback(() => {
    const newTz = getDefaultTimezone();
    const newDefaults = getDefaultDateTime(newTz);
    
    setRecipientName("");
    setPhoneNumber("");
    setIsPhoneValid(false);
    setMessage("");
    setDate(newDefaults.date);
    setTime(newDefaults.time);
    setFrequencyConfig(getDefaultConfig("once", newDefaults.date));
    setVoice("friendly_female");
    setTimezone(newTz);
  }, [getDefaultDateTime]);

  // Handle voice form fill for quick reminders
  const handleVoiceFormFilled = useCallback((data: ParsedVoiceReminder) => {
    // Populate recipient name
    if (data.recipient_name) {
      setRecipientName(data.recipient_name);
    }
    
    // Populate phone number - from voice or contacts lookup
    if (data.phone_number) {
      setPhoneNumber(data.phone_number);
      setIsPhoneValid(true);
    } else if (data.recipient_name && contacts) {
      const matchedContact = contacts.find(
        c => c.name.toLowerCase() === data.recipient_name?.toLowerCase()
      );
      if (matchedContact) {
        setPhoneNumber(matchedContact.phone_number);
        setIsPhoneValid(true);
      }
    }
    
    // Populate schedule
    if (data.schedule) {
      if (data.schedule.start_date) {
        setDate(new Date(data.schedule.start_date));
      }
      if (data.schedule.time) {
        setTime(data.schedule.time);
      }
      
      // Map to FrequencyConfig
      const frequency = data.schedule.frequency || "once";
      const newConfig = getDefaultConfig(frequency, date || new Date());
      
      // Apply recurrence days of week
      if (data.schedule.recurrence_days_of_week) {
        newConfig.daysOfWeek = data.schedule.recurrence_days_of_week;
      }
      
      // Apply end conditions
      if (data.schedule.repeat_until) {
        newConfig.endType = 'on_date';
        newConfig.endDate = new Date(data.schedule.repeat_until);
      }
      if (data.schedule.max_occurrences) {
        newConfig.endType = 'after_count';
        newConfig.maxOccurrences = data.schedule.max_occurrences;
      }
      
      setFrequencyConfig(newConfig);
    }
    
    // For quick reminders - set message
    if (data.reminder_type === 'quick' && data.message) {
      setMessage(data.message);
    }
    
    // Store voice data for medication form if needed
    setVoiceData(data);
    
    // Reset failure count on success
    setSessionFailureCount(0);
  }, [contacts, date]);

  // Handle type switch from voice
  const handleVoiceTypeSwitch = useCallback((detectedType: 'quick' | 'medication') => {
    setSwitchedFromTemplate(selectedTemplate);
    setSelectedTemplate(detectedType);
    setShowTypeSwitch(true);
    
    toast({
      title: `Switched to ${detectedType === 'medication' ? 'Medication' : 'Quick'} reminder`,
      description: "Please review the form below.",
    });
  }, [selectedTemplate]);

  const createReminder = useCreateReminder();
  const createMultipleReminders = useCreateMultipleReminders();

  const handlePhoneChange = (e164Value: string, isValid: boolean) => {
    setPhoneNumber(e164Value);
    setIsPhoneValid(isValid);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    try {
      const dbFields = configToDbFields(frequencyConfig);
      await createReminder.mutateAsync({
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
      });

      toast({ title: "Reminder created successfully!" });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Failed to create reminder", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" 
      });
    }
  };

  const handleMedicationSubmit = async (reminders: Omit<ReminderInsert, "user_id">[]) => {
    try {
      if (reminders.length === 1) {
        await createReminder.mutateAsync(reminders[0]);
        toast({ title: "Medication reminder created ✓" });
      } else {
        await createMultipleReminders.mutateAsync(reminders);
        toast({ title: `${reminders.length} medication reminders created ✓` });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Failed to create reminder", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive" 
      });
      throw error;
    }
  };

  const resetForm = () => {
    const newTz = getDefaultTimezone();
    const newDefaults = getDefaultDateTime(newTz);
    setSelectedTemplate("quick");
    setRecipientName("");
    setPhoneNumber("");
    setIsPhoneValid(false);
    setMessage("");
    setDate(newDefaults.date);
    setTime(newDefaults.time);
    setFrequencyConfig(getDefaultConfig("once", newDefaults.date));
    setVoice("friendly_female");
    setTimezone(newTz);
  };

  const handleVoiceSelect = (selectedVoice: VoiceType) => {
    setVoice(selectedVoice);
  };

  // Get start of today for calendar minimum date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPending = createReminder.isPending || createMultipleReminders.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
        <DialogHeader className="sticky top-0 bg-card z-10 px-4 pt-4 pb-3 border-b border-border safe-area-top">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              New Reminder
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 -mr-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        {/* Template Picker */}
        <TemplatePicker
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />

        {/* Voice Input Section - Only for Quick template */}
        {selectedTemplate === "quick" && (
          <>
            <VoiceInputSection
              onFormFilled={handleVoiceFormFilled}
              onFormClear={clearFormForVoice}
              onTypeSwitch={handleVoiceTypeSwitch}
              currentTemplate="quick"
              isDisabledGlobally={isVoiceDisabledGlobally}
              disabledUntilMessage={remainingDisableTime}
              sessionFailureCount={sessionFailureCount}
              onSessionFailure={() => setSessionFailureCount(prev => prev + 1)}
              onDisableFor24Hours={disableVoiceFor24Hours}
            />

            {/* Divider */}
            <div className="relative px-4 py-2">
              <div className="absolute inset-0 flex items-center px-4">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or fill manually
                </span>
              </div>
            </div>

            {/* Type Switch Banner */}
            {showTypeSwitch && switchedFromTemplate && (
              <div className="mx-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Your voice described a {selectedTemplate} reminder, 
                      so we switched from the {switchedFromTemplate} template.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTypeSwitch(false)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Conditional Form Rendering */}
        {selectedTemplate === "quick" ? (
          <form onSubmit={handleQuickSubmit} className="p-4 space-y-6">
            {/* Recipient Details */}
            <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recipient Details
              </p>
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name</Label>
                <div className="relative">
                  <Input
                    id="recipientName"
                    placeholder="e.g. Grandma Jane"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="pr-10"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                    <ContactPickerIcon
                      onSelect={(name, phone) => {
                        setRecipientName(name);
                        setPhoneNumber(phone);
                      }}
                    />
                  </div>
                </div>
              </div>
              <InternationalPhoneInput
                id="phoneNumber"
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
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
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
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
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
              <VoiceSelector
                selectedVoice={voice}
                onSelect={handleVoiceSelect}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Save Reminder"}
            </Button>
          </form>
        ) : (
          <MedicationReminderForm
            onSubmit={handleMedicationSubmit}
            isPending={isPending}
            defaultTimezone={timezone}
            voiceData={voiceData}
            onVoiceFormFilled={handleVoiceFormFilled}
            onVoiceTypeSwitch={(type) => handleVoiceTypeSwitch(type)}
            onFormClear={clearFormForVoice}
            isVoiceDisabledGlobally={isVoiceDisabledGlobally}
            disabledUntilMessage={remainingDisableTime}
            sessionFailureCount={sessionFailureCount}
            onSessionFailure={() => setSessionFailureCount(prev => prev + 1)}
            onDisableFor24Hours={disableVoiceFor24Hours}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
