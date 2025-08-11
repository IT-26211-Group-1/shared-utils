import { createPool, Pool } from "mysql2/promise";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

let pool: Pool | null = null;
let dbName: string | null = null;

interface DbSecrets {
  host: string;
  username: string;
  password: string;
  dbname: string;
}

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

  let parsed: unknown;
  try {
    parsed = JSON.parse(SecretString);
  } catch {
    throw new Error("Failed to parse SecretString JSON");
  }

  const { host, username, password, dbname } = parsed as Partial<DbSecrets>;

  if (!host || !username || !password || !dbname) {
    throw new Error("Missing required DB secrets");
  }

  dbName = dbname;

  return { host, username, password, dbname };
}

export async function getDbConnection(database?: string): Promise<Pool> {
  if (pool) return pool;

  const { host, username, password, dbname } = await getDbSecrets();

  pool = createPool({
    host,
    user: username,
    password,
    database: database || dbName || dbname,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60_000,
    queueLimit: 0,
  });

  return pool;
}
