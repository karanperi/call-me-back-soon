
# International Phone Support Implementation Plan

## Overview

This plan adds support for phone numbers from all countries that Twilio supports, including a country picker, validation using `libphonenumber-js`, estimated call cost display, and smart paste detection.

---

## New Files to Create

### 1. Country Data Configuration
**File:** `src/config/countries.ts`

Contains:
- Complete list of ~200+ countries with ISO codes, names, dial codes, and flag emojis
- Popular countries array for quick access at the top of the picker
- Helper functions for country lookup

### 2. Twilio Pricing Configuration  
**File:** `src/config/twilioCallPricing.ts`

Contains:
- Pricing data for common countries (mobile/landline rates in USD)
- `getEstimatedCallCost()` function to calculate cost per minute
- Default fallback rate for unlisted countries

### 3. Phone Validation Utilities
**File:** `src/lib/phoneUtils.ts`

Contains:
- `validatePhoneNumber(number, countryCode)` - validates and formats using libphonenumber-js
- `detectCountryFromNumber(number)` - auto-detects country from pasted E.164 numbers
- `formatPhoneForDisplay(e164Number)` - formats stored numbers for display
- `getLastSelectedCountry()` / `saveLastSelectedCountry()` - localStorage helpers

### 4. Country Picker Component
**File:** `src/components/phone/CountryPicker.tsx`

A searchable modal/popover showing:
- Search input at the top
- "Popular" section with 7 common countries
- "All Countries" section with alphabetical list
- Each row: Flag | Country Name | +Code

### 5. International Phone Input Component
**File:** `src/components/phone/InternationalPhoneInput.tsx`

A reusable component featuring:
- Country selector button (flag + dial code + chevron)
- Phone number input field (local part only)
- Real-time validation with error display
- Smart paste detection for full international numbers
- Optional cost estimate display below input

### 6. Call Cost Estimate Component
**File:** `src/components/phone/CallCostEstimate.tsx`

A small text component showing:
- "Estimated cost: ~$X.XX/min to [Country]"
- Only visible when a valid number is entered

### 7. Test Call Confirmation Dialog
**File:** `src/components/reminders/TestCallConfirmation.tsx`

A confirmation dialog before "Test Call Now" showing:
- Recipient name and formatted phone number
- Country name
- Estimated cost per minute
- Voice selection
- Cancel/Call Now buttons

---

## Files to Modify

### 1. `src/components/reminders/CreateReminderDialog.tsx`

Changes:
- Replace `<Input type="tel">` with `<InternationalPhoneInput>`
- Remove UK-specific phone regex validation (now handled by component)
- Add `<CallCostEstimate>` below phone input
- Update form submission to use E.164 format from component

### 2. `src/components/reminders/EditReminderDialog.tsx`

Changes:
- Replace phone input with `<InternationalPhoneInput>`
- Remove UK-specific validation
- Add `<CallCostEstimate>` display
- Add `<TestCallConfirmation>` dialog before calling
- Parse existing E.164 number to detect country and local number

### 3. `src/components/contacts/ContactForm.tsx`

Changes:
- Replace phone input with `<InternationalPhoneInput>`
- Remove UK-specific `normalizePhoneNumber()` and `validateForm()` logic
- Use component's built-in validation

### 4. `src/components/contacts/ContactCard.tsx`

Changes:
- Format phone number using `formatPhoneForDisplay()` for prettier display
- Show international format instead of raw E.164

### 5. `src/components/history/CallHistoryDetailDialog.tsx`

Changes:
- Format phone number display using `formatPhoneForDisplay()`

### 6. `src/components/contacts/ContactPickerModal.tsx`

Changes:
- Format phone numbers in the contact list for display

---

## Component Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    InternationalPhoneInput                      │
│  ┌─────────────────┬───────────────────────────────────────────┐│
│  │ CountryPicker   │           Phone Input                     ││
│  │ 🇬🇧 +44 ▼      │  7700 900 123                             ││
│  └─────────────────┴───────────────────────────────────────────┘│
│  └── CallCostEstimate: "💰 ~$0.14/min to United Kingdom"       │
│  └── Error Message (if invalid)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### Smart Paste Detection
When user pastes a full international number like `+91 98765 43210`:
1. Detect the paste event
2. Use `detectCountryFromNumber()` to identify country (India)
3. Update country selector to show 🇮🇳 +91
4. Extract local number portion and fill input
5. Validate automatically

### Last Used Country Memory
- Store last selected country code in localStorage (`yaad_last_country`)
- On mount, read from localStorage (default: "GB")
- Update localStorage when user selects a new country

### Backward Compatibility
- Existing UK numbers stored as `+44XXXXXXXXXX` will work seamlessly
- `formatPhoneForDisplay()` parses E.164 and detects country automatically
- No database changes required

---

## Technical Details

### Dependencies
- **Install:** `libphonenumber-js` - for phone parsing, validation, and formatting

### Phone Number Flow

```text
User Input: "7700 900 123" + Country: GB
    ↓
Validation: libphonenumber-js.isValid()
    ↓
Storage: "+447700900123" (E.164)
    ↓
Display: "+44 7700 900 123" (International format)
```

### Country Picker Behavior
- Opens as a Dialog/Sheet for mobile-friendly UX
- Search filters both country name and dial code
- Popular countries shown first, separated by a divider
- Selecting updates parent component via `onChange`

### Validation States
- **Empty:** No error shown
- **Typing:** Real-time validation as user types
- **Invalid:** Red border + error message below
- **Valid:** Normal border, enables form submission

---

## Implementation Order

1. Install `libphonenumber-js` dependency
2. Create `src/config/countries.ts` with country data
3. Create `src/config/twilioCallPricing.ts` with pricing data
4. Create `src/lib/phoneUtils.ts` with validation utilities
5. Create `src/components/phone/CountryPicker.tsx`
6. Create `src/components/phone/InternationalPhoneInput.tsx`
7. Create `src/components/phone/CallCostEstimate.tsx`
8. Update `ContactForm.tsx` to use new component
9. Update `CreateReminderDialog.tsx` to use new component
10. Create `src/components/reminders/TestCallConfirmation.tsx`
11. Update `EditReminderDialog.tsx` with new phone input and test call confirmation
12. Update display components (`ContactCard`, `CallHistoryDetailDialog`, `ContactPickerModal`)
13. Test with various international number formats

---

## UI Design Decisions

- Country picker uses a Dialog (modal) for better mobile UX
- Flag emojis used for visual country identification
- Dial code shown in the trigger button for quick reference
- Error messages appear below the input in red text
- Cost estimates shown in muted gray text with money emoji
- Test call confirmation is a centered AlertDialog matching existing delete confirmations
