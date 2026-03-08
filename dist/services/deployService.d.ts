export interface Deploy {
    id: number;
    proje: string;
    branch: string;
    commit_sha: string;
    commit_msg: string;
    yapan: string;
    durum: 'basliyor' | 'basarili' | 'basarisiz';
    olusturuldu: Date;
}
export declare const deployService: {
    kaydet(veri: Partial<Deploy>): Promise<Deploy>;
    guncelle(id: number, durum: Deploy["durum"]): Promise<void>;
    son(limit?: number): Promise<Deploy[]>;
    tetikle(): Promise<boolean>;
    formatMesaj(deploy: Partial<Deploy>, durum: string): string;
};
