

# Fix: Call Card Disappearing During In-Progress Calls

## Problem

When a call is in progress, the reminder card disappears from the Active reminders screen instead of updating to show "Call in progress" status. The card only reappears after a page refresh.

## Root Cause

The `useCallHistory` hook lacks automatic refetching, while `useReminders` refreshes every 2 seconds:

```text
┌──────────────────────────────────────────────────────────────┐
│                  Current State                                │
├──────────────────────────────────────────────────────────────┤
│  useReminders     → refetchInterval: 2000ms ✅                │
│  useCallHistory   → refetchInterval: NONE  ❌                 │
└──────────────────────────────────────────────────────────────┘
```

**What happens:**
1. Call is triggered → call_history record created with status "in_progress"
2. For one-time reminders, `is_active` is set to `false`
3. `useReminders` refetches → sees `is_active: false`
4. Filtering logic: `r.is_active || inProgressReminderIds.has(r.id)`
5. But `inProgressReminderIds` is empty (no refetch occurred!)
6. Card disappears from the active list

---

## Solution

Add `refetchInterval: 2000` to `useCallHistory` hook to keep call statuses in sync with the UI.

---

## Changes Required

### File: `src/hooks/useCallHistory.ts`

**Current code (lines 13-39):**
```typescript
return useQuery({
  queryKey: ["call_history", user?.id, filter],
  queryFn: async () => {
    // ... query logic
  },
  enabled: !!user,
});
```

**Updated code:**
```typescript
return useQuery({
  queryKey: ["call_history", user?.id, filter],
  queryFn: async () => {
    // ... query logic (unchanged)
  },
  enabled: !!user,
  refetchInterval: 2000, // Auto-refresh every 2 seconds to catch status changes
});
```

---

## Why This Fixes the Issue

| Before | After |
|--------|-------|
| `useCallHistory` fetches once on mount | `useCallHistory` refetches every 2 seconds |
| `inProgressReminderIds` becomes stale | `inProgressReminderIds` stays current |
| Card disappears when `is_active` → false | Card persists with "Call in progress" indicator |
| Need page refresh to see updates | Updates appear automatically |

---

## Technical Details

The filtering logic in `Home.tsx` already handles this correctly (line 38):
```typescript
const activeReminders = reminders.filter(
  (r) => r.is_active || inProgressReminderIds.has(r.id)
);
```

The issue is simply that `inProgressReminderIds` was never being updated because the call history data was stale.

---

## Summary

| File | Change |
|------|--------|
| `src/hooks/useCallHistory.ts` | Add `refetchInterval: 2000` to useQuery options |

This single-line fix ensures call status updates are reflected in real-time without requiring a page refresh.

