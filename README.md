# Error-Detection-for-Hackathon

## `package.json`

  - `activationEvents: ["onStartupFinished"]`— extension loads as soon as VS Code is ready, so it never misses terminal
 output

  - `contributes.configuration.cleoErrorDetective.patterns` — configurable list of regex patterns; users can add Cleo-sp
ecific ones (e.g. "DatabaseConnectionError") without touching code

## `tsconfig.json`

  - Standard extension config targeting ES2022/Node16 modules

## `src/extension.ts` — the core:

  - `vscode.window.onDidWriteTerminalData` — the VS Code API that streams raw terminal output; this is the right hook fo
r passive monitoring (no shell injection needed)

  - ANSI stripping — terminal output is full of escape codes; patterns would never match without this

  - Per-terminal buffer — accumulates output so multi-line errors (e.g. Python tracebacks) aren't split across chunks

  - extractErrorBlock — grabs up to 5 lines of context before the match, giving the future Slack/Notion search meaning
ful input

  - onErrorDetected — intentionally a clean seam; the TODO comment is where you'll plug in Slack/Notion search next

  - Status bar toggle — lets you quickly enable/disable without a command palette trip

Inside the editor, `open src/extension.ts` and press `F5` or run the command Debug: Start Debugging from the Command Palette. This will compile and run the extension in a new Extension Development Host window.
If `F5` does nothing, then make sure `.vscode` directory exists with `launch.json` and `tasks.json` inside it.
