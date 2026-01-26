
# Fix: Form Content Alignment Issues

## Problem

The form content in both the Template Picker and Medication Reminder Form is shifted/leaning to the right side, making all input fields misaligned.

## Root Cause

Two issues are combining to cause the misalignment:

1. **Double padding in TemplatePicker**: The outer wrapper has `px-4` padding, and the inner scrollable container also has `px-4`, creating asymmetric spacing
2. **Negative margins in sticky button**: The `MedicationReminderForm` uses `-mx-4` negative margins on the sticky button, which when combined with `overflow-x-hidden` creates layout shifts

---

## Solution

### Change 1: TemplatePicker.tsx

Remove the extra `px-4` from the inner scrollable div and simplify by removing the gradient fade overlays:

**Current (lines 45-46):**
```tsx
<div 
  className="flex gap-2 overflow-x-auto px-4"
```

**Fixed:**
```tsx
<div 
  className="flex gap-2 overflow-x-auto"
```

Also remove the fade gradient divs (lines 41-42 and 79-80) as they contribute to the alignment issues.

### Change 2: MedicationReminderForm.tsx

Replace the negative margin approach with a cleaner sticky implementation:

**Current (line 409):**
```tsx
<div className="sticky bottom-0 left-0 right-0 p-4 -mx-4 -mb-4 bg-background border-t border-border">
```

**Fixed:**
```tsx
<div className="sticky bottom-0 left-0 right-0 pt-4 pb-4 bg-background border-t border-border">
```

This removes the negative margins that cause the overflow-related layout shift while maintaining the sticky behavior and visual separation.

---

## Summary of Changes

| File | Issue | Fix |
|------|-------|-----|
| TemplatePicker.tsx | Double `px-4` padding | Remove inner `px-4`, remove gradient fades |
| MedicationReminderForm.tsx | Negative margins `-mx-4 -mb-4` | Replace with standard `pt-4 pb-4` padding |

## Expected Result

- All form fields will be properly centered and aligned within the dialog
- Template pills carousel remains horizontally scrollable
- Sticky button works correctly without layout shifts
- No horizontal scrolling on the overall page
