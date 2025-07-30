import mysql from "mysql2/promise";
export declare function getDbConnection(): Promise<mysql.Connection>;
