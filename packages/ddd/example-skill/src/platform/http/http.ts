import { DomainException, ValidationException } from '@archi-code/ddd/domain';
import { ApplicationException } from '@archi-code/ddd/application';
import type { Logger } from '@archi-code/ddd/application';
import {
  ExceptionClassifier,
  ExceptionKind,
  InfrastructureException,
} from '@archi-code/ddd/infrastructure';

export interface HttpRequest {
  auth?: { userId: string; role: string };
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
}

export class Http {
  private static readonly STATUS: Record<ExceptionKind, number> = {
    [ExceptionKind.NotFound]: 404,
    [ExceptionKind.NotAllowed]: 403,
    [ExceptionKind.Conflict]: 409,
    [ExceptionKind.Malformed]: 400,
    [ExceptionKind.Invalid]: 422,
    [ExceptionKind.Rejected]: 400,
    [ExceptionKind.Internal]: 500,
  };

  private static readonly NOT_FOUND_CODES = new Set(['LRN002', 'LRN006', 'ENR003']);

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      return this.failure(error);
    }
  }

  jsonBody(request: HttpRequest): Record<string, unknown> | null {
    const body = request.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return null;
    }
    return body as Record<string, unknown>;
  }

  badRequest(message: string): HttpResponse {
    return { status: 400, body: { code: 'HTTP400', message } };
  }

  unauthenticated(): HttpResponse {
    return { status: 401, body: { code: 'HTTP401', message: 'Sign in to do this' } };
  }

  notFound(message: string): HttpResponse {
    return { status: 404, body: { code: 'HTTP404', message } };
  }

  private failure(error: unknown): HttpResponse {
    const kind = ExceptionClassifier.classify(error);
    const known =
      error instanceof DomainException ||
      error instanceof ApplicationException ||
      error instanceof InfrastructureException;
    const code = known ? error.code : 'E000';
    if (kind === ExceptionKind.Internal) {
      this.logger.error('http_request_failed', { code, error });
      return { status: 500, body: { code, message: 'Internal server error' } };
    }
    const status = Http.NOT_FOUND_CODES.has(code) ? 404 : Http.STATUS[kind];
    const errors = error instanceof ValidationException ? error.errors : undefined;
    return { status, body: { code, message: (error as Error).message, errors } };
  }
}
