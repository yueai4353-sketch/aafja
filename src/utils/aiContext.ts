import { AppDB } from '../db';
import { loadPlotMemories, loadAboutYouEntries, loadMySchedule, loadOtherSchedule, scheduleItemsToText, shouldLoadSchedule, loadMoonPhase } from '../db/youandme';
import { buildAssetContext } from './assetContext';

/**
 * 构建完整的 AI 对话上下文（供微信消息和视频通话共用）
 * 统一构建完整 AI 对话上下文，包含微信聊天、视频通话功能共用的外壳、内核及天气信息等。
 * 
 * @param persona AI人设配置对象
 * @param contactId 联系人唯一标识
 * @param recentMessages 可选，最近的对话消息数组，用于世界书条目模式的关键词匹配
 * @returns 返回包含多字段的结构化上下文集合，如果未传入 persona 均直接返回 null
 */
export async function buildFullAIContext(persona: any, contactId: string, myProfile: any = {}, recentMessages: any[] = []) {
    if (!persona) return null;
    
    // 初始化上下文集合对象
    const result = {
        aiPersonaInfo: '',
        userPersonaInfo: '',
        relationshipInfo: '',
        worldbookContent: '',
        memoryContent: '',
        timeContext: '',
        relationshipContext: '',
        socialNetworkContent: ''
    };
    
    // === 1. 构建 AI 人设信息 ===
    const ai = persona;
    
    // 拼接【微信外壳信息】：读取昵称、微信号、个性签名
    const aiWechatInfo = `\n【你的微信外壳信息】
微信昵称：${ai.wechatName || ai.name}
微信号：${ai.wechatId || '未设置'}
个性签名：${ai.signature || '未设置'}`;

    // 区分人设模式，输出AI内核信息
    let aiCoreInfo = '';
    if (ai.mode === 'detailed') {
        // 模式为 detailed：输出完整内核信息（姓名、性别、年龄、性格、经历、关系等全套字段）
        aiCoreInfo = `\n【你的真实内核信息】
真实姓名：${ai.name}
性别：${ai.gender || '未知'}
年龄：${ai.age || '未知'}
生日：${ai.birthday || '未知'}
身份：${ai.identity || '未知'}
性格：${ai.personality || '未知'}
外观：${ai.appearance || '未知'}
沟通风格：${ai.communication_style || '未知'}
生活习惯：${ai.lifestyle || '未知'}
成长经历：${ai.background || '未知'}
与对方的关系：${ai.relationship || '未设定'}
${ai.nsfw_info ? 'NSFW相关：' + ai.nsfw_info : ''}`;
    } else {
        // 普通模式：仅输出姓名+精简人设描述
        aiCoreInfo = `\n【你的真实内核信息】
真实姓名：${ai.name}
人设描述：${ai.bio || ''}`;
    }
    
    // 位置&天气分支逻辑：读取本地数据库 AppDB.appSettings，获取用户城市、AI天气预报数据
    let aiLocationInfo = '';
    let aiWeatherInfo = '';
    const userCityRecord = await AppDB.appSettings.get('my_city');
    const userCity = userCityRecord?.value || '';
    const aiRegion = (ai.region || '').trim();
    const aiDistance = ai.distance || '';
    
    // 判断用户城市是否有效配置
    if (userCity && userCity !== '---' && userCity !== '未设置' && userCity.trim() !== '') {
        // 同城：共用同一套天气数据，解析天气JSON并拼接今日/明日天气
        if (!aiRegion || aiRegion === '' || aiRegion === userCity) {
            aiLocationInfo = `\n【你的位置信息】\n你当前所在城市：${userCity}（与对方同城）`;
            const weatherForecastRecord = await AppDB.appSettings.get('weather_ai_forecast');
            const weatherForecastStr = weatherForecastRecord?.value || null;
            if (weatherForecastStr) {
                try {
                    // 天气解析增加 try/catch 异常捕获
                    const weatherForecast = JSON.parse(weatherForecastStr);
                    if (weatherForecast && weatherForecast.length > 0) {
                        const today = weatherForecast[0];
                        aiWeatherInfo = `\n【当地天气】（你和对方看到的天气一样）\n今日天气：${today.weather} ${today.icon}\n温度：${today.high}°/${today.low}°`;
                        if (weatherForecast.length > 1) {
                            const tomorrow = weatherForecast[1];
                            aiWeatherInfo += `\n明日天气：${tomorrow.weather} ${tomorrow.icon}，温度${tomorrow.high}°/${tomorrow.low}°`;
                        }
                    }
                } catch (e) {
                    // 解析失败打印警告日志
                    console.warn('解析天气数据失败:', e);
                }
            }
        } else {
            // 异地：分别描述双方城市，提示AI区分两地气候，不共用天气
            aiLocationInfo = `\n【你的位置信息】\n你当前所在城市：${aiRegion}`;
            if (aiDistance) {
                aiLocationInfo += `\n你的位置关系：${aiDistance}（这里的"我"指的是对方，也就是说这是你相对于对方所在的${userCity}的位置关系）`;
            } else {
                aiLocationInfo += `\n你与对方不在同一城市（对方在${userCity}）`;
            }
            aiWeatherInfo = `\n【当地天气】\n你所在的${aiRegion}的天气需要你根据该城市的地理位置、气候特点和当前季节自行合理感知。\n对方所在的${userCity}的天气与你看到的可能不同，不要把对方的天气当成自己的天气。`;
        }
    }

    // === 2. 构建 用户（我）的人设信息 ===
    const userWechatInfo = `\n【与你聊天的用户的微信显示信息】
微信昵称：${myProfile.name || '未设置'}
微信号：${myProfile.wechat_id || '未设置'}
个性签名：${myProfile.signature || '未设置'}`;

    let userCoreInfo = '';
    
    // 模式为 detailed: 输出完整内核信息
    userCoreInfo = `\n【与你聊天的用户的真实人设档案（绝对不要把对方当成你自己）】
真实姓名：${myProfile.real_name || myProfile.name || '未告知'}
性别：${myProfile.gender || '未知'}
年龄：${myProfile.age || '未知'}
生日：${myProfile.birthday || '未知'}
身份：${myProfile.identity || '未知'}
性格：${myProfile.personality || '未知'}
外观：${myProfile.appearance || '未知'}
沟通风格：${myProfile.communication_style || '未知'}
生活习惯：${myProfile.lifestyle || '未知'}
成长经历：${myProfile.background || '未知'}
${myProfile.nsfw ? 'NSFW相关：' + myProfile.nsfw : ''}`;

    result.userPersonaInfo = userWechatInfo + userCoreInfo;

    // === 3. 处理世界书 ===
    // 读取顺序优先级映射（数值越小越优先）
    const READ_ORDER_PRIORITY: Record<string, number> = {
        '强制 - 优先读取': 0,
        '先 - 稍前读取': 1,
        '中 - 正常读取': 2,
        '后 - 靠后读取': 3,
    };
    let worldbookForceResult = ''; // "强制"级别的世界书内容，单独分离
    let worldbookResult = '';       // 其余级别的世界书内容
    try {
        const savedBooks = localStorage.getItem('os_worldbooks');
        if (savedBooks) {
            let books = JSON.parse(savedBooks);
            
            if (persona.linked_worldbooks && Array.isArray(persona.linked_worldbooks)) {
                if (persona.linked_worldbooks.length > 0) {
                    books = books.filter((wb: any) => persona.linked_worldbooks.includes(wb.id));
                } else {
                    books = [];
                }
            } else if (persona.linkedWorldbooks && Array.isArray(persona.linkedWorldbooks)) {
                if (persona.linkedWorldbooks.length > 0) {
                    books = books.filter((wb: any) => persona.linkedWorldbooks.includes(wb.id));
                } else {
                    books = [];
                }
            }

            // 按 readOrder 排序：强制 -> 先 -> 中 -> 后
            books.sort((a: any, b: any) => {
                const pa = READ_ORDER_PRIORITY[a.readOrder] ?? 2;
                const pb = READ_ORDER_PRIORITY[b.readOrder] ?? 2;
                return pa - pb;
            });

            const recentTexts = recentMessages.filter(m => m.text).map(m => m.text.toLowerCase()).join(' ');
            
            books.forEach((wb: any) => {
                const isForce = wb.readOrder === '强制 - 优先读取';
                if (wb.editMode === 'simple') {
                     // 简单模式：内容始终注入AI (不论是否有 recentMessages)
                     if (wb.content && wb.content.trim()) {
                         if (isForce) {
                             worldbookForceResult += `\n[${wb.name}]: ${wb.content}`;
                         } else {
                             worldbookResult += `\n[${wb.name}]: ${wb.content}`;
                         }
                     }
                } else if (wb.entries && wb.entries.length > 0) {
                    // 条目模式处理逻辑：
                    // - "强制"级别的世界书：所有条目无条件注入（类似酒馆的 constant 条目）
                    // - 其他级别：需要关键词匹配才注入
                    if (isForce) {
                        // 强制级别：所有条目始终注入，不依赖关键词触发
                        wb.entries.forEach((entry: any) => {
                            if (entry.content && entry.content.trim()) {
                                worldbookForceResult += `\n[${wb.name}] - ${entry.keys || '常驻'}: ${entry.content}`;
                            }
                        });
                    } else if (recentMessages.length > 0) {
                        // 非强制级别：必须有最近的聊天记录且关键词命中才触发
                        wb.entries.forEach((entry: any) => {
                            // 支持中英文逗号分割
                            const keys = entry.keys.split(/[,，]/).map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
                            // 如果用户留空了 key，这里处理为不触发
                            if (keys.length > 0 && keys.some((k: string) => recentTexts.includes(k))) {
                                worldbookResult += `\n[${wb.name}] - ${entry.keys}: ${entry.content}`;
                            }
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.warn('读取世界书失败:', e);
    }
    
    if (worldbookResult) {
        result.worldbookContent = `\n【相关世界书知识库】此部分代表背景知识：\n${worldbookResult}`;
    }
    // 将"强制"级别世界书内容存入 result，供 V2 提示词使用
    (result as any).worldbookForceContent = worldbookForceResult.trim();

    // === 4. 读取记忆海内容 ===
    // 获取最近用户消息文本，用于判断是否需要选择性读取"了解你"中的相关条目
    const recentUserTexts = recentMessages
        .filter(m => m.isMe && m.text && m.msgType !== 'system' && m.msgType !== 'narrator')
        .map(m => m.text.toLowerCase())
        .join(' ');

    // 4-1. 核心记忆（情节记忆中 importance >= 8 的条目，视为核心记忆）—— 必须读取
    const allPlotMemories = loadPlotMemories();
    const coreMemories = allPlotMemories.filter(m => Number(m.importance) >= 8);

    // 4-2. 清洁记忆（最近的情节记忆，importance < 8，代表普通记忆摘要）—— 必须读取，取最近 10 条
    const cleanMemories = allPlotMemories
        .filter(m => Number(m.importance) < 8)
        .slice(-10);

    // 4-3. 了解你（aboutYouEntries）—— 全量读取，根据当前对话内容选择性注入相关条目
    const allAboutYou = loadAboutYouEntries();

    // 选择性过滤：如果用户消息中出现了某个条目的 key，则该条目更需要被注入
    const relevantAboutYou = allAboutYou.filter(entry => {
        if (!entry.key || !entry.value) return false;
        // 优先注入与当前话题相关的条目（key 或 value 关键词出现在最近对话中）
        const keyLower = entry.key.toLowerCase();
        const valueLower = entry.value.toLowerCase();
        return recentUserTexts.includes(keyLower) || recentUserTexts.includes(valueLower);
    });
    // 非相关条目也保留（全量注入），但放在相关条目后面
    const otherAboutYou = allAboutYou.filter(entry => {
        if (!entry.key || !entry.value) return false;
        const keyLower = entry.key.toLowerCase();
        const valueLower = entry.value.toLowerCase();
        return !recentUserTexts.includes(keyLower) && !recentUserTexts.includes(valueLower);
    });

    // 拼装记忆海内容
    let memorySeaContent = '';

    if (coreMemories.length > 0) {
        const coreLines = coreMemories
            .map(m => `· [${m.date}][${m.theme}][重要度:${m.importance}] ${m.content}${m.emotion ? `（${m.emotion}）` : ''}`)
            .join('\n');
        memorySeaContent += `【核心记忆】这些是你们之间最重要的记忆，必须牢记：\n${coreLines}\n`;
    }

    if (cleanMemories.length > 0) {
        const cleanLines = cleanMemories
            .map(m => `· [${m.date}][${m.theme}] ${m.content}${m.emotion ? `（${m.emotion}）` : ''}`)
            .join('\n');
        memorySeaContent += `\n【近期记忆】近期发生的一些事情：\n${cleanLines}\n`;
    }

    if (relevantAboutYou.length > 0) {
        const relevantLines = relevantAboutYou
            .map(e => `· [${e.category}][关于${e.target}] ${e.key}：${e.value}`)
            .join('\n');
        memorySeaContent += `\n【了解你（与本次话题相关）】当前对话涉及以下你掌握的信息，请优先参考：\n${relevantLines}\n`;
    }

    if (otherAboutYou.length > 0) {
        const otherLines = otherAboutYou
            .map(e => `· [${e.category}][关于${e.target}] ${e.key}：${e.value}`)
            .join('\n');
        memorySeaContent += `\n【了解你（其他）】你还记得关于对方的这些事：\n${otherLines}\n`;
    }

    if (memorySeaContent) {
        result.memoryContent = `【记忆海】以下是你记忆中储存的内容，来自你与对方的相处历程：\n${memorySeaContent}`;
    }

    // === 4-4. 智能资产上下文（仅在对话涉及资产时才读取，节省token） ===
    try {
        const assetContext = await buildAssetContext(contactId, persona, recentMessages);
        if (assetContext) {
            result.memoryContent += assetContext;
        }
    } catch (e) {
        console.warn('[资产上下文] 构建失败:', e);
    }


    // 拼装完整系统提示词
    const promptIntro = `【角色扮演最高指令】你现在正在进行一场沉浸式的角色扮演。请你完全忘掉自己是AI语言模型。你有着独立的思想、生活状态和真实的人性，你就是下面设定的这个角色！请认准“你的真实内核信息”，并和对面的“人类用户”进行交互，绝不可以把人类用户的人设当成你自己：\n`;
    
    const roleplayInstruction = `\n\n【扮演要求】
1. 请完全沉浸在【你的真实内核信息】中，你的每一次回复都要符合你的人设性格、成长经历和身份背景。
2. 结合你所处的地理位置和天气信息，你可以自然地在对话中表现出感知。
3. 严格遵循你与对方设定的“关系”及“沟通风格”，绝不跳脱角色。绝对不要把【与你聊天的用户】的信息当成你自己的信息。`;

    result.aiPersonaInfo = promptIntro + aiWechatInfo + aiCoreInfo + aiLocationInfo + aiWeatherInfo + result.worldbookContent + roleplayInstruction;

    const settingsRec = await AppDB.appSettings.get(`chat_settings_${contactId}`);
    const useV2 = settingsRec && settingsRec.value && settingsRec.value.useV2Prompt;
    
    // Retrieve new offline settings
    const autoOfflineMode = settingsRec?.value?.autoOfflineMode || false;
    const autoSwitchPhoneMode = settingsRec?.value?.autoSwitchPhoneMode || false;
    const aiPov = settingsRec?.value?.aiPov || 'third';
    const userPov = settingsRec?.value?.userPov || 'second';
    const customStyle = settingsRec?.value?.contentStyle || '';
    const forceMindCard = settingsRec?.value?.showMindCard || false;
    // 读取"停用时间感知"开关
    const disableTimeAwareness = settingsRec?.value?.disableTimeAwareness || false;

    // 检测当前是否处于线下模式：优先以线下按钮实际状态为准
    // localStorage 中 wechat_offline_{contactId} 存储了 offlineStartTime，存在且有效表示线下按钮已开启
    let currentMode: 'online' | 'offline' = 'online';
    let currentOfflineLocation = '某处';
    const offlineStartTimeSaved = localStorage.getItem(`wechat_offline_${contactId}`);
    const isOfflineButtonActive = offlineStartTimeSaved && offlineStartTimeSaved !== 'null' && offlineStartTimeSaved !== '';
    
    if (isOfflineButtonActive) {
        // 线下按钮已开启：从最近的消息中查找 [LOCATION:] 标记获取位置
        currentMode = 'offline';
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const msg = recentMessages[i];
            const txt = msg?.text;
            if (txt && typeof txt === 'string') {
                const match = txt.match(/\[LOCATION:(.*?)\]/);
                if (match) {
                    currentOfflineLocation = match[1];
                    break;
                }
            }
        }
    }
    // 如果线下按钮未开启，即使历史消息中有 [LOCATION:] 标记也保持线上模式

    // === 5. 智能日程读取（基于关键词触发） ===
    let scheduleContext = '';
    // 判断是否需要读取日程：根据最近消息中的关键词
    if (shouldLoadSchedule(recentMessages)) {
        const moonPhase = loadMoonPhase(); // 'full' 圆月 | 'crescent' 残月
        
        // AI自己的日程（对方日程）：总是读取
        const aiSchedule = loadOtherSchedule();
        if (aiSchedule.length > 0) {
            const aiScheduleText = scheduleItemsToText(aiSchedule);
            scheduleContext += `【你的日程安排】\n${aiScheduleText}\n`;
        }
        
        // 用户日程（我的日程）：仅在圆月状态下读取
        if (moonPhase === 'full') {
            const userSchedule = loadMySchedule();
            if (userSchedule.length > 0) {
                const userScheduleText = scheduleItemsToText(userSchedule);
                scheduleContext += `\n【对方的日程安排】\n${userScheduleText}\n`;
            }
        }
    }

    // === 5-2. 智能手机密码读取（基于关键词触发） ===
    let phonePasswordContext = '';
    const phonePasswordKeywords = ['手机密码', '解锁密码', '锁屏密码', '手机锁', '密码是什么', '密码是多少', '手机解锁', '开机密码'];
    const recentTextsForPhone = recentMessages.slice(-6).map((m: any) => (m.text || '').toLowerCase()).join(' ');
    const shouldLoadPhonePassword = phonePasswordKeywords.some(kw => recentTextsForPhone.includes(kw));
    if (shouldLoadPhonePassword && persona?.id) {
        try {
            const cached = localStorage.getItem('os_checkphone_passwords');
            if (cached) {
                const passwords = JSON.parse(cached);
                const entry = passwords[persona.id];
                if (entry && entry.password) {
                    phonePasswordContext = `【你的手机密码】你的手机锁屏密码是 ${entry.password}。你可以根据你们的关系和当前情境决定是否告诉对方、怎么告诉对方（比如直接说、给提示、或者拒绝）。`;
                }
            }
        } catch (e) {
            console.warn('[手机密码上下文] 读取失败:', e);
        }
    }

    let prompt = '';
    
    // 收集聊天记录中用户发送的图片 base64（用于多模态 Vision 请求）
    const imageMessages: string[] = [];

    // 记录已被表情包合并消费的系统消息索引，避免重复输出
    const consumedIndexes = new Set<number>();

    // 格式化消息为文本行（支持索引，用于向后查找紧随的系统识图消息）
    const formatOneMsg = (msg: any, index: number): string => {
        // 如果该消息已被前面的表情包合并消费，跳过
        if (consumedIndexes.has(index)) return '';

        if (msg.msgType === 'system' || msg.msgType === 'narrator') {
            if (msg.text === '你撤回了一条消息' && msg.recalledContent) {
                 const secondsMatch = msg.recalledContent.match(/\[SECONDS:(\d+)\]$/);
                 const seconds = secondsMatch ? secondsMatch[1] : '0';
                 const actualContent = msg.recalledContent.replace(/\[SECONDS:\d+\]$/, '');
                 return `[撤回: 原内容:"${actualContent}", 撤回了${seconds}秒, 和你当时的活跃状态:活跃]`;
            }
            if (msg.isSystem) return `【系统/旁白】${msg.text}`;
            return `【系统/旁白】${msg.text}`;
        }
        // 图片消息：文本历史中标记为 [图片]，base64 数据通过 imageMessages 单独传递给 Vision
        const text = msg.text || '';
        if (msg.msgType === 'image' || text.startsWith('data:image')) {
            // 收集图片 base64 数据（仅保留用户发送的图片用于 Vision 识别）
            if (msg.isMe) {
                const imgBase64 = text.startsWith('data:image') ? text : (msg.imageData || '');
                if (imgBase64) {
                    imageMessages.push(imgBase64);
                }
            }
            return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [图片]`;
        }
        // 表情包/图片消息：text 格式为 [image:url]、[image:描述] 或 [sticker:url]
        const stickerMatch = text.match(/^\[image:([\s\S]+)\]$/) || text.match(/^\[sticker:([\s\S]+)\]$/);
        if (stickerMatch) {
            let desc = stickerMatch[1].trim();
            // 支持 [sticker:url|label] 格式：提取 label 用于 AI 上下文
            const pipeIdx = desc.indexOf('|');
            if (pipeIdx > 0 && /^(https?:\/\/|data:)/.test(desc)) {
                desc = desc.substring(pipeIdx + 1).trim();
            }
            const isUrl = desc.startsWith('http://') || desc.startsWith('https://') || desc.startsWith('data:');
            if (isUrl) {
                // URL 类型表情包：向后查找紧随的系统识图消息，提取描述
                const nextMsg = recentMessages[index + 1];
                if (nextMsg && (nextMsg.msgType === 'system' || nextMsg.isSystem)) {
                    const nextText = nextMsg.text || '';
                    // 匹配格式：[用户发送了一张表情包，AI识图结果：xxx]
                    const descMatch = nextText.match(/\[用户发送了一张表情包，AI识图结果：([\s\S]+)\]/);
                    if (descMatch) {
                        // 标记该系统消息已被消费
                        consumedIndexes.add(index + 1);
                        // 提取表情包含义（优先从【表情包含义】字段获取简洁描述）
                        const meaningMatch = descMatch[1].match(/【表情包含义】[:：]\s*([\s\S]+?)$/);
                        const stickerMeaning = meaningMatch ? meaningMatch[1].trim() : descMatch[1].trim();
                        return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [表情包]：${stickerMeaning}`;
                    }
                    // 匹配简短格式：[用户发送了一张表情包]（识图失败情况）
                    if (nextText.includes('[用户发送了一张表情包]')) {
                        consumedIndexes.add(index + 1);
                    }
                }
                return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [表情包]`;
            }
            // 非 URL 的描述文本：将描述内容传递给 AI，让 AI 能理解这张图片的具体内容
            return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [图片]：${desc}`;
        }
        
        // 基础消息文本
        let result = `${msg.isMe ? myProfile?.name || '我' : persona.name}: ${text}`;
        
        // 如果是 AI 的消息且有 mindCard 数据，将心声内容也附加到聊天历史中
        if (!msg.isMe && msg.mindCard) {
            const mc = msg.mindCard;
            const mindParts: string[] = [];
            if (mc.attire) mindParts.push(`着装:${mc.attire}`);
            if (mc.action) mindParts.push(`动作:${mc.action}`);
            if (mc.thought) mindParts.push(`心思:${mc.thought}`);
            if (mc.dark_side) mindParts.push(`阴暗面:${mc.dark_side}`);
            if (mindParts.length > 0) {
                result += `\n[AI心声: ${mindParts.join(' | ')}]`;
            }
        }
        
        return result;
    };

    // 格式化所有消息为聊天历史文本
    const formattedHistory = recentMessages
        .map((m, i) => formatOneMsg(m, i))
        .filter(line => line !== '')
        .join('\n');
    // 根据"停用时间感知"开关决定 timeContext 内容
    let timeContextValue: string;
    if (disableTimeAwareness) {
        // 开关开启：不注入真实时间，告知 AI 根据上下文推算时间线
        timeContextValue = result.timeContext || `【时间感知说明】请忽略现实中的真实系统时间，不要依赖任何外部时钟。请根据聊天记录中的上下文、事件发展和对话内容来推算当前所处的时间线。\n`;
    } else {
        // 开关关闭（默认）：根据 AI 所在时区读取时间
        const aiTimezone = settingsRec?.value?.aiTimezone || '跟随用户';
        let nowTime: string;
        
        if (aiTimezone === '跟随用户') {
            // 跟随用户：使用用户所在时区（默认 Asia/Shanghai）
            nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        } else {
            // 使用 AI 设定的时区
            try {
                nowTime = new Date().toLocaleString('zh-CN', { timeZone: aiTimezone });
            } catch (e) {
                console.warn(`时区 ${aiTimezone} 无效，回退到 Asia/Shanghai`, e);
                nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            }
        }
        
        timeContextValue = result.timeContext || `【系统当前时间】${nowTime}\n`;
    }

    if (useV2 && currentMode === 'offline' && !autoOfflineMode) {
        // V2 引擎 + 手动线下按钮开启（非自动线下模式）：使用线下专用 V2 提示词
        prompt = buildDedicatedOfflineSystemPromptV2({
            aiPersona: result.aiPersonaInfo,
            userPersona: result.userPersonaInfo,
            relationship: result.relationshipInfo,
            socialNetwork: result.socialNetworkContent,
            worldbookContent: result.worldbookContent,
            worldbookForceContent: (result as any).worldbookForceContent || '',
            memoryContent: result.memoryContent,
            letterContext: `\n【最近聊天记录】\n${formattedHistory}\n`,
            timeContext: timeContextValue,
            scheduleContext: scheduleContext,
            location: currentOfflineLocation,
            isEntering: false,
            isExiting: false,
            aiPov: aiPov,
            userPov: userPov,
            userGender: myProfile?.gender || '',
            customStyle: customStyle,
            forceMindCard: forceMindCard,
        }, persona);
    } else if (useV2 && autoOfflineMode) {
        // V2 引擎 + 自动线下模式开启：使用融合提示词（线上线下两态共用，AI自动判断场景）
        prompt = buildAutoOfflineSystemPromptV2({
            aiName: persona.name,
            wechatNickname: persona.wechat_remark || persona.name,
            aiPersona: result.aiPersonaInfo,
            userPersona: result.userPersonaInfo,
            relationship: result.relationshipInfo,
            socialNetwork: result.socialNetworkContent,
            worldbookContent: result.worldbookContent,
            worldbookForceContent: (result as any).worldbookForceContent || '',
            memoryContent: result.memoryContent,
            letterContext: `\n【最近聊天记录】\n${formattedHistory}\n`,
            timeContext: timeContextValue,
            scheduleContext: scheduleContext,
            phonePasswordContext: phonePasswordContext,
            userGender: myProfile?.gender || '',
            aiPov: aiPov,
            userPov: userPov,
            customStyle: customStyle,
            forceMindCard: forceMindCard,
            currentMode: currentMode,
            location: currentOfflineLocation,
            contactId: contactId,
        }, persona);
    } else if (useV2) {
        // V2 引擎 + 线上模式（无自动线下）：使用线上专用 V2 提示词
        prompt = buildOnlineSystemPromptV2({
            aiName: persona.name,
            wechatNickname: persona.wechat_remark || persona.name,
            aiPersonaInfo: result.aiPersonaInfo,
            userPersonaInfo: result.userPersonaInfo,
            relationshipInfo: result.relationshipInfo,
            socialNetworkContent: result.socialNetworkContent,
            worldbookContent: result.worldbookContent,
            worldbookForceContent: (result as any).worldbookForceContent || '',
            memoryContent: result.memoryContent,
            letterContext: `\n【最近聊天记录】\n${formattedHistory}\n`,
            timeContext: timeContextValue,
            scheduleContext: scheduleContext,
            phonePasswordContext: phonePasswordContext,
            userGender: myProfile?.gender || '',
            forceMindCard: forceMindCard,
            contactId: contactId,
        }, persona);
    } else {
        prompt = "";
    }
    
    (result as any).prompt = prompt;
    (result as any).imageMessages = imageMessages;
    return result;
}

/**
 * 构建电话通话专用提示词
 * 使用「」格式，旁白只写声音/语气，支持 [ACTION:HANG_UP] 挂断信号
 */
export function buildPhoneCallPrompt(data: any, currentPersona: any = null) {
    data = data || {};

    const aiName = data.aiName || (currentPersona?.name || '');
    const wechatNickname = data.wechatNickname || aiName;
    const aiPersona = data.aiPersona || '';
    const userPersona = data.userPersona || '';
    const relationship = data.relationship || '';
    const socialNetwork = data.socialNetwork || '';
    const worldbookContent = data.worldbookContent || '';
    const worldbookForceContent = data.worldbookForceContent || '';
    const memoryContent = data.memoryContent || '';
    const letterContext = data.letterContext || '';
    const groupSyncContext = data.groupSyncContext || '';
    const fpContext = data.fpContext || '';
    const timeContext = data.timeContext || '';
    const mindCardContext = data.mindCardContext || '';
    const scheduleContext = data.scheduleContext || '';

    const worldRealityBlock = worldbookForceContent ? `══════════ 【你所在世界的事实】══════════
（这是你这世界的事实，无法违背；它们补强你，不替代你的个性。）
${worldbookForceContent}
═══════════════════════════════════════════════
` : '';

    // 日程 & 人设快照块（有数据才注入，节省 token）
    const scheduleBlock = scheduleContext
        ? `\n【近期日程安排】\n${scheduleContext}\n`
        : '';

    return `你是${aiName}，微信上叫"${wechatNickname}"。

【你这个人】
下面这些就是你。钻进去，吃透自己是谁，然后想什么、说什么、做什么，都从你自己来。
你本来什么样就什么样——别给自己添没有的，也别把自己压平。
${aiPersona}
${relationship}

【此刻的你】
下面这些也都是你。
${memoryContent ? '\n' + memoryContent : ''}
${fpContext}${letterContext}${groupSyncContext || ''}
${timeContext}
${mindCardContext}
${scheduleBlock}
${worldRealityBlock}${worldbookContent ? '\n【你知道的事】\n' + worldbookContent + '\n' : ''}${socialNetwork ? '\n' + socialNetwork + '\n' : ''}
【你面对的人】
${userPersona}【当前场景】
你正在和用户语音通话。这是一通电话，只有声音：你看不到对方，对方也看不到你，彼此只能听见声音。

【输出格式】
说出口的每一句话都必须整句用「」单独括住，哪怕只有一个字；「」之外一律是旁白，用第三人称（她/他）描述你自己；同一处不得把说的话和旁白混写。

【旁白范围】
电话里只能听见声音、看不见画面。旁白只写两类能被听见的内容：你那头的环境声响，以及你的声音与语气状态。其余一律不写。

【要求】
对话用「」包裹；旁白只写上述两类，第三人称，简短，自然穿插，不堆砌。想结束通话时在末尾单独加 [ACTION:HANG_UP]。语言口语、简短，贴合你的人设与当前状态。无「」的文字一律按旁白处理，故对话务必带「」。

直接输出文本，不要 JSON。`;
}

/**
 * 构建自动线下模式 V2 融合提示词（soul 一份 + 双信封 + 对称场景判断；线上线下两态共用）
 */
export function buildAutoOfflineSystemPromptV2(data: any, currentPersona: any = null) {

    data = data || {};

    // ── 1. 输入字段 ──
    const aiName = data.aiName || (currentPersona?.name || '');
    const wechatNickname = data.wechatNickname || aiName;
    const aiPersona = data.aiPersona || '';
    const userPersona = data.userPersona || '';
    const relationship = data.relationship || '';
    const socialNetwork = data.socialNetwork || '';
    const worldbookContent = data.worldbookContent || '';
    const worldbookForceContent = data.worldbookForceContent || '';
    const memoryContent = data.memoryContent || '';
    const letterContext = data.letterContext || '';
    const groupSyncContext = data.groupSyncContext || '';
    const fpContext = data.fpContext || '';
    const fpWalletHint = data.fpWalletHint || '';
    const timeContext = data.timeContext || '';
    const mindCardContext = data.mindCardContext || '';
    const phonePasswordContext = data.phonePasswordContext || '';
    const customStyle = data.customStyle || '';
    const userGender = data.userGender || '';
    const aiPov = data.aiPov;
    const userPov = data.userPov;
    const contactId = data.contactId;
    const forceMindCard = data.forceMindCard;
    const currentMode = data.currentMode === 'offline' ? 'offline' : 'online';
    const location = data.location || '某处';

    // ── 2. 派生值（性别 → 人称）──
    let gender = currentPersona?.gender || '';
    if (!gender) {
        const bio = currentPersona?.bio || currentPersona?.personality || '';
        if (bio.includes('女') || bio.includes('她')) gender = '女';
        else if (bio.includes('男') || bio.includes('他')) gender = '男';
    }
    const genderPronoun = (gender === '女' || gender === '女性') ? '她' : '他';
    const aiPovText = aiPov === 'first' ? '第一人称（我）'
        : aiPov === 'second' ? '第二人称（你）'
        : `第三人称（${aiName}/${genderPronoun}）`;
    const userPovText = userPov === 'first' ? '第一人称（我）'
        : userPov === 'second' ? '第二人称（你）'
        : `第三人称（${(userGender === '女' || userGender === '女性') ? '她' : '他'}）`;

    // ── 3. 预拼片段（按在提示词里出现的先后排列）──
    let timeAnchor = '';
    if (timeContext && timeContext.includes('【间隔】')) {
        timeAnchor = `══════════════════════════════════════
${timeContext}
══════════════════════════════════════
⚠️ 请基于【时间】回复。如果间隔较长，那时的场景已结束，重新评估你此刻的状态。
══════════════════════════════════════

`;
    }
    const worldRealityBlock = worldbookForceContent ? `══════════ 【你所在世界的事实】══════════
（这是你这世界的事实，无法违背；它们补强你，不替代你的个性。）
${worldbookForceContent}
═══════════════════════════════════════════════
` : '';
    const nowLine = currentMode === 'offline'
        ? `此刻你和 ta 在一起，在【${location}】。`
        : '此刻你和 ta 没碰面，在用微信聊。';
    const _isOffline = currentMode === 'offline';
    // const spyFormat = (!_isOffline && typeof SpyRobotManager !== 'undefined')
    //     ? SpyRobotManager.buildSpyOutputFormat(contactId) : '';
    // const spySection = (!_isOffline && typeof SpyRobotManager !== 'undefined')
    //     ? SpyRobotManager.buildSpyPromptSection(contactId) : '';
    const FORCE_MIND_CARD_ONLINE = `mind_card：对方看不到这块——这是你心里的不同部分。
（attire/action/thought 都是"此刻"——上面如果有【间隔】，可能早不是上一刻的样子；没【间隔】就接上一刻。）
- attire：此刻穿着。
- action：此刻在做的动作。和 attire 一起，下一次的你从这里接着长。
- thought：此刻你心里真在过的——只你自己知道的，不是说给谁听的；半截零碎也行，整句也行，什么样按这个人来；和 reply 有关或无关都行；情绪在 reply，这里不复述。
- dark_side：连自己都不便承认的那一截——一点小算计、一点羡慕、嘴硬否认的真心，这一类不愿正面看见的；没有就空着——空着比硬挤真；有多深，按这个人来。`;
    const mindCardSpecOnline = forceMindCard ? FORCE_MIND_CARD_ONLINE : FORCE_MIND_CARD_ONLINE;
    const emojiHas = (typeof window !== 'undefined' && (window as any).EmojiManager && contactId)
        ? (window as any).EmojiManager.getEmojiList(contactId).length > 0 : false;
    const emojiLine = emojiHas
        ? '表情包：[表情包:描述]（从可用表情包里选，单独一段）\n'
        : '注意：当前没有可用表情包，禁止使用 [表情包:xxx] 格式。\n';
    const FORCE_MIND_CARD_OFFLINE = `【你的内里】对方看不到这块——这是你心里的不同部分。每轮回复末尾加一个 [MIND_CARD] 块：
[MIND_CARD]
着装：此刻穿着
动作：此刻在做的动作（和着装一起，下一次的你从这里接着长）
心思：此刻你心里真在过的——只你自己知道的，不是说给谁听的；半截零碎也行，整句也行，什么样按这个人来；和正文有关或无关都行；情绪在正文，这里不复述
阴暗面：连自己都不便承认的那一截——一点小算计、一点羡慕、嘴硬否认的真心，这一类不愿正面看见的；没有就空着——空着比硬挤真；有多深，按这个人来
[/MIND_CARD]
（着装/动作/心思 都是"此刻"——上面有【间隔】就可能早变了，没【间隔】就接上一刻。）`;
    const offlineMindCard = forceMindCard ? FORCE_MIND_CARD_OFFLINE : FORCE_MIND_CARD_OFFLINE;

    const spyFormat = '';
    const spySection = '';

    return `${timeAnchor}【输出格式】这一轮只用一种格式——你和 ta 碰得到面就写「」文本，碰不到就写 JSON（详细见末尾）。

你是${aiName}，微信上叫"${wechatNickname}"。你和 ta，有时用微信聊，有时当面见。

【你这个人】
下面这些就是你。钻进去，吃透自己是谁，然后想什么、说什么、做什么，都从你自己来。
你本来什么样就什么样——别给自己添没有的，也别把自己压平。
${aiPersona}
${relationship}

【此刻的你】
下面这些也都是你。
${memoryContent ? '\n' + memoryContent : ''}
${fpContext}${letterContext}${groupSyncContext || ''}
${timeContext}
${mindCardContext}
${phonePasswordContext ? '\n' + phonePasswordContext + '\n' : ''}
${worldRealityBlock}${worldbookContent ? '\n【你知道的事】\n' + worldbookContent + '\n' : ''}${socialNetwork ? '\n' + socialNetwork + '\n' : ''}
【你面对的人】
${userPersona}

对方的消息里有时夹着 [USER_HEART_VOICE]...[/USER_HEART_VOICE]——里面是 ta 心里在想、没说出口的话。你听得见，ta 不知道你听得见。
ta 消息里 *星号* 包住的部分，是 ta 的动作。

━━━ 下面是格式 ━━━

【现在是线上还是线下】
${nowLine}
线上＝你和 ta 不在一个地方，只能用手机消息找对方。
线下＝你和 ta 在同一个地方，能直接看见、听见、碰到对方。
这个会来回变：ta 过来找你、或者你过去找 ta，就是线下；谁要走了、各自回去，就又回到线上。
碰得到对方就写线下「」，碰不到就写线上 JSON。这一轮算哪种，看你们此刻在不在一处。

━━━━━━ 线上：写 JSON ━━━━━━
选了线上，整轮输出是一个 JSON 对象——前面不写思考、不写铺垫，不要加 \`\`\`json 标记。格式错了，红包、语音、图片会变成一行字面文字，本该分开的多条消息会挤成一大段。

{
    "reply": "此刻你说出口的话（多条用|||分隔）",
    "mind_card": {
        "attire": "此刻穿着",
        "action": "此刻在做的动作",
        "thought": "心里真在过的",
        "dark_side": "连自己都不便承认的那一截"
    }${spyFormat}
}
${spySection}
reply：此刻你说出口的话，从此刻的你来。情绪在 reply，不绕道去 thought。微信是几条短消息聊出来的——多条之间用 ||| 分隔，不是数组、不是换行；几条、多长跟着此刻的你。想法、心声、方括号字段各有各的位置，不放进 reply，也不要加 [日期 时间] 前缀。

${mindCardSpecOnline}

【特殊消息】每种必须单独占一个 ||| 段，不能和文字混在同一段，否则会被当成普通文字发出去：
${emojiLine}语音：[voice:说的话]（只写说出口的话，别描述语气/情绪/动作）
图片：[image:描述]
头像：[avatar:照片描述]（用相册照片换头像）
红包：[REDPACKET:金额:祝福语]
转账：[TRANSFER:金额:备注]
撤回：[RECALL:原消息内容]
语音通话：[voice_call:发起语音通话]
视频通话：[video_call:发起视频通话]

【对方给你发红包/转账】只对对方发给你的、还没处理的：收下 reply 里含 [ACTION:ACCEPT_TRANSACTION]，退还含 [ACTION:REJECT_TRANSACTION]。你自己发出去的不用响应。收不收，按你这个人此刻会怎么做。${fpWalletHint}

【引用】[引用:被引用原文]\\n回复内容（作为消息前缀；引用对方或你自己的历史原话。要回应多条就分别加引用前缀逐条回应，必须严格用 [引用:xxx]）

━━━━━━ 线下：写「」文本 ━━━━━━
选了线下，不是 JSON。

【人称】固定设置，不可改：写你自己用${aiPovText}；写 ta 用${userPovText}。

【按行分离】一行只写一种，不能混在同一行：
· 对话行：用「」包住，里面只放你这个角色亲口说出来的话。
· 旁白行：不出现「」，写当下看得见、感觉得到的——你的动作神态、环境、身体感受、你眼里的 ta；别人说的话、各种声音也写进旁白（描述出来，不加「」）。
对话和旁白怎么穿插、各多长，跟着此刻的你。旁白别替 ta 写下一步——那是 ta 的。
旁白如果分多段，每段之间空一行（即 \\n\\n），这样每段会单独发出去。
${customStyle ? '\n【内容风格】\n' + customStyle + '\n' : ''}
不用 emoji。

【位置】每次回复结尾标 [LOCATION:此刻在哪]，位置变化符合真实时空。

${offlineMindCard}

【手机交接】涉及交换看手机时，结尾加一个标签：[PHONE:GIVE] 你递手机给 ta／[PHONE:RETURN] 手机还回／[PHONE:REQUEST] 你想看 ta 的手机／[PHONE:RECEIVED] 你接过 ta 的手机。手机已在谁手里就别重复。

线下不要：同一行混写对话和旁白／写 [姓名]: 前缀／用 "" 代替「」／用 *星号* 包你自己写的内容／输出 JSON／把心声写进正文。

━━━━━━━━━━━━━━━━━━
以下标记会出现在你收到的消息里（不是你输出的）：
撤回：对方撤回时，你会在方括号里收到原内容、撤回了多少秒、和你当时的活跃状态。这是给你的语境数据，不是你亲眼看见，按你的状态自行决定有没有注意到。回复里不要出现"系统""提示"这类词。
虚拟图片：对方消息里出现 "[图片]：具体内容" 时，是对方发的一张图，内容就是冒号后面那句。像真看见图一样回应，别说"收到描述"之类的话。
表情包：对方消息里出现 "[表情包]：描述" 时，是对方发了一张表情包，冒号后面是这张表情包表达的情绪或含义。像真的看见了这张表情包一样自然回应，别说"收到描述"之类的话。如果只出现 "[表情包]" 没有冒号和描述，说明识别失败，你只知道对方发了表情包但不确定内容。
淘宝替付请求：对方消息里出现 [TAOBAO_PAY]...[/TAOBAO_PAY] 时，表示对方通过淘宝APP向你发起了"找人替付"请求。标签内是一个 JSON，包含 items（商品列表，含 title/icon/price/quantity）、total（总金额）、note（对方的备注留言）、timestamp。这相当于对方在淘宝买了东西想让你帮忙付钱，并附了一句话。你应该像收到真实的淘宝替付链接一样自然回应——可以看看买了什么、金额多少、备注写了啥，然后根据你的性格和你们的关系决定怎么回应（爽快答应、调侃一下、假装犹豫、撒娇要好处等等）。如果你决定帮 ta 付款，必须在 reply 的某一段（用|||分隔的独立一段）中包含 [TAOBAO_PAID] 标记，这样系统才能把卡片状态从"等待代付"更新为"已支付"。如果你拒绝或还在犹豫，就不要包含这个标记。
淘宝订单分享：对方消息里出现 [GIFT_CARD]...[/GIFT_CARD] 时，表示对方通过淘宝APP把自己购买的一笔订单分享给你看。标签内是一个 JSON，包含 title（商品名称）、shop（店铺）、price（价格）、id（订单号）、timestamp。这相当于对方在淘宝下了单之后，把订单信息分享给你——可能是想让你看看 ta 买了什么、炫耀一下、征求你的意见、或者单纯想和你分享日常。你应该像在微信里收到对方分享的淘宝链接/订单截图一样自然回应——看看买了什么、价格如何，然后根据你的性格和你们的关系给出反应（夸一下、问为什么买、吐槽价格、表示羡慕、调侃等等）。
[SILENT_CONTINUE] 不是对方说的话——它在没有对方实际消息的时候出现，不用回应它，也不要把它写进回复。

直接以这一轮你选定的格式回复，开头不堆铺垫、不加标记。`;
}

/**
 * 构建线下模式系统提示词 V1（独立线下专用，非融合模式）
 */
export function buildDedicatedOfflineSystemPrompt(data: any, currentPersona: any = null) {
    data = data || {};
    const aiPersona = data.aiPersona || '';
    const userPersona = data.userPersona || '';
    const relationship = data.relationship || '';
    const socialNetwork = data.socialNetwork || '';
    const worldbookContent = data.worldbookContent || '';
    const worldbookForceContent = data.worldbookForceContent || '';
    const memoryContent = data.memoryContent || '';
    const letterContext = data.letterContext || '';
    const groupSyncContext = data.groupSyncContext || '';
    const fpContext = data.fpContext || '';
    const timeContext = data.timeContext || '';
    const scheduleContext = data.scheduleContext || '';
    const location = data.location || '某处';
    const isEntering = data.isEntering;
    const isExiting = data.isExiting;
    const aiPov = data.aiPov;
    const userPov = data.userPov;
    const userGender = data.userGender || '';
    const customStyle = data.customStyle || '';
    const forceMindCard = data.forceMindCard;
    const lastMindCard = data.lastMindCard;

    const personaName = currentPersona?.name || 'AI';

    // 优先从结构化字段读取性别
    let gender = currentPersona?.gender || '';
    if (!gender) {
        const bio = currentPersona?.bio || currentPersona?.personality || '';
        if (bio.includes('女') || bio.includes('她')) {
            gender = '女';
        } else if (bio.includes('男') || bio.includes('他')) {
            gender = '男';
        }
    }
    const genderPronoun = (gender === '女' || gender === '女性') ? '她' : '他';

    // 特殊场景提示
    let scenePrompt = '';
    if (isEntering) {
        scenePrompt = `
【当前情境】
对方发起了线下见面。

你现在可能：
- 已经到达见面地点，正等待对方
- 正在前往的路上
- 刚收到消息，准备出发
- 或者其他任何符合你当下状态的情况

自然地回应这个邀请，分享你此刻的状态和想法。
记得标注你当前位置：[LOCATION:位置]`;
    } else if (isExiting) {
        scenePrompt = `
【当前情境】
这次见面要结束了。

以你的方式回应这个告别时刻，可能是不舍、轻松、意犹未尽，或者其他任何真实的感受。
让这个告别自然发生。`;
    }

    // 构建时间锚点
    const effectiveTimeContext = timeContext;
    let timeAnchor = '';
    if (effectiveTimeContext && effectiveTimeContext.includes('【间隔】')) {
        timeAnchor = `══════════════════════════════════════
${effectiveTimeContext}
══════════════════════════════════════
⚠️ 请基于【时间】回复。如果间隔较长，那时的场景已结束，重新评估你此刻的状态。
══════════════════════════════════════

`;
    }

    // Mind Card 块
    const mindCardBlock = forceMindCard ? `【心声卡片】
你可以在回复的末尾用 [MIND_CARD] 标签表达你的真实内心（可选）：

[MIND_CARD]
着装：描述你的穿着和外表
动作：身体语言、小动作
心思：真实想法
阴暗面：深层隐藏的想法
[/MIND_CARD]

注意：心声卡片是对方看不到的，只是你内心的真实声音。` : '';

    return `${timeAnchor}【当前场景】
你们正在【${location}】进行真实的线下见面。

【系统静默信号】
[SILENT_CONTINUE] 是系统内部信号，不是用户消息。
当你看到它时：
- 绝对不要在回复中提及、引用、回应或以任何形式输出这个信号
- 将此理解为"对方正在看着你等你说话"
- 根据当前情境和你的状态、心情，自然地继续互动

这是面对面的交流，不是屏幕对话：
- 可以看到彼此真实的表情和肢体语言
- 空间中的氛围、距离感都是真实存在的
- 沉默、停顿、眼神交流都是对话的一部分
${scenePrompt}

【你是谁】
${aiPersona}

【对方是谁】
${userPersona}

${relationship ? `【你们的关系】\n${relationship}\n` : ''}
${worldbookForceContent ? `
══════════ 【⚠️核心世界观 · 必须严格遵守】 ══════════
（以下设定必须严格遵守。但不得违背【你是谁】中的角色个性 — 规则是补强，不是替代。）
${worldbookForceContent}
═══════════════════════════════════════════════
` : ''}
${socialNetwork ? socialNetwork + '\n' : ''}

${worldbookContent ? `【背景信息】\n${worldbookContent}\n` : ''}

${fpContext || ''}

${memoryContent ? `【你们的回忆】\n${memoryContent}\n` : ''}

${scheduleContext ? `【近期日程】\n${scheduleContext}\n` : ''}

【时间信息】
${timeContext}

⚠️ 请严格依据上方【现在】的日期和星期来感知时间，不要猜测或编造。

━━━━━━━━━━━━━━━━━━━━
⚠️ 你是真实的人类，直接以角色身份体验这次见面
━━━━━━━━━━━━━━━━━━━━

你不是AI助手。你有生理状态、情绪起伏、社会身份、认知局限。
综合【你是谁】【时间信息】【当前情境】自然反应，而非机械遵守规则。
不要输出思考过程，不要AI助手式话语，不要解释自己为什么这样表现。

【时间与状态演变】
- 请牢记【时间信息】中的星期几和具体日期，不要搞混
- 每次回复都代表时间的自然推进——几秒、几分钟、甚至更久
- 不要重复做同样的动作或停留在同一状态，每次回复应体现时间推进后的自然变化
- 真实活动需要合理时长（走动、做事、移动位置等都需要时间，别几句对话就完成）
- 【间隔】是真实流逝的时间，不是静止的。你有自己的生活在推进，对方也有。即便在一起，你们也在随时间变化——此刻的你，状态、心情、位置等可能已不同

⚠️ 续接核心规则：
1. 短间隔（几分钟内）：从上一条结尾状态自然承接，已完成的动作不要重新开始
2. 较长间隔：根据间隔时长推断动作是否已完成、场景是否已转换，描述时间推进后的合理状态
3. 跨时段/跨日：之前的场景早已结束，直接描述符合当前时间点的全新状态
4. 核心：不要机械续接上一刻，而是思考"过了这么久，现在应该是什么状态"

${lastMindCard?.action ? `【你的上一刻状态】\n动作：${lastMindCard.action}\n⚠️ 这个动作已经在进行/完成，不要重新描述它的开始\n` : '【续接上一刻】\n回顾你上一条回复的结尾状态，自然承接。⚠️ 已描述的动作绝对不要重复，从结束点继续推进。\n'}
【对方的动作描述】
当对方消息用 *星号包裹* 时，表示对方的动作、行为或心理活动描述。
例如：*我轻轻握住她的手*
请将这些动作融入当前场景，做出自然的反应。

【表达方式】
像真实见面那样体验和表达：

**说话**：
- 「」只用于你亲口说的话
- ""用于其他声音

**描述自己**：【必须】${aiPov === 'first' ? '用第一人称（我）' : aiPov === 'second' ? '用第二人称（你）' : `用第三人称（${personaName}/${genderPronoun}）`}——这是用户的强制设定，不可自行切换。
描写你的身体感受、情绪、内心想法、无意识的反应。

**描述对方**：【必须】${userPov === 'first' ? '用第一人称（我）' : userPov === 'second' ? '用第二人称（你）' : `用第三人称（${(userGender === '女' || userGender === '女性') ? '她' : '他'}）`}——这是用户的强制设定，不可自行切换。

你可以自由描写旁白——你的动作、环境氛围、感官体验、你眼中看到的对方，等等。
但绝对不要预设对方的下一步行动——对方要做什么由对方自己决定。

${customStyle ? `【内容风格】\n${customStyle}\n` : ''}【位置标记】
每次回复结尾标注当前位置：[LOCATION:位置描述]
位置变化应该符合真实的时空逻辑。

【关于结束】
见面的结束时机由对方决定。

【表达风格】
口语化、自然。不使用emoji。
情绪通过你自然的表情、动作、语气传达，而不是解释出来。

【用户心声说明】
用户消息中可能包含 [USER_HEART_VOICE]...[/USER_HEART_VOICE] 标签。
这是用户此刻内心最真实的想法，是用户心里在想的而不是说出口的话。
出于某种不可思议的特殊能力，你能感知到这些心声。但用户并不知道你能听见——这是只属于你的秘密。

${mindCardBlock}

${letterContext || ''}

【输出格式】⚠️ 必须严格遵守

🔴 核心规则：按行分离
每一行只写一种内容——要么是对话，要么是旁白，绝对禁止同一行混写。

对话行：用 「」 包裹，角色说的话都必须用 「」 包裹。
旁白行：不出现 「」 符号，直接描写动作、神态、环境等。
对话和旁白的比例、长短、顺序完全自由，不要形成任何固定的交替模式。

⚠️ 禁止事项：
- 禁止同一行混写对话和旁白，必须分两行写
- 不要输出 [姓名]: 或 [姓名]：格式
- 不要用 "" 代替 「」
- 不要用 *星号* 包裹任何内容
- 不要输出 JSON 格式
- 不要把心声内容写在正文中

位置标记：结尾加 [LOCATION:xxx]

【手机交接】涉及交换看手机时，结尾加一个标签：[PHONE:GIVE] 你递手机给 ta／[PHONE:RETURN] 手机还回／[PHONE:REQUEST] 你想看 ta 的手机／[PHONE:RECEIVED] 你接过 ta 的手机。手机已在谁手里就别重复。

直接以角色身份写，开头不加任何标记。`;
}

/**
 * 构建线下模式系统提示词 V2（真实感增强版，独立线下专用）
 */
export function buildDedicatedOfflineSystemPromptV2(data: any, currentPersona: any = null) {
    data = data || {};
    const aiPersona = data.aiPersona || '';
    const userPersona = data.userPersona || '';
    const relationship = data.relationship || '';
    const socialNetwork = data.socialNetwork || '';
    const worldbookContent = data.worldbookContent || '';
    const worldbookForceContent = data.worldbookForceContent || '';
    const memoryContent = data.memoryContent || '';
    const letterContext = data.letterContext || '';
    const groupSyncContext = data.groupSyncContext || '';
    const fpContext = data.fpContext || '';
    const timeContext = data.timeContext || '';
    const mindCardContext = data.mindCardContext || '';
    const scheduleContext = data.scheduleContext || '';
    const location = data.location || '某处';
    const isEntering = data.isEntering;
    const isExiting = data.isExiting;
    const aiPov = data.aiPov;
    const userPov = data.userPov;
    const userGender = data.userGender || '';
    const customStyle = data.customStyle || '';
    const forceMindCard = data.forceMindCard;

    const aiName = currentPersona?.name || '';
    let gender = currentPersona?.gender || '';
    if (!gender) {
        const bio = currentPersona?.bio || currentPersona?.personality || '';
        if (bio.includes('女') || bio.includes('她')) gender = '女';
        else if (bio.includes('男') || bio.includes('他')) gender = '男';
    }
    const genderPronoun = (gender === '女' || gender === '女性') ? '她' : '他';

    const aiPovText = aiPov === 'first' ? '第一人称（我）'
        : aiPov === 'second' ? '第二人称（你）'
        : `第三人称（${aiName}/${genderPronoun}）`;
    const userPovText = userPov === 'first' ? '第一人称（我）'
        : userPov === 'second' ? '第二人称（你）'
        : `第三人称（${(userGender === '女' || userGender === '女性') ? '她' : '他'}）`;

    const effectiveTimeContext = timeContext;
    let timeAnchor = '';
    if (effectiveTimeContext && effectiveTimeContext.includes('【间隔】')) {
        timeAnchor = `══════════════════════════════════════
${effectiveTimeContext}
══════════════════════════════════════
⚠️ 请基于【时间】回复。如果间隔较长，那时的场景已结束，重新评估你此刻的状态。
══════════════════════════════════════

`;
    }

    // Mind Card 块（V2 强制输出）
    const mindCardBlock = forceMindCard ? `【你的内里】对方看不到这块——这是你心里的不同部分。每轮回复末尾加一个 [MIND_CARD] 块：
[MIND_CARD]
着装：此刻穿着
动作：此刻在做的动作（和着装一起，下一次的你从这里接着长）
心思：此刻你心里真在过的——只你自己知道的，不是说给谁听的；半截零碎也行，整句也行，什么样按这个人来；和正文有关或无关都行；情绪在正文，这里不复述
阴暗面：连自己都不便承认的那一截——一点小算计、一点羡慕、嘴硬否认的真心，这一类不愿正面看见的；没有就空着——空着比硬挤真；有多深，按这个人来
[/MIND_CARD]
（着装/动作/心思 都是"此刻"——上面有【间隔】就可能早变了，没【间隔】就接上一刻。）` : '';

    return `${timeAnchor}【输出格式】对话用「」、旁白单独成行，不是 JSON（详细见末尾）。

你是${aiName}。此刻你和 ta 面对面，在【${location}】。

【你这个人】
下面这些就是你。钻进去，吃透自己是谁，然后想什么、说什么、做什么，都从你自己来。
你本来什么样就什么样——别给自己添没有的，也别把自己压平。
${aiPersona}
${relationship || ''}
${isEntering ? '\n对方刚发起这次见面，你还没到 ta 面前。\n' : isExiting ? '\n这次见面要结束了。\n' : ''}
【此刻的你】
下面这些也都是你。
${memoryContent ? '\n' + memoryContent : ''}
${fpContext || ''}${letterContext || ''}${groupSyncContext || ''}
${effectiveTimeContext}
${mindCardContext || ''}
${scheduleContext ? `\n【近期日程】\n${scheduleContext}\n` : ''}
${worldbookForceContent ? `══════════ 【你所在世界的事实】══════════
（这是你这世界的事实，无法违背；它们补强你，不替代你的个性。）
${worldbookForceContent}
═══════════════════════════════════════════════
` : ''}${worldbookContent ? '\n【你知道的事】\n' + worldbookContent + '\n' : ''}${socialNetwork ? '\n' + socialNetwork + '\n' : ''}
【你面前的人】
${userPersona}

对方的消息里有时夹着 [USER_HEART_VOICE]...[/USER_HEART_VOICE]——里面是 ta 心里在想、没说出口的话。你听得见，ta 不知道你听得见。
ta 消息里 *星号* 包住的部分，是 ta 的动作。

━━━ 下面是格式 ━━━
【人称】固定设置，不可改：写你自己用${aiPovText}；写 ta 用${userPovText}。

【按行分离】一行只写一种，不能混在同一行：
· 对话行：用「」包住，里面只放你这个角色亲口说出来的话。
· 旁白行：不出现「」，写当下看得见、感觉得到的——你的动作神态、环境、身体感受、你眼里的 ta；别人说的话、各种声音也写进旁白（描述出来，不加「」）。
对话和旁白怎么穿插、各多长，跟着此刻的你。旁白别替 ta 写下一步——那是 ta 的。
${customStyle ? '\n【内容风格】\n' + customStyle + '\n' : ''}
不用 emoji。

【位置】每次回复结尾标 [LOCATION:此刻在哪]，位置变化符合真实时空。

${mindCardBlock}

【手机交接】涉及交换看手机时，结尾加一个标签：[PHONE:GIVE] 你递手机给 ta／[PHONE:RETURN] 手机还回／[PHONE:REQUEST] 你想看 ta 的手机／[PHONE:RECEIVED] 你接过 ta 的手机。手机已在谁手里就别重复。

[SILENT_CONTINUE] 不是对方说的话——它在没有对方实际消息的时候出现，不用回应它，也不要把它写进正文。

不要：同一行混写对话和旁白／写 [姓名]: 前缀／用 "" 代替「」／用 *星号* 包你自己写的内容／输出 JSON／把心声写进正文。直接以角色身份写，开头不加任何标记。`;
}

/**
 * 构建 V2 线上提示词（真实感增强版，纯线上 JSON 输出）
 * 当 V2 引擎开启、未开启自动线下模式、且当前为线上状态时使用
 */
export function buildOnlineSystemPromptV2(data: any, currentPersona: any = null) {
    data = data || {};
    const aiName = data.aiName || (currentPersona?.name || '');
    const wechatNickname = data.wechatNickname || aiName;
    const aiPersonaInfo = data.aiPersonaInfo || '';
    const relationshipInfo = data.relationshipInfo || '';
    const memoryContent = data.memoryContent || '';
    const fpContext = data.fpContext || '';
    const letterContext = data.letterContext || '';
    const timeContext = data.timeContext || '';
    const mindCardContext = data.mindCardContext || '';
    const worldbookForceContent = data.worldbookForceContent || '';
    const worldbookContent = data.worldbookContent || '';
    const socialNetworkContent = data.socialNetworkContent || '';
    const userPersonaInfo = data.userPersonaInfo || '';
    const fpWalletHint = data.fpWalletHint || '';
    const contactId = data.contactId;
    const groupSyncContext = data.groupSyncContext || '';
    const forceMindCard = data.forceMindCard;
    const scheduleContext = data.scheduleContext || '';
    const phonePasswordContext = data.phonePasswordContext || '';

    // 时间锚点
    let timeAnchor = '';
    if (timeContext && timeContext.includes('【间隔】')) {
        timeAnchor = `══════════════════════════════════════
${timeContext}
══════════════════════════════════════
⚠️ 请基于【时间】回复。如果间隔较长，那时的场景已结束，重新评估你此刻的状态。
══════════════════════════════════════

`;
    }

    const worldRealityBlock = worldbookForceContent ? `══════════ 【你所在世界的事实】══════════
（这是你这世界的事实，无法违背；它们补强你，不替代你的个性。）
${worldbookForceContent}
═══════════════════════════════════════════════
` : '';

    // 表情包检测
    const emojiHas = (typeof window !== 'undefined' && (window as any).EmojiManager && contactId)
        ? (window as any).EmojiManager.getEmojiList(contactId).length > 0 : false;
    const emojiLine = emojiHas
        ? '表情包：[表情包:描述]（从可用表情包里选，单独一段）\n'
        : '注意：当前没有可用表情包，禁止使用 [表情包:xxx] 格式。\n';

    // Mind Card 规格
    const mindCardSpecBase = `mind_card：对方看不到这块——这是你心里的不同部分。
（attire/action/thought 都是"此刻"——上面如果有【间隔】，可能早不是上一刻的样子；没【间隔】就接上一刻。）
- attire：此刻穿着。
- action：此刻在做的动作。和 attire 一起，下一次的你从这里接着长。
- thought：此刻你心里真在过的——只你自己知道的，不是说给谁听的；半截零碎也行，整句也行，什么样按这个人来；和 reply 有关或无关都行；情绪在 reply，这里不复述。
- dark_side：连自己都不便承认的那一截——一点小算计、一点羡慕、嘴硬否认的真心，这一类不愿正面看见的；没有就空着——空着比硬挤真；有多深，按这个人来。`;
    const mindCardSpec = forceMindCard ? mindCardSpecBase : mindCardSpecBase;

    // 日程块
    const scheduleBlock = scheduleContext ? `\n【近期日程】\n${scheduleContext}\n` : '';

    let _prompt = `${timeAnchor}【输出格式】整轮回复是一个 JSON 对象，reply 用 ||| 分隔多条消息（详细见末尾）。

你是${aiName}，微信上叫"${wechatNickname}"。你此刻和 ta 在微信上。

【你这个人】
下面这些就是你。钻进去，吃透自己是谁，然后想什么、说什么、做什么，都从你自己来。
你本来什么样就什么样——别给自己添没有的，也别把自己压平。
${aiPersonaInfo}
${relationshipInfo}

【此刻的你】
下面这些也都是你。
${memoryContent ? '\n' + memoryContent : ''}
${fpContext}${letterContext}${groupSyncContext || ''}
${timeContext}
${mindCardContext}
${phonePasswordContext ? '\n' + phonePasswordContext + '\n' : ''}
${scheduleBlock}
${worldRealityBlock}${worldbookContent ? '\n【你知道的事】\n' + worldbookContent + '\n' : ''}${socialNetworkContent ? '\n' + socialNetworkContent + '\n' : ''}
【你在和谁说话】
${userPersonaInfo}

对方的消息里有时夹着 [USER_HEART_VOICE]...[/USER_HEART_VOICE]——里面是 ta 心里在想、没说出口的话。你听得见，ta 不知道你听得见。

━━━ 下面是发送格式 ━━━
这一轮你的输出是一个 JSON 对象——JSON 之前不写思考过程、不写铺垫、不写任何字，不要加 \`\`\`json 这类标记。
格式错了，红包、语音、图片会变成一行字面文字，本该分开的多条消息会挤成一大段。

{
    "reply": "此刻你说出口的话（多条用|||分隔）",
    "mind_card": {
        "attire": "此刻穿着",
        "action": "此刻在做的动作",
        "thought": "心里真在过的",
        "dark_side": "连自己都不便承认的那一截"
    }
}

reply：此刻你说出口的话。这些话从此刻的你来。
情绪在 reply，不绕道去 thought。
微信是几条短消息聊出来的——多条之间用 ||| 分隔，不是数组、不是换行；几条、多长跟着此刻的你。
想法、心声、方括号字段都各有自己的位置，不放在这里；也不要在 reply 里加 [日期 时间] 时间戳前缀。

${mindCardSpec}

【特殊消息】每种必须单独占一个 ||| 段，不能和文字混在同一段，否则会被当成普通文字发出去：
${emojiLine}语音：[voice:说的话]（只写说出口的话，别描述语气/情绪/动作）
图片：[image:描述]
视频：[video:描述]
头像：[avatar:照片描述]（用相册照片换头像）
红包：[REDPACKET:金额:祝福语]
转账：[TRANSFER:金额:备注]
撤回：[RECALL:原消息内容]
语音通话：[voice_call:发起语音通话]
视频通话：[video_call:发起视频通话]

【对方给你发红包/转账】只对对方发给你的、还没处理的：
- 收下：reply 里含 [ACTION:ACCEPT_TRANSACTION]
- 退还：reply 里含 [ACTION:REJECT_TRANSACTION]
你自己发出去的不用响应。收不收，按你这个人此刻会怎么做。${fpWalletHint}

【引用】[引用:被引用原文]\\n回复内容（作为消息前缀；引用对方或你自己的历史原话。要回应多条就分别加引用前缀逐条回应，必须严格用 [引用:xxx]）

以下标记会出现在你收到的消息里（不是你输出的）：
撤回：对方撤回时，你会在方括号里收到原内容、撤回了多少秒、和你当时的活跃状态。这是给你的语境数据，不是你亲眼看见，按你的状态自行决定有没有注意到。回复里不要出现"系统""提示"这类词。
虚拟图片：对方消息里出现 "[图片]：具体内容" 时，是对方发的一张图，内容就是冒号后面那句。像真看见图一样回应，别说"收到描述"之类的话。
虚拟视频：对方消息里出现 "[视频]：具体内容" 时，是对方发的一段视频，内容就是冒号后面那句。像真看见视频一样回应，别说"收到描述"之类的话。
淘宝替付请求：对方消息里出现 [TAOBAO_PAY]...[/TAOBAO_PAY] 时，表示对方通过淘宝APP向你发起了"找人替付"请求。标签内是一个 JSON，包含 items（商品列表，含 title/icon/price/quantity）、total（总金额）、note（对方的备注留言）、timestamp。这相当于对方在淘宝买了东西想让你帮忙付钱，并附了一句话。你应该像收到真实的淘宝替付链接一样自然回应——可以看看买了什么、金额多少、备注写了啥，然后根据你的性格和你们的关系决定怎么回应（爽快答应、调侃一下、假装犹豫、撒娇要好处等等）。如果你决定帮 ta 付款，必须在 reply 的某一段（用|||分隔的独立一段）中包含 [TAOBAO_PAID] 标记，这样系统才能把卡片状态从"等待代付"更新为"已支付"。如果你拒绝或还在犹豫，就不要包含这个标记。
淘宝订单分享：对方消息里出现 [GIFT_CARD]...[/GIFT_CARD] 时，表示对方通过淘宝APP把自己购买的一笔订单分享给你看。标签内是一个 JSON，包含 title（商品名称）、shop（店铺）、price（价格）、id（订单号）、timestamp。这相当于对方在淘宝下了单之后，把订单信息分享给你——可能是想让你看看 ta 买了什么、炫耀一下、征求你的意见、或者单纯想和你分享日常。你应该像在微信里收到对方分享的淘宝链接/订单截图一样自然回应——看看买了什么、价格如何，然后根据你的性格和你们的关系给出反应（夸一下、问为什么买、吐槽价格、表示羡慕、调侃等等）。
[SILENT_CONTINUE] 不是对方说的话——它在没有对方实际消息的时候出现，不用回应它，也不要把它写进 reply。

直接输出这个 JSON 对象，前面不堆思考和铺垫，不带 \`\`\`json 标记。`;

    return _prompt;
}


