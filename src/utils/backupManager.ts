import { DexieChatDB } from '../db';

/**
 * 导出全部本地数据（localStorage + IndexedDB）为 JSON 文件并触发下载。
 */
export async function exportAppData(): Promise<void> {
  // 收集 localStorage
  const localStorageData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) localStorageData[k] = localStorage.getItem(k) ?? '';
  }

  // 收集 IndexedDB 各表数据
  const messages = await DexieChatDB.messages.toArray();
  const appSettings = await DexieChatDB.appSettings.toArray();
  const memories = await DexieChatDB.memories.toArray();

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: localStorageData,
    indexedDB: { messages, appSettings, memories }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fhjl_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 备份文件恢复全部本地数据，会覆盖现有数据。
 * @throws 若文件格式不正确会抛出错误
 */
export async function importAppData(file: File): Promise<void> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.version || !data.localStorage || !data.indexedDB) {
    throw new Error('文件格式不正确');
  }

  // 恢复 localStorage
  Object.entries(data.localStorage as Record<string, string>).forEach(([k, v]) => {
    localStorage.setItem(k, v);
  });

  // 恢复 IndexedDB
  const { messages, appSettings, memories } = data.indexedDB;

  if (Array.isArray(messages) && messages.length > 0) {
    await DexieChatDB.messages.clear();
    await DexieChatDB.messages.bulkAdd(
      messages.map((m: any) => { const { id, ...rest } = m; return rest; })
    );
  }

  if (Array.isArray(appSettings) && appSettings.length > 0) {
    await DexieChatDB.appSettings.clear();
    await DexieChatDB.appSettings.bulkAdd(appSettings);
  }

  if (Array.isArray(memories) && memories.length > 0) {
    await DexieChatDB.memories.clear();
    await DexieChatDB.memories.bulkAdd(
      memories.map((m: any) => { const { id, ...rest } = m; return rest; })
    );
  }
}
