export interface HataLog {
    id: number;
    servis: string;
    endpoint: string;
    hata_mesaji: string;
    stack_trace?: string;
    onem: 'dusuk' | 'orta' | 'yuksek' | 'kritik';
    olusturuldu: Date;
}
export declare const hataService: {
    kaydet(veri: Partial<HataLog>): Promise<HataLog>;
    gunlukSayim(): Promise<number>;
    formatMesaj(hata: Partial<HataLog>): string;
};
