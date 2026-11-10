/**
 * Universal API Shield & Safe JSON Parser
 * 
 * Prevents any "Unexpected token 'T', The page could not be found is not valid JSON" errors
 * across the entire application by safely intercepting Response.prototype.json.
 */

if (typeof window !== 'undefined' && typeof Response !== 'undefined' && Response.prototype) {
  try {
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function <T = any>(): Promise<T> {
      try {
        const text = await this.text();

        if (!text || text.trim() === '') {
          return ({} as T);
        }

        const trimmed = text.trim();

        // Check if response is HTML or Vercel 404 error page (e.g. "The page could not be found")
        if (
          trimmed.startsWith('<') ||
          trimmed.startsWith('The page could not be found') ||
          trimmed.includes('NOT_FOUND') ||
          trimmed.startsWith('Internal Server Error') ||
          trimmed.startsWith('Bad Gateway')
        ) {
          console.warn('[API Shield] Intercepted non-JSON response (status ' + this.status + '):', trimmed.slice(0, 80));
          return ({
            success: false,
            error: 'Endpoint returned plain text or HTML instead of JSON',
            status: this.status,
            notFound: this.status === 404,
            raw: trimmed.slice(0, 200),
          } as unknown as T);
        }

        return JSON.parse(trimmed);
      } catch (parseErr) {
        console.warn('[API Shield] JSON.parse fallback triggered:', parseErr);
        return ({
          success: false,
          error: 'Invalid JSON payload received from server',
          status: this.status,
        } as unknown as T);
      }
    };

    console.log('[API Shield] Global JSON parsing & 404 HTML protection active');
  } catch (err) {
    console.warn('[API Shield] Note initializing shield:', err);
  }
}

export {};
