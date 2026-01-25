import { format, addDays, addWeeks, addMonths, addYears, getDay, setDay, getDate, setDate } from "date-fns";

export type FrequencyType = "once" | "daily" | "weekly" | "monthly" | "yearly" | "weekdays" | "weekends" | "custom";
export type EndType = "never" | "on_date" | "after_count";
export type MonthlyType = "day_of_month" | "week_of_month";
export type RecurrenceUnit = "days" | "weeks" | "months" | "years";

export interface FrequencyConfig {
  frequency: FrequencyType;
  interval?: number;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  monthlyType?: MonthlyType;
  dayOfMonth?: number; // 1-31
  weekOfMonth?: number; // 1-4, -1=last
  dayOfWeekForMonthly?: number; // 0-6 for "first Monday" style
  endType?: EndType;
  endDate?: Date | string;
  maxOccurrences?: number;
}

// Day names for display
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Week ordinal names
const WEEK_ORDINALS = ["", "first", "second", "third", "fourth", "last"];

/**
 * Get a human-readable label for a preset frequency
 */
export function getPresetLabel(preset: FrequencyType, referenceDate: Date): string {
  const dayOfWeek = getDay(referenceDate);
  const dayOfMonth = getDate(referenceDate);
  const monthDay = format(referenceDate, "MMMM d");

  switch (preset) {
    case "once":
      return "Does not repeat";
    case "daily":
      return "Daily";
    case "weekly":
      return `Weekly on ${DAY_NAMES_FULL[dayOfWeek]}`;
    case "monthly":
      return `Monthly on the ${getOrdinalSuffix(dayOfMonth)}`;
    case "yearly":
      return `Annually on ${monthDay}`;
    case "weekdays":
      return "Every weekday (Mon-Fri)";
    case "weekends":
      return "Every weekend (Sat-Sun)";
    case "custom":
      return "Custom...";
    default:
      return "Does not repeat";
  }
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Generate a human-readable summary of a frequency configuration
 */
export function getRecurrenceSummary(config: FrequencyConfig, referenceDate: Date): string {
  const { frequency, interval = 1, daysOfWeek, monthlyType, dayOfMonth, weekOfMonth, dayOfWeekForMonthly, endType, endDate, maxOccurrences } = config;

  let summary = "";

  switch (frequency) {
    case "once":
      return "Does not repeat";
    
    case "daily":
      summary = interval === 1 ? "Daily" : `Every ${interval} days`;
      break;
    
    case "weekly":
      if (interval === 1) {
        summary = `Weekly on ${DAY_NAMES_FULL[getDay(referenceDate)]}`;
      } else {
        summary = `Every ${interval} weeks on ${DAY_NAMES_FULL[getDay(referenceDate)]}`;
      }
      break;
    
    case "monthly":
      if (monthlyType === "week_of_month" && weekOfMonth !== undefined && dayOfWeekForMonthly !== undefined) {
        const weekOrdinal = weekOfMonth === -1 ? "last" : WEEK_ORDINALS[weekOfMonth];
        summary = interval === 1 
          ? `Monthly on the ${weekOrdinal} ${DAY_NAMES_FULL[dayOfWeekForMonthly]}`
          : `Every ${interval} months on the ${weekOrdinal} ${DAY_NAMES_FULL[dayOfWeekForMonthly]}`;
      } else {
        const day = dayOfMonth || getDate(referenceDate);
        summary = interval === 1 
          ? `Monthly on the ${getOrdinalSuffix(day)}`
          : `Every ${interval} months on the ${getOrdinalSuffix(day)}`;
      }
      break;
    
    case "yearly":
      summary = interval === 1 
        ? `Annually on ${format(referenceDate, "MMMM d")}`
        : `Every ${interval} years on ${format(referenceDate, "MMMM d")}`;
      break;
    
    case "weekdays":
      summary = "Every weekday (Mon-Fri)";
      break;
    
    case "weekends":
      summary = "Every weekend (Sat-Sun)";
      break;
    
    case "custom":
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = daysOfWeek.sort((a, b) => a - b).map(d => DAY_NAMES[d]).join(", ");
        summary = interval === 1 
          ? `Weekly on ${dayNames}`
          : `Every ${interval} weeks on ${dayNames}`;
      } else {
        summary = interval === 1 ? "Daily" : `Every ${interval} days`;
      }
      break;
  }

  // Add end condition
  if (endType === "on_date" && endDate) {
    const endDateObj = typeof endDate === "string" ? new Date(endDate) : endDate;
    summary += ` until ${format(endDateObj, "MMM d, yyyy")}`;
  } else if (endType === "after_count" && maxOccurrences) {
    summary += `, ${maxOccurrences} time${maxOccurrences > 1 ? "s" : ""}`;
  }

  return summary;
}

/**
 * Convert FrequencyConfig to database fields
 */
export function configToDbFields(config: FrequencyConfig) {
  return {
    frequency: config.frequency,
    recurrence_interval: config.interval || 1,
    recurrence_days_of_week: config.daysOfWeek || null,
    recurrence_day_of_month: config.monthlyType === "day_of_month" ? config.dayOfMonth : null,
    recurrence_week_of_month: config.monthlyType === "week_of_month" ? config.weekOfMonth : null,
    repeat_until: config.endType === "on_date" && config.endDate 
      ? (typeof config.endDate === "string" ? config.endDate : config.endDate.toISOString())
      : null,
    max_occurrences: config.endType === "after_count" ? config.maxOccurrences : null,
  };
}

/**
 * Convert database fields to FrequencyConfig
 */
export function dbFieldsToConfig(reminder: {
  frequency: string;
  recurrence_interval?: number | null;
  recurrence_days_of_week?: number[] | null;
  recurrence_day_of_month?: number | null;
  recurrence_week_of_month?: number | null;
  repeat_until?: string | null;
  max_occurrences?: number | null;
}): FrequencyConfig {
  const endType: EndType = reminder.repeat_until 
    ? "on_date" 
    : reminder.max_occurrences 
      ? "after_count" 
      : "never";

  const monthlyType: MonthlyType | undefined = 
    reminder.recurrence_week_of_month !== null && reminder.recurrence_week_of_month !== undefined
      ? "week_of_month"
      : reminder.recurrence_day_of_month !== null && reminder.recurrence_day_of_month !== undefined
        ? "day_of_month"
        : undefined;

  return {
    frequency: reminder.frequency as FrequencyType,
    interval: reminder.recurrence_interval || 1,
    daysOfWeek: reminder.recurrence_days_of_week || undefined,
    monthlyType,
    dayOfMonth: reminder.recurrence_day_of_month || undefined,
    weekOfMonth: reminder.recurrence_week_of_month || undefined,
    endType,
    endDate: reminder.repeat_until || undefined,
    maxOccurrences: reminder.max_occurrences || undefined,
  };
}

/**
 * Calculate the next occurrence of a reminder based on its recurrence config
 */
export function calculateNextOccurrence(currentDate: Date, config: FrequencyConfig): Date | null {
  const { frequency, interval = 1, daysOfWeek } = config;

  switch (frequency) {
    case "once":
      return null; // No next occurrence for one-time reminders

    case "daily":
      return addDays(currentDate, interval);

    case "weekly":
      return addWeeks(currentDate, interval);

    case "monthly":
      return addMonths(currentDate, interval);

    case "yearly":
      return addYears(currentDate, interval);

    case "weekdays": {
      let next = addDays(currentDate, 1);
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      return next;
    }

    case "weekends": {
      let next = addDays(currentDate, 1);
      while (getDay(next) !== 0 && getDay(next) !== 6) {
        next = addDays(next, 1);
      }
      return next;
    }

    case "custom": {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Find the next day in the week that matches
        const currentDayOfWeek = getDay(currentDate);
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
        
        // Find next day this week
        const nextDayThisWeek = sortedDays.find(d => d > currentDayOfWeek);
        
        if (nextDayThisWeek !== undefined) {
          return setDay(currentDate, nextDayThisWeek);
        } else {
          // Move to next interval and get the first day
          const nextWeek = addWeeks(currentDate, interval);
          return setDay(nextWeek, sortedDays[0], { weekStartsOn: 0 });
        }
      }
      return addDays(currentDate, interval);
    }

    default:
      return null;
  }
}

/**
 * Get the default FrequencyConfig for a given frequency type
 */
export function getDefaultConfig(frequency: FrequencyType, referenceDate: Date): FrequencyConfig {
  const dayOfWeek = getDay(referenceDate);
  const dayOfMonth = getDate(referenceDate);

  switch (frequency) {
    case "once":
      return { frequency: "once", endType: "never" };
    case "daily":
      return { frequency: "daily", interval: 1, endType: "never" };
    case "weekly":
      return { frequency: "weekly", interval: 1, daysOfWeek: [dayOfWeek], endType: "never" };
    case "monthly":
      return { frequency: "monthly", interval: 1, monthlyType: "day_of_month", dayOfMonth, endType: "never" };
    case "yearly":
      return { frequency: "yearly", interval: 1, endType: "never" };
    case "weekdays":
      return { frequency: "weekdays", daysOfWeek: [1, 2, 3, 4, 5], endType: "never" };
    case "weekends":
      return { frequency: "weekends", daysOfWeek: [0, 6], endType: "never" };
    case "custom":
      return { frequency: "custom", interval: 1, daysOfWeek: [dayOfWeek], endType: "never" };
    default:
      return { frequency: "once", endType: "never" };
  }
}
