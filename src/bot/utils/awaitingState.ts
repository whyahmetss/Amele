type AwaitingAction = string; // Açık tip: gorev_ekle, gorev_ata_5, sablon_0, webhook_ekle vb.

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
