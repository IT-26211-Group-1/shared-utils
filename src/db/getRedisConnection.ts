import Redis from "ioredis";
import { SSM } from "@aws-sdk/client-ssm";

let redisClient: Redis | null = null;
const ssmClient = new SSM({ region: process.env.AWS_REGION });

export const getRedisConnection = async (): Promise<Redis> => {
  if (redisClient) return redisClient;

  const endpointParam = process.env.REDIS_ENDPOINT_PARAM;
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);

  if (!endpointParam) throw new Error("REDIS_ENDPOINT_PARAM not set.");

  const response = await ssmClient.getParameter({ Name: endpointParam });
  if (!response.Parameter?.Value)
    throw new Error("Redis endpoint not found in SSM.");

  redisClient = new Redis({
    host: response.Parameter.Value,
    port,
  });

  redisClient.on("error", (err) =>
    console.error("Redis connection error:", err)
  );

  return redisClient;
};
