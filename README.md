# example-queue-consumer

W7S backend that owns a `jobs` queue and consumes messages sent by [`w7s-io/example-queue-producer`](https://github.com/w7s-io/example-queue-producer).

## Public endpoints

```text
GET https://w7s-io.w7s.cloud/example-queue-consumer/
GET https://w7s-io.w7s.cloud/example-queue-consumer/health
GET https://w7s-io.w7s.cloud/example-queue-consumer/last
GET https://w7s-io.w7s.cloud/example-queue-consumer/messages/:id
```

## Queue consumer

The app declares the queue in `w7s.json`:

```json
{
  "bindings": {
    "kv": ["STATE"]
  },
  "queues": ["jobs"]
}
```

W7S delivers queue batches to:

```text
/_w7s/queues/jobs
```

The consumer stores the latest batch in the `STATE` KV binding and also stores each message by its application-level `id`.

## Deploy

This repo deploys on every push with:

```yaml
- uses: w7s-io/w7s-cloud@v1
  with:
    token: ${{ github.token }}
```
