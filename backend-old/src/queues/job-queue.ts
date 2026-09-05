import { prisma } from "../config/database.js";

export async function enqueueJob(
  jobType: string,
  payload: Record<string, unknown>,
  opts?: { idempotencyKey?: string; delaySeconds?: number; maxAttempts?: number },
) {
  try {
    await prisma.jobQueue.create({
      data: {
        job_type: jobType,
        payload: payload as object,
        idempotency_key: opts?.idempotencyKey ?? null,
        max_attempts: opts?.maxAttempts ?? 5,
        available_at: new Date(Date.now() + (opts?.delaySeconds ?? 0) * 1000),
      },
    });
  } catch (err) {
    // Unique idempotency collision is fine — treat as already queued.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("Unique") && !message.includes("uq_job_idempotency")) {
      throw err;
    }
  }
}

export async function claimJobs(workerId: string, limit = 10) {
  const now = new Date();
  const pending = await prisma.jobQueue.findMany({
    where: {
      status: "pending",
      available_at: { lte: now },
    },
    orderBy: { id: "asc" },
    take: limit,
  });

  const claimed = [];
  for (const job of pending) {
    const updated = await prisma.jobQueue.updateMany({
      where: { id: job.id, status: "pending" },
      data: {
        status: "processing",
        locked_at: now,
        locked_by: workerId,
        attempts: { increment: 1 },
      },
    });
    if (updated.count === 1) claimed.push(job);
  }
  return claimed;
}

export async function completeJob(id: bigint) {
  await prisma.jobQueue.update({
    where: { id },
    data: { status: "completed", locked_at: null, locked_by: null, last_error: null },
  });
}

export async function failJob(id: bigint, error: string, maxAttempts: number, attempts: number) {
  const retry = attempts < maxAttempts;
  await prisma.jobQueue.update({
    where: { id },
    data: {
      status: retry ? "pending" : "failed",
      last_error: error.slice(0, 2000),
      locked_at: null,
      locked_by: null,
      available_at: retry ? new Date(Date.now() + Math.min(300, 5 * attempts) * 1000) : new Date(),
    },
  });
}
