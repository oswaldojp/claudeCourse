Your goal is to update any vulnerable dependencies.

1. Run `npm audit` to identify vulnerable packages.
2. Run `npm audit fix` to apply safe updates.
3. For remaining vulnerabilities, evaluate each one and apply manual fixes if appropriate.
4. Run `npm test` to verify nothing broke.
5. Report a summary: what was fixed, what remains, and why.
