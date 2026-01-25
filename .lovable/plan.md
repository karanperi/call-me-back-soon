
# Fix: Keep In-Progress Calls in Active List, Exclude from History

## Problem

When a call is initiated, the `call_history` record is created with `status: "in_progress"`. Currently, this call appears in BOTH:
- The Active calls list on the Home page (correct)
- The History page (incorrect - should only show finalized calls)

## Current Behavior vs Expected

| Scenario | Current | Expected |
|----------|---------|----------|
| Call in progress | Shows in Active + History | Shows ONLY in Active |
| Call finalized | Shows in History | Shows in History |

## Root Cause

In `src/hooks/useCallHistory.ts`, when no filter is provided (the "All" view on History page), the query fetches ALL records including in-progress ones:

```typescript
if (filter) {
  query = query.eq("status", filter);
}
// No exclusion when filter is undefined
```

## Solution

Update `useCallHistory.ts` to exclude `in_progress` and `pending` statuses when no specific filter is provided:

```typescript
if (filter) {
  query = query.eq("status", filter);
} else {
  // Exclude in-progress and pending from "All" view
  query = query.not("status", "in", "(in_progress,pending)");
}
```

## Data Flow After Fix

```text
Call Initiated (status: "in_progress")
        |
        +---> Home Page: useCallHistory("in_progress")
        |       --> Matches filter, shows in Active list with green indicator
        |
        +---> History Page: useCallHistory(undefined)
                --> Excluded by .not() clause, does NOT appear

...Twilio callback received...

Call Finalized (status: "completed" / "missed" / "voicemail")
        |
        +---> Home Page: useCallHistory("in_progress")
        |       --> No longer matches, removed from Active list
        |
        +---> History Page: useCallHistory(undefined)
                --> Now included, appears in History
```

## File Changes

| File | Change |
|------|--------|
| `src/hooks/useCallHistory.ts` | Add exclusion logic for in_progress/pending when filter is undefined |

## Verification

After the fix:
- Active calls on Home page will continue to show the green pulsing indicator for in-progress calls
- History page "All" filter will only show completed, missed, voicemail, and failed calls
- History page specific filters (Answered, Missed, etc.) will continue to work unchanged
