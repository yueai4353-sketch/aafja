import { DexieChatDB } from '../db';

// ── 压缩 / 解压工具（浏览器原生 CompressionStream，Chrome 80+ / Firefox 113+ / Safari 16.4+）──

async function compressToGzip(str: string): Promise<Blob> {
  const encoded = new TextEncoder().encode(str);
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(encoded);
  writer.close();
  return new Response(cs.readable).blob();
}

async function decompressGzip(blob: Blob): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(await blob.arrayBuffer());
  writer.close();

  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(merged);
}

// ── 导出 ──────────────────────────────────────────────────────────────────────

/**
 * 导出全部本地数据（localStorage + IndexedDB），
 * 经 gzip 压缩后保存为 .fhjl 文件并触发下载。
 */
export async function exportAppData(): Promise<void> {
  // 收集 localStorage
  const localStorageData: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) localStorageData[k] = localStorage.getItem(k) ?? '';
  }

  // 收集 IndexedDB 各表数据
  const messages    = await DexieChatDB.messages.toArray();
  const appSettings = await DexieChatDB.appSettings.toArray();
  const memories    = await DexieChatDB.memories.toArray();

  const exportData = {
    version: 2,                            // v2 = gzip 压缩格式
    exportedAt: new Date().toISOString(),
    localStorage: localStorageData,
    indexedDB: { messages, appSettings, memories }
  };

  const jsonStr  = JSON.stringify(exportData);
  const blob     = await compressToGzip(jsonStr);
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = `fhjl_backup_${new Date().toISOString().slice(0, 10)}.json.gz`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 导入 ──────────────────────────────────────────────────────────────────────

/**
 * 从备份文件恢复全部本地数据，会覆盖现有数据。
 * 支持新版压缩格式（.fhjl）和旧版 JSON 格式（.json）。
 * @throws 若文件格式不正确会抛出错误
 */
export async function importAppData(file: File): Promise<void> {
  let text: string;

  // 根据文件名后缀判断是否需要解压
  const isCompressed = file.name.endsWith('.fhjl') || file.name.endsWith('.gz');
  if (isCompressed) {
    try {
      text = await decompressGzip(file);
    } catch (e: any) {
      throw new Error('文件解压失败，请确认文件未损坏：' + (e.message || ''));
    }
  } else {
    text = await file.text();
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('文件格式不正确，JSON 解析失败');
  }

  if (!data.version || !data.localStorage || !data.indexedDB) {
    throw new Error('文件格式不正确');
  }

  // 恢复 localStorage（先清空以释放空间，避免叠加后超出配额）
  localStorage.clear();
  Object.entries(data.localStorage as Record<string, string>).forEach(([k, v]) => {
    try {
      localStorage.setItem(k, v);
    } catch (e: any) {
      console.warn(`[恢复警告] 无法写入 localStorage 键: ${k}，可能是配额不足。`, e);
    }
  });

  // 恢复 IndexedDB
  const { messages, appSettings, memories } = data.indexedDB;

  try {
    if (Array.isArray(messages) && messages.length > 0) {
      await DexieChatDB.messages.clear();
      // 分批写入，防止单次 bulkAdd 事务过大
      const batchSize = 1000;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize).map((m: any) => {
          const { id, ...rest } = m;
          return rest;
        });
        await DexieChatDB.messages.bulkAdd(batch);
      }
    }
  } catch (e: any) {
    console.error('消息记录导入失败', e);
    throw new Error('消息导入失败，可能是空间不足：' + (e.message || ''));
  }

  try {
    if (Array.isArray(appSettings) && appSettings.length > 0) {
      await DexieChatDB.appSettings.clear();
      await DexieChatDB.appSettings.bulkAdd(appSettings);
    }
  } catch (e: any) {
    console.warn('应用设置导入失败', e);
  }

  try {
    if (Array.isArray(memories) && memories.length > 0) {
      await DexieChatDB.memories.clear();
      await DexieChatDB.memories.bulkAdd(
        memories.map((m: any) => { const { id, ...rest } = m; return rest; })
      );
    }
  } catch (e: any) {
    console.warn('记忆数据导入失败', e);
  }
}
