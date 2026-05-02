import type { Response } from "express";

/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 *
 * A standard error response shape for APIs that:
 * - Makes errors machine-readable
 * - Allows clients to handle errors consistently
 * - Follows the industry standard
 */
export interface ProblemDetails {
  /** A URI reference identifying the problem type (e.g., "https://api.orbital.dev/errors/invalid-key") */
  type: string;
  /** A short, human-readable summary of the problem (e.g., "Invalid Stellar Key") */
  title: string;
  /** The HTTP status code */
  status: number;
  /** A human-readable explanation specific to this occurrence */
  detail: string;
  /** Optional: A URI reference identifying this specific occurrence */
  instance?: string;
}

/**
 * Send an RFC 7807 Problem Details response.
 *
 * @param res Express response object
 * @param statusCode HTTP status code
 * @param title Short title (e.g., "Invalid Request")
 * @param detail Specific detail about the error
 * @param options Optional type and instance URIs
 */
export function sendProblem(
  res: Response,
  statusCode: number,
  title: string,
  detail: string,
  options?: { type?: string; instance?: string },
): void {
  const problem: ProblemDetails = {
    type:
      options?.type ?? `https://api.orbital.dev/errors/${toKebabCase(title)}`,
    title,
    status: statusCode,
    detail,
    ...(options?.instance && { instance: options.instance }),
  };

  res.status(statusCode).contentType("application/problem+json").json(problem);
}

/**
 * Convert a title string to kebab-case for use in error type URIs.
 * e.g., "Invalid Stellar Key" -> "invalid-stellar-key"
 */
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
