import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CalendarIcon } from "lucide-react";
import { ContactPickerIcon } from "@/components/contacts/ContactPickerIcon";
import { InternationalPhoneInput } from "@/components/phone/InternationalPhoneInput";
import { MessagePreview } from "./MessagePreview";
import { MedicationList } from "./MedicationList";
import { VoiceInputSection } from "./VoiceInputSection";
import { VoiceSelector, VoiceType } from "@/components/voices/VoiceSelector";
import { format, addMinutes } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  MedicationEntry,
  TimePresetKey,
  RepeatKey,
  TIME_PRESETS,
  REPEAT_OPTIONS,
  generateMultiMedicationMessage,
  DosageUnitKey,
  InstructionKey,
} from "@/lib/medicationUtils";
import { ReminderInsert } from "@/hooks/useReminders";
import { ParsedVoiceReminder } from "@/hooks/useVoiceReminderParser";

type Voice = VoiceType;

interface MedicationReminderFormProps {
  onSubmit: (reminders: Omit<ReminderInsert, "user_id">[]) => Promise<void>;
  isPending: boolean;
  defaultTimezone: string;
  // Voice integration props
  voiceData?: ParsedVoiceReminder | null;
  onVoiceFormFilled?: (data: ParsedVoiceReminder) => void;
  onVoiceTypeSwitch?: (newType: 'quick') => void;
  onFormClear?: () => void;
  isVoiceDisabledGlobally?: boolean;
  disabledUntilMessage?: string | null;
  sessionFailureCount?: number;
  onSessionFailure?: () => void;
  onDisableFor24Hours?: () => void;
}

export const MedicationReminderForm = ({
  onSubmit,
  isPending,
  defaultTimezone,
  voiceData,
  onVoiceFormFilled,
  onVoiceTypeSwitch,
  onFormClear,
  isVoiceDisabledGlobally = false,
  disabledUntilMessage,
  sessionFailureCount = 0,
  onSessionFailure,
  onDisableFor24Hours,
}: MedicationReminderFormProps) => {
  // Get default date/time
  const getDefaultDateTime = useCallback(() => {
    const now = new Date();
    const oneMinuteFromNow = addMinutes(now, 1);
    const zonedTime = toZonedTime(oneMinuteFromNow, defaultTimezone);
    return {
      date: zonedTime,
      time: format(zonedTime, "HH:mm"),
    };
  }, [defaultTimezone]);

  const defaultDateTime = getDefaultDateTime();

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [medications, setMedications] = useState<MedicationEntry[]>([
    { id: crypto.randomUUID(), name: '', instruction: 'none' }
  ]);
  const [timePreset, setTimePreset] = useState<TimePresetKey>("morning");
  const [customTime, setCustomTime] = useState(defaultDateTime.time);
  const [repeat, setRepeat] = useState<RepeatKey>("daily");
  const [date, setDate] = useState<Date | undefined>(defaultDateTime.date);
  const [voice, setVoice] = useState<Voice>("friendly_female");
  const [customVoiceId, setCustomVoiceId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Message state
  const [message, setMessage] = useState("");
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);

  // Voice-fill highlight state: tracks which fields need attention after voice population
  const [voiceHighlights, setVoiceHighlights] = useState<Set<string>>(new Set());

  // Reset form for voice input
  const resetFormForVoice = useCallback(() => {
    setRecipientName("");
    setPhoneNumber("");
    setIsPhoneValid(false);
    setMedications([{ id: crypto.randomUUID(), name: '', instruction: 'none' }]);
    setTimePreset("morning");
    setCustomTime(getDefaultDateTime().time);
    setRepeat("daily");
    setDate(getDefaultDateTime().date);
    setVoice("friendly_female");
    setCustomVoiceId(null);
    setMessage("");
    setIsManuallyEdited(false);
    setVoiceHighlights(new Set());
  }, [getDefaultDateTime]);

  // Handle form clear from voice
  const handleFormClear = useCallback(() => {
    resetFormForVoice();
    onFormClear?.();
  }, [resetFormForVoice, onFormClear]);

  // Populate form when voice data is provided
  useEffect(() => {
    if (voiceData && voiceData.reminder_type === 'medication') {
      // Populate recipient name
      if (voiceData.recipient_name) {
        setRecipientName(voiceData.recipient_name);
      }
      
      // Populate phone number
      if (voiceData.phone_number) {
        setPhoneNumber(voiceData.phone_number);
        setIsPhoneValid(true);
      }
      
      // Populate schedule
      if (voiceData.schedule) {
        if (voiceData.schedule.start_date) {
          setDate(new Date(voiceData.schedule.start_date));
        }
        if (voiceData.schedule.time) {
          setTimePreset('custom');
          setCustomTime(voiceData.schedule.time);
        }
        if (voiceData.schedule.frequency) {
          setRepeat(voiceData.schedule.frequency as RepeatKey);
        }
      }
      
      // Populate medications
      if (voiceData.medications && voiceData.medications.length > 0) {
        const medicationEntries: MedicationEntry[] = voiceData.medications.map(med => ({
          id: crypto.randomUUID(),
          name: med.name,
          quantity: med.quantity,
          unit: med.unit as DosageUnitKey,
          instruction: med.instruction as InstructionKey,
        }));
        setMedications(medicationEntries);
      }
      
      // Reset message manual edit flag so it regenerates
      setIsManuallyEdited(false);

      // Detect which tracked fields were NOT populated by voice
      const missing = new Set<string>();
      const fieldLabels: string[] = [];

      if (!voiceData.phone_number) {
        missing.add('phone');
        fieldLabels.push('Phone Number');
      }
      if (!voiceData.schedule?.start_date && !voiceData.schedule?.time) {
        missing.add('schedule');
        fieldLabels.push('Date & Time');
      }
      // Message is auto-generated from medications, so only flag if no medications were detected
      if (!voiceData.medications || voiceData.medications.length === 0) {
        missing.add('message');
        fieldLabels.push('Reminder Message');
      }

      setVoiceHighlights(missing);

      if (fieldLabels.length > 0) {
        toast({
          title: "Some fields need your input",
          description: `Please fill in: ${fieldLabels.join(', ')}`,
        });
      }
    }
  }, [voiceData]);

  // Handle voice form fill
  const handleVoiceFormFilled = useCallback((data: ParsedVoiceReminder) => {
    if (data.reminder_type === 'quick') {
      // Detected quick reminder, trigger switch to parent
      onVoiceTypeSwitch?.('quick');
    } else {
      // It's a medication reminder, populate this form
      onVoiceFormFilled?.(data);
    }
  }, [onVoiceFormFilled, onVoiceTypeSwitch]);
  // Clear individual voice highlights as fields get filled
  useEffect(() => {
    if (voiceHighlights.has('phone') && isPhoneValid && phoneNumber) {
      setVoiceHighlights(prev => { const next = new Set(prev); next.delete('phone'); return next; });
    }
  }, [isPhoneValid, phoneNumber, voiceHighlights]);

  useEffect(() => {
    if (voiceHighlights.has('schedule') && date && (timePreset !== 'custom' || customTime)) {
      setVoiceHighlights(prev => { const next = new Set(prev); next.delete('schedule'); return next; });
    }
  }, [date, timePreset, customTime, voiceHighlights]);

  useEffect(() => {
    if (voiceHighlights.has('message') && message.trim()) {
      setVoiceHighlights(prev => { const next = new Set(prev); next.delete('message'); return next; });
    }
  }, [message, voiceHighlights]);

  // Auto-generated message based on all valid medications
  const validMedications = useMemo(() => 
    medications.filter(m => m.name.trim()), 
    [medications]
  );
  
  const autoGeneratedMessage = useMemo(() => {
    return generateMultiMedicationMessage(recipientName, validMedications);
  }, [recipientName, validMedications]);

  // Get the actual time to use
  const getSelectedTime = useCallback((): string => {
    if (timePreset === "custom") {
      return customTime;
    }
    const preset = TIME_PRESETS.find(p => p.key === timePreset);
    return preset?.time || "09:00";
  }, [timePreset, customTime]);

  const handlePhoneChange = (e164Value: string, isValid: boolean) => {
    setPhoneNumber(e164Value);
    setIsPhoneValid(isValid);
  };

  const handleVoiceSelect = (selectedVoice: VoiceType, selectedCustomVoiceId?: string) => {
    setVoice(selectedVoice);
    setCustomVoiceId(selectedCustomVoiceId || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (validMedications.length === 0) {
      toast({ title: "Please enter at least one medication name", variant: "destructive" });
      return;
    }

    if (!date) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }

    if (!message.trim()) {
      toast({ title: "Message cannot be empty", variant: "destructive" });
      return;
    }

    const frequency = repeat === "daily" ? "daily" : repeat === "weekly" ? "weekly" : "once";

    // Create reminder object
    const selectedTime = getSelectedTime();
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const localDateTime = new Date(date);
    localDateTime.setHours(hours, minutes, 0, 0);
    
    // Convert from selected timezone to UTC
    const scheduledAt = fromZonedTime(localDateTime, defaultTimezone);

    const reminder: Omit<ReminderInsert, "user_id"> = {
      recipient_name: recipientName.trim(),
      phone_number: phoneNumber,
      message: message.trim(),
      scheduled_at: scheduledAt.toISOString(),
      frequency,
      voice,
      custom_voice_id: voice === "custom" ? customVoiceId : null,
    };

    // Validate time is in the future
    if (scheduledAt <= new Date()) {
      toast({ title: "Scheduled time must be in the future", variant: "destructive" });
      return;
    }

    try {
      await onSubmit([reminder]);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  // Get start of today for calendar minimum date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 overflow-x-hidden">
      {/* Voice Input Section */}
      <VoiceInputSection
        onFormFilled={handleVoiceFormFilled}
        onFormClear={handleFormClear}
        onTypeSwitch={onVoiceTypeSwitch}
        currentTemplate="medication"
        isDisabledGlobally={isVoiceDisabledGlobally}
        disabledUntilMessage={disabledUntilMessage}
        sessionFailureCount={sessionFailureCount}
        onSessionFailure={() => onSessionFailure?.()}
        onDisableFor24Hours={() => onDisableFor24Hours?.()}
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

      <div className="px-4 space-y-6">
        {/* Tip Note */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent border border-border">
          {/* Two-tone vertical pill icon, tilted 30° right */}
          <svg 
            className="h-6 w-6 flex-shrink-0" 
            viewBox="0 0 24 24" 
            fill="none"
            style={{ transform: 'rotate(30deg)' }}
          >
            {/* White top half */}
            <path 
              d="M8 12V6C8 3.79 9.79 2 12 2C14.21 2 16 3.79 16 6V12H8Z" 
              className="fill-white stroke-muted-foreground" 
              strokeWidth="1.5"
            />
            {/* Red bottom half */}
            <path 
              d="M8 12V18C8 20.21 9.79 22 12 22C14.21 22 16 20.21 16 18V12H8Z" 
              className="fill-destructive stroke-destructive" 
              strokeWidth="1.5"
            />
          </svg>
          <p className="text-sm font-medium text-foreground">
            Create one reminder per time slot. You can add multiple medications to each reminder.
          </p>
        </div>

      {/* Recipient Details */}
      <div className={cn(
        "bg-secondary/50 rounded-lg p-4 space-y-4 transition-all duration-300",
        voiceHighlights.has('phone') && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Who is this for?
        </p>
        <div className="space-y-2">
          <Label htmlFor="med-recipientName">Recipient Name</Label>
          <div className="relative">
            <Input
              id="med-recipientName"
              placeholder="e.g. Dad, Grandma"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="pr-10"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <ContactPickerIcon
                onSelect={(name, phone) => {
                  setRecipientName(name);
                  setPhoneNumber(phone);
                  setIsPhoneValid(true);
                }}
              />
            </div>
          </div>
        </div>
        <InternationalPhoneInput
          id="med-phoneNumber"
          value={phoneNumber}
          onChange={handlePhoneChange}
          label="Phone Number"
          showCostEstimate={true}
        />
      </div>

      {/* Medication Details */}
      <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Medication Details
        </p>
        <MedicationList
          medications={medications}
          onChange={setMedications}
        />
      </div>

      {/* Schedule */}
      <div className={cn(
        "bg-secondary/50 rounded-lg p-4 space-y-4 transition-all duration-300",
        voiceHighlights.has('schedule') && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Schedule
        </p>
        
        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Starting Date</Label>
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

        {/* Repeat Selection */}
        <div className="space-y-2">
          <Label>Repeat</Label>
          <Select value={repeat} onValueChange={(v) => setRepeat(v as RepeatKey)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {REPEAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Selection */}
        <div className="space-y-2">
          <Label>When</Label>
          <Select value={timePreset} onValueChange={(v) => setTimePreset(v as TimePresetKey)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {TIME_PRESETS.map((preset) => (
                <SelectItem key={preset.key} value={preset.key}>
                  {preset.key !== "custom" 
                    ? `${preset.label} (${format(new Date(`2000-01-01T${preset.time}`), "h:mm a")})`
                    : preset.label
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {timePreset === "custom" && (
            <Input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full"
            />
          )}
        </div>
      </div>

      {/* Message Preview */}
      <div className={cn(
        "bg-secondary/50 rounded-lg p-4 space-y-4 transition-all duration-300",
        voiceHighlights.has('message') && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Call Script
        </p>
        <MessagePreview
          autoGeneratedMessage={autoGeneratedMessage}
          value={message}
          onChange={setMessage}
          isManuallyEdited={isManuallyEdited}
          onManualEdit={setIsManuallyEdited}
          medicationCount={validMedications.length}
        />
      </div>

      {/* Voice Selection */}
      <div className="bg-secondary/50 rounded-lg p-4 space-y-4">
        <VoiceSelector
          selectedVoice={voice}
          customVoiceId={customVoiceId}
          onSelect={handleVoiceSelect}
        />
      </div>

      {/* Spacer for sticky button */}
      <div className="h-20" />
      </div>

      {/* Sticky Submit Button */}
      <div className="sticky bottom-0 left-0 right-0 pt-4 pb-4 px-4 bg-background border-t border-border">
        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold"
          disabled={isPending}
        >
          {isPending ? "Creating..." : "Create Reminder"}
        </Button>
      </div>
    </form>
  );
};
