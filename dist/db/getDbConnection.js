"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbConnection = getDbConnection;
const promise_1 = __importDefault(require("mysql2/promise"));
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
let cachedSecret;
let cachedConnection = null;
async function getDbConfig() {
    if (cachedSecret)
        return cachedSecret;
    const secrets = new client_secrets_manager_1.SecretsManager({ region: "ap-southeast-2" });
    const secretName = process.env.DB_SECRET_NAME;
    const res = await secrets.getSecretValue({ SecretId: secretName });
    if (!res.SecretString)
        throw new Error("Secret string missing");
    cachedSecret = JSON.parse(res.SecretString);
    return cachedSecret;
}
async function getDbConnection() {
    if (cachedConnection)
        return cachedConnection;
    const config = await getDbConfig();
    cachedConnection = await promise_1.default.createConnection({
        host: process.env.DB_HOST,
        user: config.username,
        password: config.password,
        database: config.dbname,
        port: 3306,
    });
    return cachedConnection;
}
