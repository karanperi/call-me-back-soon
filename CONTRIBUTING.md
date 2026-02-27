# Contributing to Yaad

Thank you for your interest in contributing to Yaad! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/call-me-back-soon.git
   cd call-me-back-soon
   ```
3. **Set up the development environment** following [SETUP.md](SETUP.md)
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

| Prefix | Use Case |
|--------|----------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Test additions/changes |
| `chore/` | Maintenance tasks |

Examples:
- `feature/recurring-reminders`
- `fix/phone-validation`
- `docs/api-reference`

### Making Changes

1. Keep changes focused and atomic
2. Write meaningful commit messages
3. Add tests for new functionality
4. Update documentation as needed
5. Ensure all tests pass before submitting

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run linting**:
   ```bash
   npm run lint
   ```

3. **Run tests**:
   ```bash
   npm run test
   ```

4. **Build successfully**:
   ```bash
   npm run build
   ```

### PR Guidelines

1. **Title**: Use a clear, descriptive title
2. **Description**: Include:
   - What changes were made
   - Why the changes were needed
   - Any breaking changes
   - Screenshots for UI changes
3. **Link issues**: Reference related issues with `Fixes #123` or `Relates to #456`

### PR Template

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Export types from dedicated files when shared

```typescript
// Good
interface ReminderPayload {
  reminderId: string;
  recipientName: string;
  phoneNumber: string;
  message: string;
  voice: 'friendly_female' | 'friendly_male';
}

// Avoid
const payload: any = { ... };
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use meaningful component names
- Extract reusable logic to custom hooks

```typescript
// Good - Small, focused component
const ReminderCard = ({ reminder }: ReminderCardProps) => {
  return (
    <Card>
      <CardHeader>{reminder.recipientName}</CardHeader>
      <CardContent>{reminder.message}</CardContent>
    </Card>
  );
};
```

### File Organization

- One component per file
- Colocate tests with components
- Group related components in folders
- Use index files for clean exports

```
components/
├── reminders/
│   ├── ReminderCard.tsx
│   ├── ReminderCard.test.tsx
│   ├── ReminderForm.tsx
│   ├── ReminderForm.test.tsx
│   └── index.ts
```

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use shadcn/ui components when available
- Keep custom CSS minimal

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance |

### Examples

```
feat(reminders): add recurring reminder support

fix(phone): validate international phone numbers correctly

docs(api): add make-call endpoint documentation

refactor(auth): simplify login flow
```

## Testing

See [docs/TESTING.md](docs/TESTING.md) for detailed testing guidelines.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- src/components/reminders/ReminderCard.test.tsx
```

### Writing Tests

- Write tests for new features
- Maintain existing test coverage
- Use meaningful test descriptions
- Test edge cases and error states

## Documentation

- Update README.md for user-facing changes
- Update relevant docs/ files for technical changes
- Add JSDoc comments for complex functions
- Include inline comments for non-obvious code

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion for broader topics
- Reach out to maintainers

Thank you for contributing! 🙏