# Testing Guide

This document describes the testing strategy and practices for Yaad.

## Overview

| Test Type | Framework | Location |
|-----------|-----------|----------|
| Unit Tests | Vitest | `*.test.ts(x)` |
| Component Tests | Vitest + Testing Library | `*.test.tsx` |
| Integration Tests | Vitest | `src/test/` |

## Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (during development)
npm run test:watch

# Run specific test file
npm run test -- src/components/reminders/ReminderCard.test.tsx

# Run tests matching pattern
npm run test -- --grep "ReminderCard"

# Run with coverage
npm run test -- --coverage
```

## Test Structure

```
src/
├── components/
│   └── reminders/
│       ├── ReminderCard.tsx
│       └── ReminderCard.test.tsx  # Colocated test
├── hooks/
│   ├── useReminders.ts
│   └── useReminders.test.ts
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
└── test/
    ├── setup.ts               # Test setup
    └── integration/           # Integration tests
```

## Writing Tests

### Unit Test Example

```typescript
// src/lib/phone.test.ts
import { describe, it, expect } from 'vitest';
import { formatPhoneNumber, validateE164 } from './phone';

describe('formatPhoneNumber', () => {
  it('formats US number correctly', () => {
    expect(formatPhoneNumber('+14155551234')).toBe('+1 (415) 555-1234');
  });

  it('handles invalid input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });
});

describe('validateE164', () => {
  it('validates correct E.164 format', () => {
    expect(validateE164('+14155551234')).toBe(true);
    expect(validateE164('+447911123456')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(validateE164('4155551234')).toBe(false);  // Missing +
    expect(validateE164('+1')).toBe(false);          // Too short
  });
});
```

### Component Test Example

```typescript
// src/components/reminders/ReminderCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReminderCard } from './ReminderCard';

const mockReminder = {
  id: '123',
  recipientName: 'Mom',
  phoneNumber: '+14155551234',
  message: 'Take your medicine',
  voice: 'friendly_female',
  scheduledAt: new Date('2025-01-28T09:00:00Z'),
  frequency: 'daily',
  isActive: true,
};

describe('ReminderCard', () => {
  it('renders reminder details', () => {
    render(<ReminderCard reminder={mockReminder} />);
    
    expect(screen.getByText('Mom')).toBeInTheDocument();
    expect(screen.getByText('Take your medicine')).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<ReminderCard reminder={mockReminder} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith(mockReminder.id);
  });

  it('shows inactive badge when not active', () => {
    render(
      <ReminderCard 
        reminder={{ ...mockReminder, isActive: false }} 
      />
    );
    
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });
});
```

### Hook Test Example

```typescript
// src/hooks/useReminders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReminders } from './useReminders';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('useReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches reminders on mount', async () => {
    const mockReminders = [{ id: '1', recipientName: 'Test' }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockReminders, error: null }),
      }),
    } as any);

    const { result } = renderHook(() => useReminders());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockReminders);
    });
  });
});
```

## Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Testing Best Practices

### Do

- Test user behavior, not implementation
- Use meaningful test descriptions
- Test edge cases and error states
- Keep tests independent
- Use factories for test data

### Don't

- Test implementation details
- Use generic descriptions ("it works")
- Share state between tests
- Over-mock (test real behavior when possible)

## Mocking

### Supabase Client

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));
```

### Date/Time

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-27T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### External Services

For edge functions, mock the external APIs:

```typescript
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));
```

## Coverage

```bash
npm run test -- --coverage
```

Coverage report is generated in `coverage/` directory.

### Coverage Targets

| Type | Target |
|------|--------|
| Statements | 70% |
| Branches | 70% |
| Functions | 70% |
| Lines | 70% |

## Continuous Integration

Tests run automatically on:
- Pull requests
- Push to main branch

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
```

## Manual Testing Checklist

Before deploying:

- [ ] Create account
- [ ] Log in/out
- [ ] Create reminder (all voice types)
- [ ] Edit reminder
- [ ] Delete reminder
- [ ] View call history
- [ ] Manage contacts
- [ ] Clone voice
- [ ] Test on mobile
- [ ] Test reminder delivery (real call)
