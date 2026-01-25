
# Fix: Contact Selection Not Populating Phone Number

## Problem Identified

The `InternationalPhoneInput` component has a bug in its `useEffect` hook that initializes the local number from the `value` prop. The effect has an **empty dependency array** (`[]`), meaning it only runs once when the component mounts.

**Current Code (lines 63-77 in `InternationalPhoneInput.tsx`):**
```javascript
useEffect(() => {
  if (value && value.startsWith("+")) {
    const parsed = parseInternationalNumber(value);
    if (parsed) {
      const country = getCountryByCode(parsed.countryCode);
      if (country) {
        setSelectedCountry(country);
        setLocalNumber(parsed.nationalNumber);
        const validation = validatePhoneNumber(parsed.nationalNumber, parsed.countryCode);
        setIsValid(validation.isValid);
      }
    }
  }
}, []); // <-- Empty dependency array is the bug!
```

**What happens:**
1. User opens the Create Reminder dialog (component mounts with empty `value`)
2. User clicks contact picker and selects "Bhavana"
3. Parent component calls `setPhoneNumber("+447723785463")`
4. The `value` prop updates, but the `useEffect` doesn't re-run
5. The input field stays empty despite the parent state being updated

---

## Solution

Update the `useEffect` to watch for changes to the `value` prop. We also need to add logic to avoid overwriting user-typed input when the value is updated programmatically.

**File to Modify:** `src/components/phone/InternationalPhoneInput.tsx`

---

## Technical Changes

### Change 1: Update the useEffect Dependency Array

Add `value` to the dependency array and add a guard to prevent infinite loops by checking if the new value differs from what we already have.

**Updated Code:**
```javascript
// Initialize/update local number from value prop
useEffect(() => {
  if (value && value.startsWith("+")) {
    const parsed = parseInternationalNumber(value);
    if (parsed) {
      const country = getCountryByCode(parsed.countryCode);
      if (country) {
        // Only update if the value actually changed from external source
        const currentValidation = validatePhoneNumber(localNumber, selectedCountry.code as CountryCode);
        const currentE164 = currentValidation.e164;
        
        // Avoid updating if we already have this value (prevents loops)
        if (value !== currentE164) {
          setSelectedCountry(country);
          setLocalNumber(parsed.nationalNumber);
          const validation = validatePhoneNumber(parsed.nationalNumber, parsed.countryCode);
          setIsValid(validation.isValid);
          // Notify parent that we've processed the value
          if (validation.isValid && validation.e164) {
            // Value is already valid, no need to call onChange
          }
        }
      }
    }
  } else if (value === "" && localNumber !== "") {
    // Handle reset case (when form is cleared)
    setLocalNumber("");
    setIsValid(false);
    setValidationError(undefined);
  }
}, [value]);
```

### Change 2: Handle Empty Value Reset

When the parent resets the form (sets `phoneNumber` to `""`), the component should clear its local state.

---

## Why This Fix Works

1. **Watches for value changes**: Adding `value` to the dependency array ensures the effect runs whenever the parent updates the phone number
2. **Prevents infinite loops**: By comparing the incoming `value` with the current E.164 output, we avoid re-processing values we just set ourselves
3. **Handles form reset**: When `value` becomes empty (form reset), the local state is cleared

---

## Testing Scenarios

After implementation, verify these scenarios work:

1. **Select contact in Create Reminder** - phone field should populate with formatted number
2. **Select different contact** - phone field should update to new number
3. **Create new reminder and cancel** - form should reset properly when reopened
4. **Paste international number** - should still work as before
5. **Type number manually** - should still work as before
6. **Edit existing reminder** - should still load the existing phone number

---

## Summary

| File | Change |
|------|--------|
| `src/components/phone/InternationalPhoneInput.tsx` | Add `value` to useEffect dependencies and add guards against infinite loops |
