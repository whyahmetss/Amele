/**
 * Kullanıcının "metin girişi bekleniyor" durumunu tutar.
 * Butona basınca → "Görev metnini yaz" → kullanıcı yazar → işlem yapılır.
 */
type AwaitingAction = 'gorev_ekle' | 'gorev_bitir' | 'gorev_sil' | 'bug' | 'ai' | 'standup_plan' | 'standup_bitti' | 'sinyal_long' | 'sinyal_short';

const store = new Map<string, { action: AwaitingAction }>();

function key(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

export function set(chatId: number, userId: number, action: AwaitingAction): void {
  store.set(key(chatId, userId), { action });
}

export function get(chatId: number, userId: number): AwaitingAction | null {
  return store.get(key(chatId, userId))?.action ?? null;
}

export function clear(chatId: number, userId: number): void {
  store.delete(key(chatId, userId));
}
