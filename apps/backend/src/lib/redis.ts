import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST ?? "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT ?? 6379);
const redisUsername = process.env.REDIS_USERNAME;
const redisPassword = process.env.REDIS_PASSWORD;
const redisDatabase = Number(process.env.REDIS_DB ?? 0);
const isProduction = process.env.NODE_ENV === "production";

function createRedisConnection(connectionName: string, maxRetriesPerRequest: number | null) {
  const commonOptions = {
    connectionName,
    db: redisDatabase,
    enableReadyCheck: false,
    lazyConnect: false,
    maxRetriesPerRequest,
  };

  if (redisUrl) {
    return new IORedis(redisUrl, commonOptions);
  }

  return new IORedis({
    ...commonOptions,
    host: redisHost,
    password: redisPassword,
    port: redisPort,
    tls: isProduction ? {} : undefined,
    username: redisUsername,
  });
}

export const producerRedis = createRedisConnection("backend:producer", null);
export const workerRedis = createRedisConnection("backend:worker", null);
export const pubsubPublisherRedis = createRedisConnection("backend:publisher", null);

export function createSubscriberRedisConnection(name: string) {
  return createRedisConnection(name, null);
}
