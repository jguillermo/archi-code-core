import { CriteriaError, DomainException, ValidationException } from '../../ddd/domain';
import { ApplicationException } from '../../ddd/application';
import type { Logger } from '../../ddd/application';
import {
  ExceptionClassifier,
  ExceptionKind,
  InfrastructureException,
} from '../../ddd/infrastructure';

export interface HttpRequest {
  auth?: { userId?: string; role?: string };
  params?: Record<string, string>;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
}

export type JsonBody = Record<string, unknown>;

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
  private static readonly NOT_FOUND_CODES = new Set(['SAL009']);

  constructor(private readonly logger: Logger) {}

  async respond(action: () => Promise<HttpResponse>): Promise<HttpResponse> {
    try {
      return await action();
    } catch (error) {
      return this.failure(error);
    }
  }

  jsonBody(request: HttpRequest): JsonBody | null {
    const { body } = request;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as JsonBody)
      : null;
  }

  badRequest(message: string): HttpResponse {
    return { status: 400, body: { code: 'BAD_REQUEST', message } };
  }

  unauthenticated(): HttpResponse {
    return { status: 401, body: { code: 'UNAUTHENTICATED', message: 'Sign in first' } };
  }

  private failure(error: unknown): HttpResponse {
    if (error instanceof CriteriaError) {
      return { status: 400, body: { code: error.code, message: error.message } };
    }
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
