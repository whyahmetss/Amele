export interface Bug {
    id: number;
    aciklama: string;
    bildiren_id: number;
    bildiren_ad: string;
    durum: 'acik' | 'inceleniyor' | 'cozuldu';
    olusturuldu: Date;
}
export declare const bugService: {
    ekle(aciklama: string, kullaniciId: number, kullaniciAd: string): Promise<Bug>;
    liste(durum?: string): Promise<Bug[]>;
    gunlukSayim(): Promise<number>;
    formatMesaj(bug: Bug): string;
};
