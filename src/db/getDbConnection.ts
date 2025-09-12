import { createPool, Pool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

interface DbSecrets {
  host: string;
  username: string;
  password: string;
  dbname: string;
}

// Module-level caches
let cachedSecrets: DbSecrets | null = null;
const poolCache: Record<string, Pool> = {};

// Fetch DB secrets from SSM
export async function getDbSecrets(): Promise<DbSecrets> {
  if (cachedSecrets) return cachedSecrets;

  const ssmClient = new SSMClient({});

  const dbUsernameCmd = new GetParameterCommand({
    Name: "/adultna/database/username",
  });
  const dbPasswordCmd = new GetParameterCommand({
    Name: "/adultna/database/password",
    WithDecryption: true,
  });
  const dbEndpointCmd = new GetParameterCommand({
    Name: "/adultna/database/endpoint",
  });

  const [usernameRes, passwordRes, endpointRes] = await Promise.all([
    ssmClient.send(dbUsernameCmd),
    ssmClient.send(dbPasswordCmd),
    ssmClient.send(dbEndpointCmd),
  ]);

  if (
    !usernameRes.Parameter?.Value ||
    !passwordRes.Parameter?.Value ||
    !endpointRes.Parameter?.Value
  ) {
    throw new Error("Missing required DB parameters in SSM");
  }

  cachedSecrets = {
    host: endpointRes.Parameter.Value,
    username: usernameRes.Parameter.Value,
    password: passwordRes.Parameter.Value,
    dbname: "AdultnaDB",
  };

  return cachedSecrets;
}

export async function getDbConnection(options?: {
  withoutDatabase?: boolean;
  database?: string;
}) {
  const { host, username, password, dbname } = await getDbSecrets();
  const databaseToUse = options?.withoutDatabase
    ? undefined
    : options?.database || dbname;

  const cacheKey = databaseToUse || "__no_db__";
  if (!poolCache[cacheKey]) {
    poolCache[cacheKey] = createPool({
      host,
      user: username,
      password,
      database: databaseToUse,
      waitForConnections: true,
      connectionLimit: 20,
      maxIdle: 10,
      idleTimeout: 300_000,
      queueLimit: 0,
    });
  }

  return drizzle(poolCache[cacheKey]);
}
