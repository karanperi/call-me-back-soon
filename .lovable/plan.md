
# Fix: Phone Number Validation State Not Syncing to Parent

## Problem Identified

When a contact is selected from the contact picker, the `InternationalPhoneInput` component correctly parses and validates the phone number internally, but it **never notifies the parent component** that the phone number is valid.

**The bug is in the `useEffect` hook (lines 63-90) of `InternationalPhoneInput.tsx`:**

```javascript
// This code sets internal state...
setIsValid(validation.isValid);
setValidationError(validation.isValid ? undefined : validation.error);
// ...but never calls onChange() to tell the parent!
```

**Result:**
- Component's internal `isValid` = `true` (cost estimate shows)
- Parent's `isPhoneValid` = `false` (never updated)
- Form submission fails validation

---

## Solution

Add an `onChange` call in the `useEffect` to sync the validation state with the parent component when a contact is selected.

**File to Modify:** `src/components/phone/InternationalPhoneInput.tsx`

**Change:** After validating the incoming phone number in the `useEffect`, call `onChange` with the E.164 value and validity status.

---

## Technical Details

### Current Code (lines 74-81)

```javascript
if (value !== currentE164) {
  setSelectedCountry(country);
  setLocalNumber(parsed.nationalNumber);
  const validation = validatePhoneNumber(parsed.nationalNumber, parsed.countryCode);
  setIsValid(validation.isValid);
  setValidationError(validation.isValid ? undefined : validation.error);
}
```

### Updated Code

```javascript
if (value !== currentE164) {
  setSelectedCountry(country);
  setLocalNumber(parsed.nationalNumber);
  const validation = validatePhoneNumber(parsed.nationalNumber, parsed.countryCode);
  setIsValid(validation.isValid);
  setValidationError(validation.isValid ? undefined : validation.error);
  
  // Notify parent of the validated value
  if (validation.isValid && validation.e164) {
    onChange(validation.e164, true);
  }
}
```

---

## Why This Fixes the Issue

1. When a contact is selected, the parent sets `phoneNumber` to the E.164 value
2. The `useEffect` detects the value change and parses it
3. After validation, it now calls `onChange(e164, true)` 
4. The parent's `handlePhoneChange` updates `isPhoneValid` to `true`
5. Form submission validation passes

---

## Testing

After the fix, verify:
1. Select a contact - phone should populate AND form should submit successfully
2. Select different contacts - should work each time
3. Manual entry - should still work as before
4. Paste international number - should still work as before
