export interface NobetKayit {
    id: number;
    kullanici_id: number;
    kullanici_ad: string;
    tarih: string;
    olusturuldu: Date;
}
export declare const nobetService: {
    ekle(kullaniciId: number, kullaniciAd: string, tarih: string): Promise<NobetKayit | null>;
    bugunGetir(): Promise<NobetKayit | null>;
    haftalikGetir(): Promise<NobetKayit[]>;
};
