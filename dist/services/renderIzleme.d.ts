interface ServisDetay {
    url: string;
    ad: string;
    sonDurum: boolean | null;
    sonKontrol: Date | null;
}
export declare function servisleriKontrolEt(): Promise<void>;
export declare function servisleriGetir(): ServisDetay[];
export {};
