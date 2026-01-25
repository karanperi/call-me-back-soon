

# Fix: Remove Duplicate Greeting from Medication Message

## Problem

The `make-call` edge function already adds a personalized greeting:
```typescript
const personalizedMessage = `Hello ${recipientName}. ${message}`;
```

But the medication message generator also adds the same greeting, resulting in:
> "Hello Dad. Hello Dad. This is your medication reminder..."

## Solution

Update `generateMedicationMessage` in `src/lib/medicationUtils.ts` to start directly with the reminder content.

---

## Change Details

**File:** `src/lib/medicationUtils.ts`

**Current (line 88):**
```typescript
let message = `Hello ${name}. This is your medication reminder. It's time to take your ${medication}`;
```

**Updated:**
```typescript
let message = `This is your medication reminder. It's time to take your ${medication}`;
```

Also remove the unused `name` variable construction (lines 84-85):
```typescript
// Remove this line - no longer needed
const name = recipientName.trim() || "there";
```

---

## Result

**Before (duplicated greeting):**
> "Hello Dad. Hello Dad. This is your medication reminder. It's time to take your Metformin - 2 tablets. Take with food. Take care!"

**After (clean message):**
> "Hello Dad. This is your medication reminder. It's time to take your Metformin - 2 tablets. Take with food. Take care!"

The edge function handles the greeting, and the template just provides the content.

