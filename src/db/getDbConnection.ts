import { createPool, Pool } from "mysql2/promise";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

let pool: Pool | null = null;

interface DbSecrets {
  host: string;
  username: string;
  password: string;
  dbname: string;
}

async function getSecrets(): Promise<DbSecrets> {
  const secretName = process.env.DB_SECRET_NAME;
  const region = process.env.AWS_REGION;

  if (!secretName) throw new Error("Missing DB_SECRET_NAME env variable");
  if (!region) throw new Error("Missing AWS_REGION env variable");

  const client = new SecretsManager({ region });
  const { SecretString } = await client.getSecretValue({
    SecretId: secretName,
  });

  if (!SecretString) throw new Error("SecretString is empty");

  let secrets: unknown;
  try {
    secrets = JSON.parse(SecretString);
  } catch {
    throw new Error("Invalid JSON in secret");
  }

  const { host, username, password, dbname } = secrets as Partial<DbSecrets>;

  if (!host || !username || !password || !dbname) {
    throw new Error("Incomplete DB credentials in Secrets Manager");
  }

  return { host, username, password, dbname };
}

export async function getDbConnection(): Promise<Pool> {
  if (pool) return pool;

  const { host, username, password, dbname: database } = await getSecrets();

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
