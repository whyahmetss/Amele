export interface Gorev {
    id: number;
    metin: string;
    durum: 'bekliyor' | 'devam' | 'tamamlandi';
    ekleyen_id: number;
    ekleyen_ad: string;
    olusturuldu: Date;
    tamamlandi?: Date;
}
export declare const gorevService: {
    ekle(metin: string, kullaniciId: number, kullaniciAd: string): Promise<Gorev>;
    liste(durum?: string): Promise<Gorev[]>;
    bitir(id: number): Promise<Gorev | null>;
    sil(id: number): Promise<boolean>;
    istatistik(): Promise<{
        tamamlanan: number;
        bekleyen: number;
        buHafta: number;
        satirlar: string;
    }>;
    formatListeMesaji(gorevler: Gorev[]): string;
};
