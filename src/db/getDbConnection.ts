import { createPool, Pool } from "mysql2/promise";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

let pool: Pool | null = null;

interface DbSecrets {
  host: string;
  username: string;
  password: string;
  dbname: string;
}

async function getSecrets(secretName: string): Promise<DbSecrets> {
  const client = new SecretsManager({ region: "ap-southeast-2" });
  const secret = await client.getSecretValue({ SecretId: secretName });

  if (!secret.SecretString) {
    throw new Error("Missing secret string");
  }

  return JSON.parse(secret.SecretString) as DbSecrets;
}

export async function getDbConnection(): Promise<Pool> {
  if (pool) return pool;

  const {
    host,
    username,
    password,
    dbname: database,
  } = await getSecrets(process.env.DB_SECRET_NAME as string);

  pool = createPool({
    host,
    user: username,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60000,
    queueLimit: 0,
  });

  return pool;
}
