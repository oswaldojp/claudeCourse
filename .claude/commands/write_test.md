Write comprehensive tests for: $ARGUMENTS

## Conventions

- Framework: Vitest + React Testing Library
- Location: `__tests__/` directory alongside the source file
- Naming: `[filename].test.ts` or `[filename].test.tsx`
- Imports: use `@/` alias

## Coverage requirements

- Happy paths (normal usage)
- Edge cases (empty input, boundary values, unexpected types)
- Error states (thrown errors, rejected promises, failed API calls)
- Test behavior and public API — not implementation details
- Mock only external dependencies (network, DB); keep internal logic real
