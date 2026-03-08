export declare function gunlukRaporuBaslat(): void;
export declare function standupKaydet(kullaniciId: number, ad: string, plan: string): void;
export declare function standupTamamlananEkle(kullaniciId: number, tamamlanan: string): boolean;
export declare function standupGetir(kullaniciId: number): {
    plan: string;
    tamamlanan: string[];
    ad: string;
    tarih: Date;
};
export declare function standupBugunTumunuGetir(): Array<{
    ad: string;
    plan: string;
    tamamlanan: string[];
}>;
