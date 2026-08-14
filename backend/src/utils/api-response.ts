import type { FastifyReply } from "fastify";

export type ApiMeta = {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  next_cursor?: string | null;
  [key: string]: unknown;
};

export function ok<T>(
  reply: FastifyReply,
  data: T,
  message = "OK",
  status = 200,
  meta: ApiMeta | null = null,
) {
  const requestId = (reply.request as { requestId?: string }).requestId ?? null;
  return reply.status(status).send({
    success: true,
    message,
    data,
    meta,
    errors: null,
    request_id: requestId,
  });
}

export function fail(
  reply: FastifyReply,
  status: number,
  message: string,
  errors: Record<string, unknown> | null = null,
  code?: string,
) {
  const requestId = (reply.request as { requestId?: string }).requestId ?? null;
  return reply.status(status).send({
    success: false,
    message,
    data: null,
    meta: null,
    errors,
    code: code ?? null,
    request_id: requestId,
  });
}
