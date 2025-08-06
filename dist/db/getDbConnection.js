"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = getDbConnection;
const promise_1 = require("mysql2/promise");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
let pool = null;
async function getSecrets() {
    const secretName = process.env.DB_SECRET_NAME;
    const region = process.env.AWS_REGION;
    if (!secretName)
        throw new Error("Missing DB_SECRET_NAME env variable");
    if (!region)
        throw new Error("Missing AWS_REGION env variable");
    const client = new client_secrets_manager_1.SecretsManager({ region });
    const { SecretString } = await client.getSecretValue({
        SecretId: secretName,
    });
    if (!SecretString)
        throw new Error("SecretString is empty");
    let secrets;
    try {
        secrets = JSON.parse(SecretString);
    }
    catch {
        throw new Error("Invalid JSON in secret");
    }
    const { host, username, password, dbname } = secrets;
    if (!host || !username || !password || !dbname) {
        throw new Error("Incomplete DB credentials in Secrets Manager");
    }
    return { host, username, password, dbname };
}
async function getDbConnection() {
    if (pool)
        return pool;
    const { host, username, password, dbname: database } = await getSecrets();
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
