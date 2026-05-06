export interface DetectedError {
  raw: string;
  terminal: string;
  timestamp: Date;
  pattern: string;
}

export interface ExecutionState {
  terminalName: string;
  tail: string;
}
