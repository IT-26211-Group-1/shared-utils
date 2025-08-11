"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = getDbConnection;
const promise_1 = require("mysql2/promise");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
let pool = null;
let dbName = null;
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
        throw new Error("Failed to parse SecretString JSON");
    }
    const { host, username, password, dbname } = parsed;
    if (!host || !username || !password || !dbname) {
        throw new Error("Missing required DB secrets");
    }
    dbName = dbname;
    return { host, username, password, dbname };
}
async function getDbConnection(database) {
    if (pool)
        return pool;
    const { host, username, password, dbname } = await getDbSecrets();
    pool = (0, promise_1.createPool)({
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
