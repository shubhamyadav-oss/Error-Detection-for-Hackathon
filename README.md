# Error Detective

A VS Code extension that watches terminal output for errors after each command completes.

## What it does

After every command you run in any VS Code terminal, the extension scans the full output against a configurable list of error patterns. If a match is found:

1. A VS Code error notification appears at the bottom-right with a truncated preview of the error
2. Clicking **Show Full Error** opens a new editor tab containing:
   - Which terminal the error came from
   - Timestamp
   - Which pattern matched
   - Up to 15 lines of surrounding context from the output

A status bar item (`$(bug) Cleo Errors: ON`) sits in the bottom-right of VS Code. Clicking it toggles detection on/off. You can also toggle via **Ctrl+Shift+P > Cleo: Toggle Terminal Error Detection**.

### Default error patterns

The following patterns are matched by default (case-insensitive):

| Pattern | Catches |
|---|---|
| `Error:` | JS/TS runtime errors |
| `TypeError:`, `SyntaxError:`, `ReferenceError:` | Specific JS error types |
| `UnhandledPromiseRejection` | Unhandled async errors |
| `ENOENT`, `ECONNREFUSED` | File/network system errors |
| `exit code [1-9]` | Non-zero process exits |
| `npm ERR!`, `yarn error` | Package manager failures |
| `FATAL` | Critical failures |
| `Traceback (most recent call last)` | Python exceptions |

You can add or remove patterns in **Settings > Cleo Error Detective > Patterns** without touching code.

## Dev setup

**Requirements:** Node.js, VS Code 1.93+

```bash
npm install
npm run compile
```

Press **F5** to open the Extension Development Host — a second VS Code window with the extension running. To recompile automatically on save:

```bash
npm run watch
```

After a recompile, reload the host window with **Ctrl+Shift+P > Developer: Reload Window**.
