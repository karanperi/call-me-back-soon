

# Multi-Medication Reminder Feature Implementation Plan

## Overview

This plan implements a multi-medication reminder feature with a minimal, clutter-free UI using progressive disclosure. The interface starts simple (identical to current single-medication form) and reveals complexity only when the user explicitly requests it through a "+ Add another medication" link.

## Architecture

The implementation follows an accordion pattern where:
- Initial view looks exactly like the current single-medication form
- A subtle "+ Add another medication" link is always visible below the form
- Completed medications collapse into compact chips
- Only one medication can be expanded for editing at a time

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/medicationUtils.ts` | Modify | Add interfaces, constants, and message generation for multi-medication |
| `src/components/reminders/MedicationChip.tsx` | Create | Compact pill showing collapsed medication summary |
| `src/components/reminders/MedicationExpandedForm.tsx` | Create | Full form fields for entering/editing a medication |
| `src/components/reminders/MedicationList.tsx` | Create | Orchestrator component managing accordion behavior |
| `src/components/reminders/MedicationReminderForm.tsx` | Modify | Replace single medication fields with MedicationList component |
| `src/components/reminders/MessagePreview.tsx` | Modify | Add optional medication count hint for 3+ medications |

---

## Technical Details

### 1. Data Model Extensions (`medicationUtils.ts`)

**New interfaces:**
```text
MedicationEntry {
  id: string
  name: string
  quantity?: number
  unit?: 'tablet' | 'capsule' | 'ml' | 'drops' | 'puff' | 'unit'
  dosage?: string (legacy field for backwards compatibility)
  instruction: InstructionKey
}
```

**New constants:**
```text
DOSAGE_UNITS = [
  { key: 'tablet', singular: 'tablet', plural: 'tablets' },
  { key: 'capsule', singular: 'capsule', plural: 'capsules' },
  { key: 'ml', singular: 'ml', plural: 'ml' },
  { key: 'drops', singular: 'drop', plural: 'drops' },
  { key: 'puff', singular: 'puff', plural: 'puffs' },
  { key: 'unit', singular: 'unit', plural: 'units' },
]
```

**New functions:**
- `formatMedicationDosage(quantity, unit)` - Returns properly pluralized dosage string (e.g., "2 tablets")
- `generateMultiMedicationMessage(recipientName, medications[])` - Smart message generation based on medication count

**Message generation strategy:**
- 1 medication: Full detail (current format)
- 2 medications: Both medications with dosages in parentheses
- 3-4 medications: Comma-separated list with dosages
- 5+ medications: Summary count only for brevity

### 2. MedicationChip Component (New)

**Purpose:** Compact, pill-shaped summary of a completed medication in collapsed state.

**Visual design:**
- Small rounded pill with `bg-secondary/80 rounded-full px-3 py-1.5`
- Display format: "Metformin · 2 tablets · with food" using middle dots as separators
- Small Pencil icon on left, subtle X button on right
- Hover state: `hover:bg-secondary` with slight elevation

**Props:**
```text
medication: MedicationEntry
onExpand: () => void
onRemove: () => void
```

**Display logic:**
- Always show medication name
- If quantity + unit exist: show "· [quantity] [unit]"
- Else if dosage exists: show "· [dosage]"
- If instruction is not "none": show "· [instruction label]"

### 3. MedicationExpandedForm Component (New)

**Purpose:** Expanded state for entering/editing a medication with full form fields.

**Visual design:**
- Light background with `bg-secondary/30 rounded-lg p-4`
- Subtle left border accent: `border-l-2 border-primary/50`
- Fields stack vertically with `space-y-3`

**Form fields:**
1. **Medication Name** (required) - Full width input
2. **Quantity & Unit** (optional) - Side-by-side layout (1/3 + 2/3 width)
   - Quantity: Number input, placeholder "e.g. 2"
   - Unit: Select dropdown with DOSAGE_UNITS options
3. **Instructions** (optional) - Full width select using existing INSTRUCTION_OPTIONS

**Footer behavior:**
- If only medication (no chips above): No footer needed
- If other medications exist: Show subtle "Done" text button aligned right

**Props:**
```text
medication: MedicationEntry
onChange: (updates: Partial<MedicationEntry>) => void
onCollapse?: () => void  // Only when multiple medications
onRemove?: () => void    // Only when multiple medications
isOnlyMedication: boolean
```

### 4. MedicationList Component (New)

**Purpose:** Orchestrator component managing accordion behavior and progressive disclosure.

**State management:**
```text
medications: MedicationEntry[]
expandedId: string | null
```

**Rendering logic:**
```text
IF only 1 medication exists:
  - Render MedicationExpandedForm (always expanded, no collapse option)
  - Show "+ Add another medication" link below

ELSE IF multiple medications exist:
  - FOR each medication:
    - IF medication.id === expandedId:
      - Render MedicationExpandedForm (with collapse/remove options)
    - ELSE:
      - Render MedicationChip (clickable to expand)
  - Show "+ Add another medication" link at bottom
```

**Key change from original spec:** The "+ Add another medication" link is **always visible**, regardless of whether the first medication has a name entered. Users can click it when ready or simply ignore it.

**Behaviors:**
- Clicking a chip sets expandedId to that medication (auto-collapses current)
- Clicking "Done" or adding new medication collapses current
- Adding new: Create entry, set as expanded
- Removing: If expanded, expand previous/first one

**"+ Add another medication" link styling:**
- `text-sm text-primary hover:text-primary/80 font-medium`
- Small Plus icon from lucide-react
- Position: Below form/chips with `mt-3`
- **Always visible** - no conditional display based on medication name

**Props:**
```text
medications: MedicationEntry[]
onChange: (medications: MedicationEntry[]) => void
```

### 5. MedicationReminderForm Modifications

**State changes:**
```text
// Remove:
medicationName, dosage, instruction individual states

// Add:
medications: MedicationEntry[] = [{ id: crypto.randomUUID(), name: '', instruction: 'none' }]
```

**Component replacement:**
Replace the "Medication Details" section content with:
```text
<MedicationList
  medications={medications}
  onChange={setMedications}
/>
```

**Auto-generated message update:**
```text
const autoGeneratedMessage = useMemo(() => {
  const validMedications = medications.filter(m => m.name.trim());
  return generateMultiMedicationMessage(recipientName, validMedications);
}, [recipientName, medications]);
```

**Validation update:**
```text
const validMedications = medications.filter(m => m.name.trim());
if (validMedications.length === 0) {
  toast({ title: "Please enter at least one medication name", variant: "destructive" });
  return;
}
```

### 6. MessagePreview Enhancement

**New optional prop:** `medicationCount?: number`

**Subtle hint for 3+ medications:**
```text
{medicationCount >= 3 && (
  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
    <Info className="h-3 w-3" />
    {medicationCount >= 5 
      ? "Summary message for brevity" 
      : "Dosages included, instructions summarized"}
  </p>
)}
```

---

## Visual Design Principles Followed

1. **Minimal by Default**: Initial form looks exactly like current single-medication form
2. **Always Available**: "+ Add another medication" link is always visible (not conditional)
3. **Compact Chips**: Small, unobtrusive pills with horizontal flow that wraps
4. **Clean Transitions**: Use `animate-in fade-in` for smooth expand/collapse
5. **Single Focus**: Only one medication expanded at a time
6. **No Numbering**: No "#1", "#2" labels - chips are self-explanatory
7. **No Confirmation**: Direct removal without confirmation dialog

---

## Implementation Order

1. **Phase 1: Data Layer**
   - Add MedicationEntry interface and DOSAGE_UNITS to medicationUtils.ts
   - Add formatMedicationDosage helper function
   - Add generateMultiMedicationMessage function

2. **Phase 2: UI Components**
   - Create MedicationChip.tsx
   - Create MedicationExpandedForm.tsx
   - Create MedicationList.tsx

3. **Phase 3: Integration**
   - Update MedicationReminderForm.tsx to use new components
   - Update MessagePreview.tsx with medication count hint

---

## What Will NOT Change

- Contact picker functionality
- Phone number input and validation
- Schedule section (date, repeat, time presets)
- Voice selection
- Message preview editing capability
- Sticky submit button behavior
- All existing styling and animations

