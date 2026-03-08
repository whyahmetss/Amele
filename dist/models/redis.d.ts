declare class RedisIstemci {
    baglan(): Promise<void>;
    al(anahtar: string): Promise<string | null>;
    kaydet(anahtar: string, deger: string, ttlSaniye?: number): Promise<void>;
    sil(anahtar: string): Promise<void>;
    artir(anahtar: string): Promise<number>;
    ttlAyarla(anahtar: string, saniye: number): Promise<void>;
    saglik(): Promise<boolean>;
}
export declare const redis: RedisIstemci;
export {};
