import { Pool } from "mysql2/promise";
export declare function getDbConnection(database?: string): Promise<Pool>;
