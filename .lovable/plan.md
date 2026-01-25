

# Enhanced Frequency Feature (Google Calendar Style)

## Overview

Transform the simple Once/Daily/Weekly pill buttons into a Google Calendar-inspired recurrence picker with preset options (including weekdays/weekends) and a full custom frequency dialog.

---

## UI Options Available

### Quick Presets (Dropdown/Select)

| Option | Description | Stored as |
|--------|-------------|-----------|
| Does not repeat | One-time reminder | `once` |
| Daily | Every day | `daily` |
| Weekly on [Day] | Same day each week (dynamic based on selected date) | `weekly` |
| Monthly on the [Nth] | Same date each month | `monthly` |
| Annually on [Date] | Once per year | `yearly` |
| Every weekday (Mon-Fri) | Business days only | `weekdays` |
| Every weekend (Sat-Sun) | Weekends only | `weekends` |
| Custom... | Opens custom dialog | `custom` |

### Custom Frequency Dialog

When "Custom..." is selected, a nested dialog opens with:

**1. Repeat Interval**
- "Repeat every [number input] [unit dropdown]"
- Units: days, weeks, months, years

**2. Weekly Day Selection** (shown only when unit = weeks)
- Checkbox row: S M T W T F S
- Multiple days can be selected
- Quick-select buttons: "Weekdays" | "Weekends" | "Clear"

**3. Monthly Options** (shown only when unit = months)
- "On day [number]" (e.g., 15th of each month)
- "On the [first/second/third/fourth/last] [weekday]" (e.g., first Monday)

**4. End Condition**
- Never (default)
- On specific date (date picker)
- After [X] occurrences

---

## Database Schema Changes

Add new columns to the `reminders` table:

```sql
ALTER TABLE reminders
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_days_of_week integer[] DEFAULT NULL,
ADD COLUMN recurrence_day_of_month integer DEFAULT NULL,
ADD COLUMN recurrence_week_of_month integer DEFAULT NULL,
ADD COLUMN max_occurrences integer DEFAULT NULL;
```

| Column | Type | Purpose |
|--------|------|---------|
| `recurrence_interval` | integer | Every X units (e.g., every 2 weeks) |
| `recurrence_days_of_week` | integer[] | Days for weekly (0=Sun, 1=Mon, ..., 6=Sat) |
| `recurrence_day_of_month` | integer | For monthly: specific day (1-31) |
| `recurrence_week_of_month` | integer | For monthly: week ordinal (1-4, -1=last) |
| `max_occurrences` | integer | End after X occurrences |

**Updated frequency values:**
- `once` - One-time
- `daily` - Every day
- `weekly` - Same day each week
- `monthly` - Same date each month
- `yearly` - Once per year
- `weekdays` - Monday through Friday
- `weekends` - Saturday and Sunday
- `custom` - Uses recurrence columns

---

## Component Architecture

```text
CreateReminderDialog / EditReminderDialog
   |
   +-- FrequencyPicker
         |
         +-- Select (Presets dropdown)
         |     |-- Does not repeat
         |     |-- Daily
         |     |-- Weekly on [Tuesday]
         |     |-- Monthly on the 25th
         |     |-- Annually on Jan 25
         |     |-- Every weekday (Mon-Fri)
         |     |-- Every weekend (Sat-Sun)
         |     +-- Custom...
         |
         +-- CustomFrequencyDialog (modal)
               |
               +-- Interval Input + Unit Select
               +-- Day of Week Selection (with Weekdays/Weekends shortcuts)
               +-- Monthly Options (conditional)
               +-- End Condition Radio Group
```

---

## UI Mockups

### Frequency Picker (Collapsed)
```text
+------------------------------------------+
| Frequency                                |
| [v] Weekly on Tuesday                    |
+------------------------------------------+
```

### Frequency Picker (Dropdown Open)
```text
+------------------------------------------+
| Does not repeat                          |
| Daily                                    |
| Weekly on Tuesday                    [*] |
| Monthly on the 25th                      |
| Annually on Jan 25                       |
|------------------------------------------|
| Every weekday (Mon-Fri)                  |
| Every weekend (Sat-Sun)                  |
|------------------------------------------|
| Custom...                                |
+------------------------------------------+
```

### Custom Frequency Dialog
```text
+------------------------------------------+
|           Custom Recurrence              |
+------------------------------------------+
| Repeat every [ 1 ] [ weeks  v]           |
|                                          |
| Repeat on                                |
| [Weekdays] [Weekends] [Clear]            |
|                                          |
| [ S ] [ M ] [ T ] [ W ] [ T ] [ F ] [ S ]|
|   o    [*]   [*]   [*]   [*]   [*]    o  |
|                                          |
| Ends                                     |
| (*) Never                                |
| ( ) On  [Pick a date...]                 |
| ( ) After [ 10 ] occurrences             |
|                                          |
|                    [Cancel]  [Done]      |
+------------------------------------------+
```

---

## Technical Implementation

### 1. New Component: FrequencyPicker

**File:** `src/components/reminders/FrequencyPicker.tsx`

```typescript
interface FrequencyPickerProps {
  referenceDate: Date;  // To generate dynamic labels
  value: FrequencyConfig;
  onChange: (config: FrequencyConfig) => void;
}

interface FrequencyConfig {
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly" | "weekdays" | "weekends" | "custom";
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  endType?: "never" | "on_date" | "after_count";
  endDate?: Date;
  maxOccurrences?: number;
}
```

Features:
- Dynamic preset labels based on reference date
- Human-readable summary display
- Opens CustomFrequencyDialog when "Custom" selected

### 2. New Component: CustomFrequencyDialog

**File:** `src/components/reminders/CustomFrequencyDialog.tsx`

Contains:
- Interval number input (1-99) + unit dropdown (days/weeks/months/years)
- Day-of-week toggle buttons with quick-select (Weekdays/Weekends/Clear)
- Monthly options radio (by day number or by week position)
- End condition radio group with date picker and occurrence counter

### 3. New Utility: recurrenceUtils

**File:** `src/lib/recurrenceUtils.ts`

Helper functions:
- `getRecurrenceSummary(config, referenceDate)` - Human-readable text (e.g., "Every 2 weeks on Mon, Wed, Fri until Dec 31")
- `calculateNextOccurrence(currentDate, config)` - Compute next scheduled date
- `getPresetLabel(preset, referenceDate)` - Dynamic preset labels
- `configToDbFields(config)` - Convert UI config to database columns
- `dbFieldsToConfig(reminder)` - Convert database row to UI config

### 4. Update CreateReminderDialog

**File:** `src/components/reminders/CreateReminderDialog.tsx`

Changes:
- Replace pill buttons with `<FrequencyPicker />`
- Update state from simple `frequency` string to `FrequencyConfig` object
- Update form submission to include new recurrence fields

### 5. Update EditReminderDialog

**File:** `src/components/reminders/EditReminderDialog.tsx`

Changes:
- Replace pill buttons with `<FrequencyPicker />`
- Load existing recurrence settings from reminder using `dbFieldsToConfig()`
- Update form submission to include new recurrence fields

### 6. Update check-reminders Edge Function

**File:** `supabase/functions/check-reminders/index.ts`

Enhance recurring logic to handle:
- Custom intervals (every X days/weeks/months/years)
- Specific days of week (including weekdays/weekends shortcuts)
- Monthly by day number or by week position
- `max_occurrences` tracking alongside `repeat_until`

Example next occurrence calculation:
```typescript
function calculateNextSchedule(reminder) {
  const current = new Date(reminder.scheduled_at);
  const interval = reminder.recurrence_interval || 1;
  
  switch (reminder.frequency) {
    case "daily":
      return addDays(current, interval);
    case "weekly":
      return addWeeks(current, interval);
    case "weekdays":
      return getNextWeekday(current);
    case "weekends":
      return getNextWeekend(current);
    case "monthly":
      // Handle by day or by week position
      break;
    case "custom":
      // Use recurrence_days_of_week to find next valid day
      break;
  }
}
```

---

## File Changes Summary

| File | Change |
|------|--------|
| Database Migration | Add recurrence columns to reminders table |
| `src/components/reminders/FrequencyPicker.tsx` | New - preset dropdown with dynamic labels |
| `src/components/reminders/CustomFrequencyDialog.tsx` | New - full custom config modal |
| `src/lib/recurrenceUtils.ts` | New - helper functions |
| `src/components/reminders/CreateReminderDialog.tsx` | Replace pills with FrequencyPicker |
| `src/components/reminders/EditReminderDialog.tsx` | Replace pills with FrequencyPicker |
| `supabase/functions/check-reminders/index.ts` | Enhanced recurrence calculation |

---

## Technical Notes

1. **Backward Compatibility**: Existing reminders with `frequency: "daily"` or `"weekly"` will continue to work. The edge function handles them with default interval of 1 and no custom days.

2. **Dynamic Preset Labels**: Labels adapt to the selected date:
   - If Tuesday is selected: "Weekly on Tuesday"
   - If 25th is selected: "Monthly on the 25th"
   - If Jan 25 is selected: "Annually on January 25"

3. **Weekdays/Weekends Shortcuts**: Both available as presets AND as quick-select buttons in the custom dialog for selecting multiple days quickly.

4. **Validation Rules**:
   - Custom weekly requires at least one day selected
   - Interval must be between 1-99
   - End date must be in the future
   - Max occurrences must be at least 1

5. **Mobile UX**: Custom dialog will be scrollable with large tap targets for day checkboxes.

