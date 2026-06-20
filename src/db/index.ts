import Dexie, { type Table } from 'dexie';

export interface ChatMessage {
  id?: number;
  contactId: string;
  fullTimestamp: number;
  text: string;
  isMe: boolean;
  msgType?: string;
  recalledContent?: string;
  mindCard?: any;
}

export interface AppSetting {
  key: string;
  value: any;
}

export interface Memory {
  id?: number;
  contactId: string;
  summary: string;
  timestamp: number;
}

export class ChatDatabase extends Dexie {
  messages!: Table<ChatMessage>;
  appSettings!: Table<AppSetting, string>;
  memories!: Table<Memory>;

  constructor() {
    super('WeChatSimulator');
    this.version(3).stores({
      messages: '++id, contactId, fullTimestamp, [contactId+fullTimestamp]',
      appSettings: 'key',
      memories: '++id, contactId, timestamp'
    });
  }
}

// ===== 聊天消息数据库 =====
export const DexieChatDB = new ChatDatabase();

// 统一使用 IndexedDB (Dexie)
export const ChatDB = DexieChatDB;
export const AppDB = DexieChatDB; // Alias for compatibility
export const ChatDBReady = DexieChatDB.open().then(() => {
  console.log('✅ ChatDB 初始化成功');
  return true;
}).catch(error => {
  console.error('❌ ChatDB 初始化失败:', error);
  return false;
});

// 导出到全局
if (typeof window !== 'undefined') {
  (window as any).ChatDB = ChatDB;
  (window as any).AppDB = AppDB;
  (window as any).ChatDBReady = ChatDBReady;
  (window as any).DexieChatDB = DexieChatDB;
}
