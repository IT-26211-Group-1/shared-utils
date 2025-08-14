import { createPool, Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

interface DbSecrets {
  host: string;
  username: string;
  password: string;
  dbname: string;
}

const poolCache: Record<string, Pool> = {};

async function getDbSecrets(): Promise<DbSecrets> {
  const secretName = process.env.DB_SECRET_NAME;
  const region = process.env.AWS_REGION;

  if (!secretName) throw new Error("Missing DB_SECRET_NAME env var");
  if (!region) throw new Error("Missing AWS_REGION env var");

  const secretsClient = new SecretsManager({ region });
  const { SecretString } = await secretsClient.getSecretValue({
    SecretId: secretName,
  });

  if (!SecretString) throw new Error("SecretString is empty");

  let parsed: DbSecrets;
  try {
    parsed = JSON.parse(SecretString);
  } catch {
    throw new Error("Failed to parse DB secrets JSON");
  }

  if (!parsed.host || !parsed.username || !parsed.password || !parsed.dbname) {
    throw new Error("Missing required DB secrets");
  }

  return parsed;
}

/**
 * Get a Drizzle DB connection for a specific database.
 * @param database
 * @param withoutDatabase
 */

export async function getDbConnection(options?: {
  withoutDatabase?: boolean;
  database?: string;
}) {
  const { host, username, password, dbname } = await getDbSecrets();
  const databaseToUse = options?.withoutDatabase
    ? undefined
    : options?.database || dbname;

  // Cache per database
  const cacheKey = databaseToUse || "__no_db__";
  if (!poolCache[cacheKey]) {
    poolCache[cacheKey] = createPool({
      host,
      user: username,
      password,
      database: databaseToUse,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60_000,
      queueLimit: 0,
    });
  }

  return drizzle(poolCache[cacheKey]);
}
