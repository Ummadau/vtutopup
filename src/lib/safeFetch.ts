/**
 * Robust fetch wrapper that checks HTTP headers and body content
 * to handle server errors, 404 HTML pages, and non-JSON payloads gracefully.
 */
import { apiFetch } from './firebase.ts';

export interface SafeFetchResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  isHtmlError?: boolean;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback: Partial<T> = {}
): Promise<T & { _safeError?: string; _statusCode?: number }> {
  try {
    const res = await apiFetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const isJsonHeader = contentType.includes('application/json');

    const rawText = await res.text();
    const trimmed = rawText.trim();

    // Handle non-200 or HTML error responses
    if (
      !isJsonHeader ||
      trimmed.startsWith('<') ||
      trimmed.startsWith('The page could not be found') ||
      trimmed.includes('NOT_FOUND') ||
      trimmed.startsWith('Internal Server Error') ||
      trimmed.startsWith('Bad Gateway')
    ) {
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        console.warn(`[safeFetchJson] Non-JSON payload for ${String(input)} (${res.status})`);
        return {
          ...(fallback as T),
          success: false,
          error: `Server returned non-JSON response (${res.status})`,
          _safeError: `HTTP ${res.status}: Non-JSON response`,
          _statusCode: res.status,
        };
      }
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      return {
        ...parsed,
        _statusCode: res.status,
      };
    }

    return {
      ...(fallback as T),
      success: false,
      error: 'Invalid JSON structure',
      _safeError: 'Invalid JSON structure',
      _statusCode: res.status,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[safeFetchJson] Fetch failed for ${String(input)}:`, errorMsg);
    return {
      ...(fallback as T),
      success: false,
      error: errorMsg,
      _safeError: errorMsg,
      _statusCode: 0,
    };
  }
}

export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResponse<T>> {
  try {
    const res = await apiFetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    const trimmed = text.trim();

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `HTTP Error ${res.status}`,
        isHtmlError: trimmed.startsWith('<') || trimmed.startsWith('The page could not be found'),
      };
    }

    if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const data = JSON.parse(trimmed) as T;
        return {
          ok: true,
          status: res.status,
          data,
          error: null,
        };
      } catch (parseErr) {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: 'JSON parse error',
        };
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: null,
      error: 'Non-JSON content returned',
      isHtmlError: trimmed.startsWith('<'),
    };
  } catch (err: unknown) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
