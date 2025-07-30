"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = getDbConnection;
const promise_1 = require("mysql2/promise");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
let pool = null;
async function getSecrets(secretName) {
    const client = new client_secrets_manager_1.SecretsManager({ region: "ap-southeast-2" });
    const secret = await client.getSecretValue({ SecretId: secretName });
    if (!secret.SecretString)
        throw new Error("Missing secret string");
    return JSON.parse(secret.SecretString);
}
async function getDbConnection() {
    if (pool)
        return pool;
    const { host, username, password, dbname: database, } = await getSecrets(process.env.DB_SECRET_NAME);
    pool = (0, promise_1.createPool)({
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
