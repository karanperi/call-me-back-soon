
# Fix: International Phone Number Validation in Backend

## Problem

The `make-call` edge function rejects all non-UK phone numbers due to a hardcoded UK-only regex validation, despite the frontend supporting international numbers.

**Error message**: "Invalid UK phone number format. Expected: +447XXXXXXXXX"

## Root Cause

```typescript
// Lines 21 and 155-164 in make-call/index.ts
const UK_PHONE_REGEX = /^\+447\d{9}$/;  // Only accepts UK mobile numbers

if (!UK_PHONE_REGEX.test(phoneNumber)) {
  // Rejects ALL non-UK numbers including India (+91...)
}
```

---

## Solution

Replace the UK-only regex with a general E.164 international phone number validation that:
1. Accepts any valid E.164 format (`+` followed by 7-15 digits)
2. Validates the number starts with a proper country code
3. Relies on the frontend's comprehensive `libphonenumber-js` validation for country-specific rules

---

## Changes Required

### File: `supabase/functions/make-call/index.ts`

#### Change 1: Update validation constant (line 21)

**Current:**
```typescript
const UK_PHONE_REGEX = /^\+447\d{9}$/;
```

**New:**
```typescript
// E.164 format: + followed by 7-15 digits (covers all international numbers)
const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
```

#### Change 2: Update validation logic (lines 155-164)

**Current:**
```typescript
// Input validation - Phone number format (UK)
if (!UK_PHONE_REGEX.test(phoneNumber)) {
  await updateHistoryStatus("failed", "Invalid UK phone number format. Expected: +447XXXXXXXXX");
  return new Response(
    JSON.stringify({ error: "Invalid UK phone number format. Expected: +447XXXXXXXXX" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**New:**
```typescript
// Input validation - Phone number format (E.164 international)
if (!E164_PHONE_REGEX.test(phoneNumber)) {
  await updateHistoryStatus("failed", "Invalid phone number format. Expected international format: +[country code][number]");
  return new Response(
    JSON.stringify({ error: "Invalid phone number format. Expected international format: +[country code][number]" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## E.164 Format Explained

The E.164 standard defines the international phone number format:
- Starts with `+`
- Followed by country code (1-3 digits, cannot start with 0)
- Followed by subscriber number
- Total length: 7-15 digits (excluding the `+`)

**Examples:**
| Country | Number | E.164 Format |
|---------|--------|--------------|
| UK | 07700 900123 | +447700900123 |
| India | 98765 43210 | +919876543210 |
| USA | (555) 123-4567 | +15551234567 |
| Germany | 0170 1234567 | +491701234567 |

---

## Why This Is Safe

1. **Frontend already validates thoroughly**: The `libphonenumber-js` library on the frontend ensures only valid phone numbers for specific countries are accepted before reaching the backend

2. **E.164 is the universal standard**: This is what Twilio expects and what we're already storing in the database

3. **Backend still validates format**: We still reject malformed input - just not country-specific patterns

4. **Twilio handles invalid numbers**: If somehow an invalid number gets through, Twilio will return an error which we already handle

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Regex | `^\+447\d{9}$` | `^\+[1-9]\d{6,14}$` |
| UK numbers | ✅ Accepted | ✅ Accepted |
| India numbers | ❌ Rejected | ✅ Accepted |
| All other countries | ❌ Rejected | ✅ Accepted |
| Error message | "Invalid UK phone number..." | "Invalid phone number format..." |
