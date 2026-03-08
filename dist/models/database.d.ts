import { QueryResult } from 'pg';
declare class Veritabani {
    private pool;
    constructor();
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
    saglik(): Promise<boolean>;
}
export declare const db: Veritabani;
export {};
