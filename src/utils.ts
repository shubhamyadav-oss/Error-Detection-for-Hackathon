import * as vscode from "vscode";

export function stripAnsi(s: string): string {
  return s
    // OSC sequences: ESC ] ... BEL or ESC \ (shell integration markers, window titles)
    // Must come before CSI/2-char rules since ESC ] would otherwise match the 2-char rule
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, "")
    // CSI sequences: ESC [ <param bytes> <intermediate bytes> <final byte>
    // Param bytes include ? < = > (0x3F range) used by DEC private modes like ?25l, ?2004l
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B\[[\x30-\x3F]*[\x20-\x2F]*[\x40-\x7E]/g, "")
    // 2-character ESC sequences: ESC followed by a single printable char (e.g. ESC > ESC =)
    // eslint-disable-next-line no-control-regex
    .replace(/\x1B[\x20-\x7E]/g, "")
    .replace(/\r/g, "");
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// Grabs up to 5 lines before the match and 30 lines after for context (stack traces can be long)
export function extractErrorBlock(buffer: string, matchIndex: number): string {
  const lines = buffer.split("\n");
  const lineOfMatch = buffer.slice(0, matchIndex).split("\n").length - 1;
  const start = Math.max(0, lineOfMatch - 5);
  return lines.slice(start, lineOfMatch + 30).join("\n").trim();
}

export function getPatterns(): string[] {
  return vscode.workspace
    .getConfiguration("cleoErrorDetective")
    .get<string[]>("patterns", []);
}

export function log(message: string): void {
  console.log(`[CleoErrorDetective] ${message}`);
}
