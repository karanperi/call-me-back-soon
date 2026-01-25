// Medication instruction options with labels and message text
export type InstructionKey = 
  | "none" 
  | "with_food" 
  | "with_water" 
  | "before_meal" 
  | "after_meal" 
  | "empty_stomach" 
  | "before_bed";

export interface InstructionOption {
  key: InstructionKey;
  label: string;
  messageText: string;
}

export const INSTRUCTION_OPTIONS: InstructionOption[] = [
  { key: "none", label: "None", messageText: "" },
  { key: "with_food", label: "With food", messageText: "Take with food." },
  { key: "with_water", label: "With water", messageText: "Take with a full glass of water." },
  { key: "before_meal", label: "Before meal", messageText: "Take before your meal." },
  { key: "after_meal", label: "After meal", messageText: "Take after your meal." },
  { key: "empty_stomach", label: "On empty stomach", messageText: "Take on an empty stomach." },
  { key: "before_bed", label: "Before bed", messageText: "Take before going to bed." },
];

// Time preset options for medication reminders
export type TimePresetKey = "morning" | "afternoon" | "evening" | "bedtime" | "custom";

export interface TimePreset {
  key: TimePresetKey;
  label: string;
  time: string; // 24-hour format HH:mm
}

export const TIME_PRESETS: TimePreset[] = [
  { key: "morning", label: "Morning", time: "09:00" },
  { key: "afternoon", label: "Afternoon", time: "14:00" },
  { key: "evening", label: "Evening", time: "18:00" },
  { key: "bedtime", label: "Bedtime", time: "21:00" },
  { key: "custom", label: "Custom...", time: "" },
];

// Repeat/frequency options for medication reminders
export type RepeatKey = "daily" | "twice_daily" | "three_times_daily" | "weekly" | "once";

export interface RepeatOption {
  key: RepeatKey;
  label: string;
  description?: string;
  createMultiple: boolean;
  times?: string[]; // Times for multiple reminders (24-hour format)
}

export const REPEAT_OPTIONS: RepeatOption[] = [
  { key: "daily", label: "Daily", createMultiple: false },
  { 
    key: "twice_daily", 
    label: "Twice daily", 
    description: "9:00 AM and 6:00 PM",
    createMultiple: true,
    times: ["09:00", "18:00"],
  },
  { 
    key: "three_times_daily", 
    label: "Three times daily", 
    description: "9:00 AM, 2:00 PM, and 6:00 PM",
    createMultiple: true,
    times: ["09:00", "14:00", "18:00"],
  },
  { key: "weekly", label: "Weekly", createMultiple: false },
  { key: "once", label: "Just once", createMultiple: false },
];

/**
 * Generate a medication reminder message based on form inputs
 */
export function generateMedicationMessage(
  recipientName: string,
  medicationName: string,
  dosage: string | undefined,
  instruction: InstructionKey
): string {
  const medication = medicationName.trim() || "medication";
  
  let message = `This is your medication reminder. It's time to take your ${medication}`;
  
  // Add dosage if provided
  if (dosage?.trim()) {
    message += ` - ${dosage.trim()}`;
  }
  
  message += ".";
  
  // Add instructions if selected (not "none")
  if (instruction !== "none") {
    const instructionOption = INSTRUCTION_OPTIONS.find(opt => opt.key === instruction);
    if (instructionOption?.messageText) {
      message += ` ${instructionOption.messageText}`;
    }
  }
  
  message += " Take care!";
  
  return message;
}

/**
 * Get the database frequency value for a repeat option
 */
export function getDbFrequency(repeat: RepeatKey): string {
  switch (repeat) {
    case "daily":
    case "twice_daily":
    case "three_times_daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "once":
      return "once";
    default:
      return "once";
  }
}
