

# Redesign TemplatePicker to Pill-Shaped Design

## Current Issue

The current template picker uses card-style buttons with:
- Vertical layout (icon on top, label below)
- Large minimum width (`min-w-[100px]`)
- Generous padding (`p-3`)
- Takes up significant vertical space (~80px height)

## Solution: Compact Pill-Shaped Design

Transform to Notion-style horizontal pills that are space-efficient with edge fade effects for partially visible items.

---

## Visual Comparison

**Before (Current):**
```
┌─────────────────────────────────────────────────────────┐
│ TEMPLATE                                                │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│ │    ✏️      │ │    💊      │ │    ➕      │            │
│ │   Quick    │ │ Medication │ │ More Soon  │            │
│ └────────────┘ └────────────┘ └────────────┘            │
└─────────────────────────────────────────────────────────┘
```

**After (Pill Design):**
```
┌─────────────────────────────────────────────────────────┐
│ TEMPLATE                                                │
│ ░░ [✏️ Quick] [💊 Medication] [➕ More Soon] ░░         │
│    ↑ fade                               fade ↑          │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Pill Button Styling

Change from vertical cards to horizontal pills:

```tsx
// Before: Vertical card
"flex flex-col items-center justify-center min-w-[100px] p-3 rounded-xl border-2"

// After: Horizontal pill
"flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap"
```

- **Layout**: `flex items-center gap-1.5` (icon and label side by side)
- **Padding**: `px-3 py-1.5` (compact horizontal padding)
- **Shape**: `rounded-full` (pill/capsule shape)
- **Border**: `border` instead of `border-2` (thinner, more subtle)
- **No wrap**: `whitespace-nowrap` (prevent text wrapping)

### 2. Icon Sizing

Reduce icon size for compact pills:

```tsx
// Before
<Pencil className="h-5 w-5" />

// After
<Pencil className="h-4 w-4" />
```

### 3. Fade Effect Container

Wrap the scrollable area with a container that applies gradient fade masks on both edges:

```tsx
<div className="relative">
  {/* Left fade */}
  <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
  
  {/* Scrollable pills */}
  <div className="flex gap-2 overflow-x-auto px-6 ...">
    {/* pills */}
  </div>
  
  {/* Right fade */}
  <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
</div>
```

The fade uses `from-card` to match the dialog background color.

### 4. Selected State

Update selected styling for pills:

```tsx
// Selected
"border-primary bg-primary/10 text-primary"

// Unselected
"border-border bg-secondary/50 hover:border-primary/50 text-muted-foreground"
```

---

## File Changes

### `src/components/reminders/TemplatePicker.tsx`

| Change | Details |
|--------|---------|
| Icon size | Reduce from `h-5 w-5` to `h-4 w-4` |
| Button layout | Change from `flex-col` to horizontal `flex items-center gap-1.5` |
| Button shape | Change from `rounded-xl` to `rounded-full` |
| Padding | Change from `p-3` to `px-3 py-1.5` |
| Remove min-width | Remove `min-w-[100px]` |
| Add fade container | Wrap scroll area with gradient fade overlays |
| Add horizontal padding | `px-6` on scroll container to allow space for fade |
| Update selected state | Use filled pill style with primary color |

---

## Complete Updated Component

The updated component will:
1. Use compact horizontal pills with icon + label inline
2. Have subtle gradient fades on left and right edges
3. Support horizontal scrolling with hidden scrollbar
4. Maintain touch-friendly tap targets (adequate padding)
5. Show clear selected state with primary color fill

---

## Space Savings

| Metric | Before | After |
|--------|--------|-------|
| Button height | ~70px | ~32px |
| Total section height | ~100px | ~60px |
| Horizontal footprint | ~340px | ~280px |

**Result**: ~40% reduction in vertical space used by the template picker.

