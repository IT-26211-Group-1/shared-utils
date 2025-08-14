"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = getDbConnection;
const promise_1 = require("mysql2/promise");
const mysql2_1 = require("drizzle-orm/mysql2");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const poolCache = {};
async function getDbSecrets() {
    const secretName = process.env.DB_SECRET_NAME;
    const region = process.env.AWS_REGION;
    if (!secretName)
        throw new Error("Missing DB_SECRET_NAME env var");
    if (!region)
        throw new Error("Missing AWS_REGION env var");
    const secretsClient = new client_secrets_manager_1.SecretsManager({ region });
    const { SecretString } = await secretsClient.getSecretValue({
        SecretId: secretName,
    });
    if (!SecretString)
        throw new Error("SecretString is empty");
    let parsed;
    try {
        parsed = JSON.parse(SecretString);
    }
    catch {
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
async function getDbConnection(options) {
    const { host, username, password, dbname } = await getDbSecrets();
    const databaseToUse = options?.withoutDatabase
        ? undefined
        : options?.database || dbname;
    // Cache per database
    const cacheKey = databaseToUse || "__no_db__";
    if (!poolCache[cacheKey]) {
        poolCache[cacheKey] = (0, promise_1.createPool)({
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
    return (0, mysql2_1.drizzle)(poolCache[cacheKey]);
}
