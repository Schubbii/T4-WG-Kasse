import type { Context } from "@hono/hono";
import { HTTPException } from "@hono/hono/http-exception";
import type { ContentfulStatusCode } from "@hono/hono/utils/http-status";

/**
 * Fachlicher Fehler mit HTTP-Status.
 * Services werfen ihn, der zentrale Error-Handler macht daraus eine JSON-Antwort.
 */
export class AppError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} nicht gefunden`);

/** Einheitliches Fehlerformat aller Endpunkte. */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json<ErrorBody>({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof HTTPException) {
    // z. B. kaputtes JSON im Request-Body
    return c.json<ErrorBody>(
      { error: { code: "BAD_REQUEST", message: err.message || "Ungültige Anfrage" } },
      err.status,
    );
  }
  console.error(err);
  return c.json<ErrorBody>(
    { error: { code: "INTERNAL_ERROR", message: "Interner Serverfehler" } },
    500,
  );
}
