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

// Multi-medication support
export type DosageUnitKey = 'tablet' | 'capsule' | 'ml' | 'drops' | 'puff' | 'unit';

export interface DosageUnit {
  key: DosageUnitKey;
  singular: string;
  plural: string;
}

export const DOSAGE_UNITS: DosageUnit[] = [
  { key: 'tablet', singular: 'tablet', plural: 'tablets' },
  { key: 'capsule', singular: 'capsule', plural: 'capsules' },
  { key: 'ml', singular: 'ml', plural: 'ml' },
  { key: 'drops', singular: 'drop', plural: 'drops' },
  { key: 'puff', singular: 'puff', plural: 'puffs' },
  { key: 'unit', singular: 'unit', plural: 'units' },
];

export interface MedicationEntry {
  id: string;
  name: string;
  quantity?: number;
  unit?: DosageUnitKey;
  dosage?: string; // Legacy field for backwards compatibility
  instruction: InstructionKey;
}

/**
 * Format medication dosage with proper pluralization
 */
export function formatMedicationDosage(quantity: number | undefined, unit: DosageUnitKey | undefined): string {
  if (!quantity || !unit) return '';
  
  const unitConfig = DOSAGE_UNITS.find(u => u.key === unit);
  if (!unitConfig) return `${quantity} ${unit}`;
  
  return `${quantity} ${quantity === 1 ? unitConfig.singular : unitConfig.plural}`;
}

/**
 * Get the display string for a medication entry (for chips)
 */
export function getMedicationDisplayParts(medication: MedicationEntry): string[] {
  const parts: string[] = [medication.name];
  
  // Add dosage info
  if (medication.quantity && medication.unit) {
    parts.push(formatMedicationDosage(medication.quantity, medication.unit));
  } else if (medication.dosage?.trim()) {
    parts.push(medication.dosage.trim());
  }
  
  // Add instruction if not "none"
  if (medication.instruction !== 'none') {
    const instructionOption = INSTRUCTION_OPTIONS.find(opt => opt.key === medication.instruction);
    if (instructionOption) {
      parts.push(instructionOption.label.toLowerCase());
    }
  }
  
  return parts;
}

/**
 * Get the most common instruction from a list of medications
 */
function getGroupedInstruction(medications: MedicationEntry[]): string {
  const instructionCounts: Record<string, number> = {};
  
  for (const med of medications) {
    if (med.instruction !== 'none') {
      instructionCounts[med.instruction] = (instructionCounts[med.instruction] || 0) + 1;
    }
  }
  
  const entries = Object.entries(instructionCounts);
  if (entries.length === 0) return '';
  
  // Find most common instruction
  entries.sort((a, b) => b[1] - a[1]);
  const [mostCommon, count] = entries[0];
  
  // Only use if >50% share it or all have the same
  if (count >= medications.length * 0.5) {
    const option = INSTRUCTION_OPTIONS.find(opt => opt.key === mostCommon);
    return option?.messageText || '';
  }
  
  return '';
}

/**
 * Generate message for multiple medications with smart summarization
 */
export function generateMultiMedicationMessage(
  recipientName: string,
  medications: MedicationEntry[]
): string {
  if (medications.length === 0) {
    return '';
  }
  
  const count = medications.length;
  
  // Helper to format single medication with dosage
  const formatMedWithDosage = (med: MedicationEntry): string => {
    let result = med.name;
    if (med.quantity && med.unit) {
      result += ` (${formatMedicationDosage(med.quantity, med.unit)})`;
    } else if (med.dosage?.trim()) {
      result += ` (${med.dosage.trim()})`;
    }
    return result;
  };
  
  // Helper to format single medication for 1-med case (with dash, not parens)
  const formatSingleMed = (med: MedicationEntry): string => {
    let result = med.name;
    if (med.quantity && med.unit) {
      result += ` - ${formatMedicationDosage(med.quantity, med.unit)}`;
    } else if (med.dosage?.trim()) {
      result += ` - ${med.dosage.trim()}`;
    }
    return result;
  };
  
  let message = "This is your medication reminder. ";
  
  if (count === 1) {
    // Full detail for single medication
    const med = medications[0];
    message += `It's time to take your ${formatSingleMed(med)}.`;
    
    if (med.instruction !== 'none') {
      const option = INSTRUCTION_OPTIONS.find(opt => opt.key === med.instruction);
      if (option?.messageText) {
        message += ` ${option.messageText}`;
      }
    }
  } else if (count === 2) {
    // Both medications with dosages
    const med1 = formatMedWithDosage(medications[0]);
    const med2 = formatMedWithDosage(medications[1]);
    message += `It's time to take your ${med1} and ${med2}.`;
    
    const groupedInstruction = getGroupedInstruction(medications);
    if (groupedInstruction) {
      message += ` ${groupedInstruction}`;
    }
  } else if (count <= 4) {
    // Comma-separated list with dosages
    const medList = medications.map(formatMedWithDosage);
    const lastMed = medList.pop();
    message += `Time to take your medications: ${medList.join(', ')}, and ${lastMed}.`;
    
    const groupedInstruction = getGroupedInstruction(medications);
    if (groupedInstruction) {
      message += ` ${groupedInstruction}`;
    }
  } else {
    // 5+ medications: summary only
    message += `It's time to take your ${count} medications.`;
    
    const groupedInstruction = getGroupedInstruction(medications);
    if (groupedInstruction) {
      message += ` Remember to ${groupedInstruction.toLowerCase().replace(/^take /, '')}`;
    }
  }
  
  message += " Take care!";
  
  return message;
}

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
export type RepeatKey = "daily" | "weekly" | "once";

export interface RepeatOption {
  key: RepeatKey;
  label: string;
}

export const REPEAT_OPTIONS: RepeatOption[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "once", label: "Just once" },
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
      return "daily";
    case "weekly":
      return "weekly";
    case "once":
      return "once";
    default:
      return "once";
  }
}
