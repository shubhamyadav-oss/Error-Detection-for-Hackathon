import * as vscode from "vscode";
import type { components } from "./types/api";

type Schemas = components["schemas"];

export type SearchRequest = Schemas["SearchRequest"];
export type SearchResponse = Schemas["SearchResponse"];
export type ExplainRequest = Schemas["ExplainRequest"];
export type ExplainResponse = Schemas["ExplainResponse"];
export type NoMatchRequest = Schemas["NoMatchRequest"];
export type NoMatchResponse = Schemas["NoMatchResponse"];
export type WeakMatchRequest = Schemas["WeakMatchRequest"];
export type WeakMatchResponse = Schemas["WeakMatchResponse"];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly kind: "unauthorized" | "validation" | "bad_gateway" | "network" | "unknown",
    message: string
  ) {
    super(message);
  }
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("cleoErrorDetective");
  const baseUrl = (cfg.get<string>("apiBaseUrl") || "http://localhost:3000").replace(/\/$/, "");
  const token = cfg.get<string>("apiToken") || "";
  return { baseUrl, token };
}

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const { baseUrl, token } = getConfig();

  if (!token) {
    throw new ApiError(0, "unauthorized", "Missing API token. Set 'cleoErrorDetective.apiToken' in your VS Code settings.");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(0, "network", `Could not reach ${baseUrl}: ${(err as Error).message}`);
  }

  const text = await response.text();
  let parsed: unknown = undefined;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { /* leave undefined */ }

  if (response.ok) {
    return parsed as TRes;
  }

  const message = (parsed && typeof parsed === "object" && "error" in (parsed as object))
    ? String((parsed as { error: unknown }).error)
    : `Request failed with status ${response.status}`;

  switch (response.status) {
    case 401: throw new ApiError(401, "unauthorized", message);
    case 422: throw new ApiError(422, "validation", message);
    case 502: throw new ApiError(502, "bad_gateway", message);
    default:  throw new ApiError(response.status, "unknown", message);
  }
}

export const apiClient = {
  search: (body: SearchRequest) => post<SearchRequest, SearchResponse>("/error_assistant/search", body),
  explain: (body: ExplainRequest) => post<ExplainRequest, ExplainResponse>("/error_assistant/explain", body),
  noMatch: (body: NoMatchRequest) => post<NoMatchRequest, NoMatchResponse>("/error_assistant/no_match", body),
  weakMatch: (body: WeakMatchRequest) => post<WeakMatchRequest, WeakMatchResponse>("/error_assistant/weak_match", body),
};
