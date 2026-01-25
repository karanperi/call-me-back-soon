
# Templates Feature: Medication Reminder

## Overview

Add a Notion-style template picker to the reminder creation flow, introducing a "Medication Reminder" template alongside the existing "Quick Reminder" form. The template picker will appear as a horizontal scrollable row of cards at the top of the Create Reminder dialog.

---

## Component Architecture

```text
CreateReminderDialog
   |
   +-- TemplatePicker (NEW - horizontal scrollable cards)
   |     +-- TemplateCard (Quick) [default selected]
   |     +-- TemplateCard (Medication)
   |     +-- TemplateCard (More Soon - disabled)
   |
   +-- [Conditional Form Rendering]
         |
         +-- QuickReminderForm (existing form, refactored)
         |     +-- Recipient Details (Name + Phone)
         |     +-- Schedule (Date, Time, Timezone, Frequency)
         |     +-- Message (Textarea)
         |     +-- Voice Selection
         |
         +-- MedicationReminderForm (NEW)
               +-- Recipient Details (Name + Phone)
               +-- Medication Details
               |     +-- Medication Name (required)
               |     +-- Dosage (optional)
               |     +-- Instructions Picker (dropdown)
               +-- Schedule
               |     +-- TimePresetPicker (Morning/Afternoon/Evening/Bedtime/Custom)
               |     +-- RepeatPicker (Daily/Twice daily/Three times daily/Weekly/Once)
               +-- Message Preview (auto-generated + editable)
               +-- Voice Selection
```

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/components/reminders/TemplatePicker.tsx` | Horizontal scrollable template selector with cards |
| `src/components/reminders/MedicationReminderForm.tsx` | Complete medication-specific form |
| `src/components/reminders/MessagePreview.tsx` | Auto-generated message display with edit functionality |
| `src/lib/medicationUtils.ts` | Message generation logic and instruction options |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/reminders/CreateReminderDialog.tsx` | Add TemplatePicker, conditional form rendering based on selected template |
| `src/hooks/useReminders.ts` | Add `useCreateMultipleReminders` hook for "Twice daily" / "Three times daily" |

---

## Detailed Implementation

### 1. TemplatePicker Component

A horizontal scrollable row styled like Notion's template chips:

```typescript
// Types
type TemplateType = "quick" | "medication" | "more";

interface Template {
  id: TemplateType;
  icon: string;   // Emoji or Lucide icon
  label: string;
  disabled?: boolean;
}

const TEMPLATES: Template[] = [
  { id: "quick", icon: "Pencil", label: "Quick" },
  { id: "medication", icon: "Pill", label: "Medication" },
  { id: "more", icon: "Plus", label: "More Soon", disabled: true },
];
```

UI Characteristics:
- Horizontal scroll with `overflow-x-auto` and `scrollbar-hide`
- Each card: ~80px width, icon above label, rounded corners
- Selected state: primary border + light primary background
- Disabled state: opacity-50, cursor-not-allowed
- Smooth transition when switching templates

### 2. MedicationReminderForm Component

A specialized form with structured inputs:

**Recipient Section** (reuses existing patterns):
- Recipient Name input with Contact Picker icon
- InternationalPhoneInput component

**Medication Details Section**:
- Medication Name (text input, required, max 100 chars)
- Dosage (text input, optional, max 50 chars)
- Instructions dropdown with options:
  | Key | Label | Text in Message |
  |-----|-------|-----------------|
  | none | None | (nothing added) |
  | with_food | With food | "Take with food." |
  | with_water | With water | "Take with a full glass of water." |
  | before_meal | Before meal | "Take before your meal." |
  | after_meal | After meal | "Take after your meal." |
  | empty_stomach | On empty stomach | "Take on an empty stomach." |
  | before_bed | Before bed | "Take before going to bed." |

**Schedule Section**:
- "When" dropdown (preset times):
  | Option | Time |
  |--------|------|
  | Morning | 9:00 AM |
  | Afternoon | 2:00 PM |
  | Evening | 6:00 PM |
  | Bedtime | 9:00 PM |
  | Custom | Opens time picker |

- "Repeat" dropdown:
  | Option | Behavior |
  |--------|----------|
  | Daily | Single daily reminder |
  | Twice daily | Creates 2 reminders (9 AM + 6 PM) |
  | Three times daily | Creates 3 reminders (9 AM + 2 PM + 6 PM) |
  | Weekly | Once per week |
  | Just once | One-time reminder |

  Note: "Twice daily" and "Three times daily" hide the "When" selector and show info text about the preset times.

**Message Preview Section**:
- Shows auto-generated message in a styled card (bg-secondary/30)
- Updates in real-time as form fields change
- "Edit" button transforms preview to editable textarea
- "Reset to auto" link reverts to auto-generated message
- Once manually edited, auto-generation stops until reset

**Voice Section**:
- Reuses existing voice selection UI (two cards: Friendly Female / Friendly Male)

### 3. Message Generation Logic

```typescript
// src/lib/medicationUtils.ts

export function generateMedicationMessage(
  recipientName: string,
  medicationName: string,
  dosage: string | undefined,
  instruction: InstructionKey
): string {
  let message = `Hello ${recipientName}. This is your medication reminder. It's time to take your ${medicationName}`;
  
  if (dosage?.trim()) {
    message += ` - ${dosage.trim()}`;
  }
  
  message += '.';
  
  if (instruction !== 'none') {
    message += ` ${INSTRUCTION_TEXTS[instruction]}`;
  }
  
  message += ' Take care!';
  
  return message;
}
```

### 4. Multiple Reminder Creation

For "Twice daily" and "Three times daily" options, create multiple separate reminder records:

```typescript
// useReminders.ts - new hook
export const useCreateMultipleReminders = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (reminders: Omit<ReminderInsert, "user_id">[]) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("reminders")
        .insert(reminders.map(r => ({ ...r, user_id: user.id })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
};
```

Schedule logic:
- Twice daily: 9:00 AM + 6:00 PM (same date, daily frequency)
- Three times daily: 9:00 AM + 2:00 PM + 6:00 PM (same date, daily frequency)

### 5. CreateReminderDialog Updates

```typescript
// Add template state
const [selectedTemplate, setSelectedTemplate] = useState<"quick" | "medication">("quick");

// In JSX, add TemplatePicker after DialogHeader
<TemplatePicker 
  selected={selectedTemplate}
  onSelect={setSelectedTemplate}
/>

// Conditional form rendering
{selectedTemplate === "quick" ? (
  // Existing form code (unchanged)
) : (
  <MedicationReminderForm
    onSubmit={handleMedicationSubmit}
    isPending={createReminder.isPending || createMultiple.isPending}
  />
)}
```

---

## UI Design Details

### Template Cards

```
Mobile Width: Full width horizontal scroll
Card Size: min-w-[100px] p-3
Border Radius: rounded-xl
Selected: border-2 border-primary bg-primary/5
Unselected: border border-border
Disabled: opacity-50 pointer-events-none
Icon Size: h-5 w-5 or text-xl for emoji
Label: text-sm font-medium
```

### Visual Styling

Template Picker section:
```css
.template-picker {
  /* Horizontal scroll without visible scrollbar */
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.template-picker::-webkit-scrollbar {
  display: none;
}
```

Message Preview card:
```css
.message-preview {
  background: var(--secondary) / 0.3;
  border-radius: 0.75rem;
  padding: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
```

---

## Form Validation Rules

| Field | Validation |
|-------|------------|
| Recipient Name | Required, 2-100 characters |
| Phone Number | Required, valid E.164 format |
| Medication Name | Required, 1-100 characters |
| Dosage | Optional, max 50 characters |
| Instructions | Optional (defaults to "None") |
| When | Required (unless Twice/Three times daily) |
| Repeat | Required |
| Voice | Required |

Error Messages:
- "Please enter the medication name"
- "Please select when to send the reminder" (for daily/weekly/once options)
- Standard validation messages for name/phone

---

## Success Flow

1. User fills out medication form
2. Clicks "Create Reminder"
3. Backend creates 1-3 reminder records (based on frequency)
4. Dialog closes
5. Success toast appears:
   - Single: "Medication reminder created"
   - Multiple: "2 medication reminders created" or "3 medication reminders created"
6. Home screen refreshes with new reminder(s)

---

## Database Considerations

No schema changes required. The existing `reminders` table supports all needed fields:
- `message`: Auto-generated or user-edited message
- `scheduled_at`: Scheduled time
- `frequency`: "daily", "weekly", or "once"
- `voice`: Selected voice

Optional future enhancement: Add `template_type` column for analytics tracking.

---

## Technical Notes

1. **Template State**: Selected template is reset when dialog closes to default ("quick")

2. **Form State Isolation**: Quick and Medication forms maintain separate state - switching templates doesn't carry over values

3. **Reusable Components**: Voice selection UI can be extracted to a shared `VoiceSelector` component for DRY code

4. **Mobile UX**: 
   - Template cards are touch-friendly with adequate tap targets
   - Horizontal scroll works smoothly on mobile
   - Form sections maintain existing safe-area and responsive patterns

5. **Icons**: Use Lucide icons (Pencil for Quick, Pill for Medication, Plus for More Soon)

---

## File Structure After Implementation

```
src/components/reminders/
  +-- CreateReminderDialog.tsx (modified)
  +-- EditReminderDialog.tsx (unchanged)
  +-- TemplatePicker.tsx (new)
  +-- MedicationReminderForm.tsx (new)
  +-- MessagePreview.tsx (new)
  +-- FrequencyPicker.tsx (unchanged)
  +-- CustomFrequencyDialog.tsx (unchanged)
  +-- TestCallConfirmation.tsx (unchanged)

src/lib/
  +-- medicationUtils.ts (new)
  +-- recurrenceUtils.ts (unchanged)
  +-- ...

src/hooks/
  +-- useReminders.ts (modified - add useCreateMultipleReminders)
  +-- ...
```
