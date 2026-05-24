type Env = {
  STATE: KVNamespace;
  W7S_REPOSITORY: string;
  W7S_ENVIRONMENT: string;
};

type QueueBatch = {
  queue?: string;
  queueName?: string;
  messages?: Array<{
    id?: string;
    attempts?: number;
    timestamp?: string;
    enqueuedAt?: string | null;
    caller?: {
      repository?: string;
      environment?: string;
    } | null;
    body?: unknown;
  }>;
};

const json = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers
  });
};

const readRecord = async (env: Env, key: string) => {
  const raw = await env.STATE.get(key);
  return raw ? JSON.parse(raw) : null;
};

const consumeJobs = async (request: Request, env: Env) => {
  const batch = await request.json<QueueBatch>();
  const messages = Array.isArray(batch.messages) ? batch.messages : [];
  const record = {
    service: "example-queue-consumer",
    status: "processed",
    processedAt: new Date().toISOString(),
    repository: env.W7S_REPOSITORY,
    environment: env.W7S_ENVIRONMENT,
    queue: batch.queue ?? "jobs",
    queueName: batch.queueName ?? null,
    count: messages.length,
    lastMessage: messages.at(-1) ?? null,
    messages
  };

  await env.STATE.put("last-message", JSON.stringify(record));

  for (const message of messages) {
    const body = message.body as { id?: unknown } | undefined;
    if (body && typeof body === "object" && typeof body.id === "string") {
      await env.STATE.put(`message:${body.id}`, JSON.stringify(record));
    }
  }

  return json({
    status: "ok",
    processed: messages.length
  });
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        status: "ok",
        service: "example-queue-consumer",
        repository: env.W7S_REPOSITORY,
        environment: env.W7S_ENVIRONMENT
      });
    }

    if (url.pathname === "/last") {
      return json({
        service: "example-queue-consumer",
        status: "ok",
        last: await readRecord(env, "last-message")
      });
    }

    if (url.pathname.startsWith("/messages/")) {
      const id = decodeURIComponent(url.pathname.slice("/messages/".length));
      const message = id ? await readRecord(env, `message:${id}`) : null;
      return json({
        service: "example-queue-consumer",
        status: message ? "ok" : "missing",
        id,
        message
      }, { status: message ? 200 : 404 });
    }

    if (url.pathname === "/_w7s/queues/jobs" && request.method === "POST") {
      return consumeJobs(request, env);
    }

    if (url.pathname === "/") {
      return json({
        service: "example-queue-consumer",
        status: "ok",
        queue: "jobs",
        consumerPath: "/_w7s/queues/jobs",
        endpoints: {
          health: "/health",
          last: "/last",
          message: "/messages/:id"
        }
      });
    }

    return json(
      {
        status: "error",
        error: "Not found"
      },
      { status: 404 }
    );
  }
};
