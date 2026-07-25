import { AppDB } from '../db';
import { loadPlotMemories, loadAboutYouEntries, loadMySchedule, loadOtherSchedule, scheduleItemsToText, shouldLoadSchedule, loadMoonPhase } from '../db/youandme';
import { buildAssetContext } from './assetContext';

/**
 * 梦人间 IF 线专用上下文构建
 * 与微信聊天的 buildFullAIContext 结构完全一致（消息格式、本轮分离、线上线下两态），
 * 唯一区别是人设身份读取来源不同：使用入梦设定（dreamIdentity / worldview / userIdentity）
 * 作为最高优先级身份覆盖。最终调用 buildAutoOfflineSystemPromptV2 生成提示词。
 */
export async function buildMengrenjianAIContext(persona: any, contactId: string, myProfile: any = {}, recentMessages: any[] = []) {
    if (!persona) return null;

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

    const ai = persona;

    // === 1. 构建 AI 人设信息（基底 + 入梦设定覆盖身份） ===
    const aiWechatInfo = `\n【你的微信外壳信息】
微信昵称：${ai.wechatName || ai.name}
微信号：${ai.wechatId || '未设置'}
个性签名：${ai.signature || '未设置'}`;

    let aiCoreInfo = '';
    if (ai.mode === 'detailed') {
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
        aiCoreInfo = `\n【你的真实内核信息】
真实姓名：${ai.name}
人设描述：${ai.bio || ''}`;
    }

    // === 入梦设定注入（IF线核心 — 覆盖身份与世界观） ===
    let dreamProfileInfo = '';
    try {
        const dreamProfileRaw = localStorage.getItem(`dream_profile_${contactId}`);
        if (dreamProfileRaw) {
            const dreamProfile = JSON.parse(dreamProfileRaw);
            if (dreamProfile.dreamIdentity || dreamProfile.worldview || dreamProfile.userIdentity) {
                dreamProfileInfo = `\n【入梦设定 — IF线身份与世界观（以此为准，覆盖原设定中的身份/关系/世界观）】
${dreamProfile.dreamIdentity ? '你在此世界线中的身份：' + dreamProfile.dreamIdentity : '身份：未设定（请按原设定）'}
${dreamProfile.worldview ? '世界观背景：' + dreamProfile.worldview : '世界观：未设定（请按原设定）'}
${dreamProfile.userIdentity ? '与你对话的人在此世界线中的身份：' + dreamProfile.userIdentity : '对方身份：未设定'}
⚠️ 这是IF线（平行世界线），上述身份和世界观优先级最高，你需要完全代入此设定来扮演。性格、外观、沟通风格等仍参考角色基底信息。`;
            }
        }
    } catch (e) {}

    // 位置&天气
    let aiLocationInfo = '';
    let aiWeatherInfo = '';
    const userCityRecord = await AppDB.appSettings.get('my_city');
    const userCity = userCityRecord?.value || '';
    const aiRegion = (ai.region || '').trim();
    const aiDistance = ai.distance || '';

    if (userCity && userCity !== '---' && userCity !== '未设置' && userCity.trim() !== '') {
        if (!aiRegion || aiRegion === '' || aiRegion === userCity) {
            aiLocationInfo = `\n【你的位置信息】\n你当前所在城市：${userCity}（与对方同城）`;
            const weatherForecastRecord = await AppDB.appSettings.get('weather_ai_forecast');
            const weatherForecastStr = weatherForecastRecord?.value || null;
            if (weatherForecastStr) {
                try {
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
                    console.warn('解析天气数据失败:', e);
                }
            }
        } else {
            aiLocationInfo = `\n【你的位置信息】\n你当前所在城市：${aiRegion}`;
            if (aiDistance) {
                aiLocationInfo += `\n你的位置关系：${aiDistance}（这里的"我"指的是对方，也就是说这是你相对于对方所在的${userCity}的位置关系）`;
            } else {
                aiLocationInfo += `\n你与对方不在同一城市（对方在${userCity}）`;
            }
            aiWeatherInfo = `\n【当地天气】\n你所在的${aiRegion}的天气需要你根据该城市的地理位置、气候特点和当前季节自行合理感知。\n对方所在的${userCity}的天气与你看到的可能不同，不要把对方的天气当成自己的天气。`;
        }
    }

    // === 2. 构建用户人设信息 ===
    const userWechatInfo = `\n【与你聊天的用户的微信显示信息】
微信昵称：${myProfile.name || '未设置'}
微信号：${myProfile.wechat_id || '未设置'}
个性签名：${myProfile.signature || '未设置'}`;

    const userCoreInfo = `\n【与你聊天的用户的真实人设档案（绝对不要把对方当成你自己）】
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
    let worldbookResult = '';
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
            const recentTexts = recentMessages.filter(m => m.text).map(m => m.text.toLowerCase()).join(' ');
            books.forEach((wb: any) => {
                if (wb.editMode === 'simple') {
                    if (wb.content && wb.content.trim()) {
                        worldbookResult += `\n[${wb.name}]: ${wb.content}`;
                    }
                } else if (wb.entries && wb.entries.length > 0) {
                    if (recentMessages.length > 0) {
                        wb.entries.forEach((entry: any) => {
                            const keys = entry.keys.split(/[,，]/).map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
                            if (keys.length > 0 && keys.some((k: string) => recentTexts.includes(k))) {
                                worldbookResult += `\n[${wb.name}] - ${entry.keys}: ${entry.content}`;
                            }
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.warn('[梦人间] 读取世界书失败:', e);
    }
    if (worldbookResult) {
        result.worldbookContent = `\n【相关世界书知识库】此部分代表背景知识：\n${worldbookResult}`;
    }

    // === 4. 读取记忆海内容 ===
    const recentUserTexts = recentMessages
        .filter(m => m.isMe && m.text && m.msgType !== 'system' && m.msgType !== 'narrator')
        .map(m => m.text.toLowerCase())
        .join(' ');

    const allPlotMemories = loadPlotMemories();
    const coreMemories = allPlotMemories.filter(m => Number(m.importance) >= 8);
    const cleanMemories = allPlotMemories.filter(m => Number(m.importance) < 8).slice(-10);
    const allAboutYou = loadAboutYouEntries();

    const relevantAboutYou = allAboutYou.filter(entry => {
        if (!entry.key || !entry.value) return false;
        const keyLower = entry.key.toLowerCase();
        const valueLower = entry.value.toLowerCase();
        return recentUserTexts.includes(keyLower) || recentUserTexts.includes(valueLower);
    });
    const otherAboutYou = allAboutYou.filter(entry => {
        if (!entry.key || !entry.value) return false;
        const keyLower = entry.key.toLowerCase();
        const valueLower = entry.value.toLowerCase();
        return !recentUserTexts.includes(keyLower) && !recentUserTexts.includes(valueLower);
    });

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

    // 智能资产上下文
    try {
        const assetContext = await buildAssetContext(contactId, persona, recentMessages);
        if (assetContext) {
            result.memoryContent += assetContext;
        }
    } catch (e) {
        console.warn('[梦人间-资产上下文] 构建失败:', e);
    }

    // 拼装 AI 人设信息（含入梦设定）
    const promptIntro = `【角色扮演最高指令 — 梦人间IF线】你现在正在进行一场沉浸式的IF线角色扮演。请你完全忘掉自己是AI语言模型。你有着独立的思想、生活状态和真实的人性，你就是下面设定的这个角色！\n`;
    const roleplayInstruction = `\n\n【扮演要求】
1. 完全沉浸在IF线设定中，你的身份是"入梦设定"里指定的身份，世界观以入梦设定为准。
2. 性格、外观、沟通风格等参考角色基底信息，但身份和关系以入梦设定优先。
3. 绝不跳脱角色，绝不把用户的信息当成自己的信息。
4. 回复要符合IF线世界观的逻辑和氛围。`;

    result.aiPersonaInfo = promptIntro + aiWechatInfo + aiCoreInfo + dreamProfileInfo + aiLocationInfo + aiWeatherInfo + result.worldbookContent + roleplayInstruction;

    // === 5. 读取设置 ===
    const settingsRec = await AppDB.appSettings.get(`chat_settings_${contactId}`);
    const aiPov = settingsRec?.value?.aiPov || 'third';
    const userPov = settingsRec?.value?.userPov || 'second';
    const customStyle = settingsRec?.value?.contentStyle || '';
    const forceMindCard = settingsRec?.value?.showMindCard !== false;
    const disableTimeAwareness = settingsRec?.value?.disableTimeAwareness || false;

    // === 6. 检测线下模式 ===
    let currentMode: 'online' | 'offline' = 'online';
    let currentOfflineLocation = '某处';
    for (let i = recentMessages.length - 1; i >= 0; i--) {
        const msg = recentMessages[i];
        const txt = msg?.text;
        if (txt && typeof txt === 'string') {
            const match = txt.match(/\[LOCATION:(.*?)\]/);
            if (match) {
                currentMode = 'offline';
                currentOfflineLocation = match[1];
                break;
            }
        }
    }

    // === 7. 智能日程读取 ===
    let scheduleContext = '';
    if (shouldLoadSchedule(recentMessages)) {
        const moonPhase = loadMoonPhase();
        const aiSchedule = loadOtherSchedule();
        if (aiSchedule.length > 0) {
            scheduleContext += `【你的日程安排】\n${scheduleItemsToText(aiSchedule)}\n`;
        }
        if (moonPhase === 'full') {
            const userSchedule = loadMySchedule();
            if (userSchedule.length > 0) {
                scheduleContext += `\n【对方的日程安排】\n${scheduleItemsToText(userSchedule)}\n`;
            }
        }
    }

    // === 8. 手机密码上下文 ===
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
            console.warn('[梦人间-手机密码上下文] 读取失败:', e);
        }
    }

    // === 9. 消息格式化（与微信完全一致） ===
    const imageMessages: string[] = [];
    const consumedIndexes = new Set<number>();

    const formatOneMsg = (msg: any, index: number): string => {
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

        const text = msg.text || '';
        if (msg.msgType === 'image' || text.startsWith('data:image')) {
            if (msg.isMe) {
                const imgBase64 = text.startsWith('data:image') ? text : (msg.imageData || '');
                if (imgBase64) imageMessages.push(imgBase64);
            }
            return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [图片]`;
        }

        const stickerMatch = text.match(/^\[image:([\s\S]+)\]$/) || text.match(/^\[sticker:([\s\S]+)\]$/);
        if (stickerMatch) {
            let desc = stickerMatch[1].trim();
            const pipeIdx = desc.indexOf('|');
            if (pipeIdx > 0 && /^(https?:\/\/|data:)/.test(desc)) {
                desc = desc.substring(pipeIdx + 1).trim();
            }
            const isUrl = desc.startsWith('http://') || desc.startsWith('https://') || desc.startsWith('data:');
            if (isUrl) {
                const nextMsg = recentMessages[index + 1];
                if (nextMsg && (nextMsg.msgType === 'system' || nextMsg.isSystem)) {
                    const nextText = nextMsg.text || '';
                    const descMatch = nextText.match(/\[用户发送了一张表情包，AI识图结果：([\s\S]+)\]/);
                    if (descMatch) {
                        consumedIndexes.add(index + 1);
                        const meaningMatch = descMatch[1].match(/【表情包含义】[:：]\s*([\s\S]+?)$/);
                        const stickerMeaning = meaningMatch ? meaningMatch[1].trim() : descMatch[1].trim();
                        return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [表情包]：${stickerMeaning}`;
                    }
                    if (nextText.includes('[用户发送了一张表情包]')) {
                        consumedIndexes.add(index + 1);
                    }
                }
                return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [表情包]`;
            }
            return `${msg.isMe ? myProfile?.name || '我' : persona.name}: [图片]：${desc}`;
        }

        let line = `${msg.isMe ? myProfile?.name || '我' : persona.name}: ${text}`;
        if (!msg.isMe && msg.mindCard) {
            const mc = msg.mindCard;
            const mindParts: string[] = [];
            if (mc.attire) mindParts.push(`着装:${mc.attire}`);
            if (mc.action) mindParts.push(`动作:${mc.action}`);
            if (mc.thought) mindParts.push(`心思:${mc.thought}`);
            if (mc.dark_side) mindParts.push(`阴暗面:${mc.dark_side}`);
            if (mindParts.length > 0) {
                line += `\n[AI心声: ${mindParts.join(' | ')}]`;
            }
        }
        return line;
    };

    // === 10. 本轮消息分离（与微信完全一致） ===
    const lastAiReplyIdx = (() => {
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const m = recentMessages[i];
            if (!m.isMe && m.msgType !== 'system' && !m.isSystem) {
                return i;
            }
        }
        return -1;
    })();

    const currentTurnStart = lastAiReplyIdx >= 0 ? lastAiReplyIdx + 1 : 0;
    const currentTurnMsgIndexes: number[] = [];
    for (let i = currentTurnStart; i < recentMessages.length; i++) {
        const m = recentMessages[i];
        if (m.isMe && m.msgType !== 'system' && !m.isSystem) {
            currentTurnMsgIndexes.push(i);
        }
    }

    const historyLines = recentMessages
        .slice(0, currentTurnStart)
        .map((m, i) => formatOneMsg(m, i))
        .filter(line => line !== '')
        .join('\n');

    let currentTurnLines = '';
    if (currentTurnMsgIndexes.length > 0) {
        const lines = currentTurnMsgIndexes
            .map(idx => formatOneMsg(recentMessages[idx], idx))
            .filter(line => line !== '')
            .join('\n');
        currentTurnLines = `\n⚠️【用户本轮发送的消息，这是你需要回复的主体】\n${lines}`;
    }

    const formattedHistory = historyLines + currentTurnLines;

    // === 11. 时间上下文 ===
    let timeContextValue: string;
    if (disableTimeAwareness) {
        timeContextValue = `【时间感知说明】请忽略现实中的真实系统时间，不要依赖任何外部时钟。请根据聊天记录中的上下文、事件发展和对话内容来推算当前所处的时间线。\n`;
    } else {
        const aiTimezone = settingsRec?.value?.aiTimezone || '跟随用户';
        let nowTime: string;
        if (aiTimezone === '跟随用户') {
            nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        } else {
            try {
                nowTime = new Date().toLocaleString('zh-CN', { timeZone: aiTimezone });
            } catch (e) {
                console.warn(`时区 ${aiTimezone} 无效，回退到 Asia/Shanghai`, e);
                nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            }
        }
        timeContextValue = `【系统当前时间】${nowTime}\n`;
    }

    // === 12. 调用梦人间专用 V2 提示词生成 ===
    const prompt = buildMengrenjianPromptV2({
        aiName: persona.name,
        wechatNickname: persona.wechat_remark || persona.name,
        aiPersona: result.aiPersonaInfo,
        userPersona: result.userPersonaInfo,
        relationship: result.relationshipInfo,
        socialNetwork: result.socialNetworkContent,
        worldbookContent: result.worldbookContent,
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

    (result as any).prompt = prompt;
    (result as any).imageMessages = imageMessages;
    return result;
}

/**
 * 构建自动线下模式 V2 融合提示词（soul 一份 + 双信封 + 对称场景判断；线上线下两态共用）
 * 梦人间专用副本，与 aiContext.ts 中的版本结构一致
 */
function buildMengrenjianPromptV2(data: any, currentPersona: any = null) {

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
[SILENT_CONTINUE] 不是对方说的话——它在没有对方实际消息的时候出现，不用回应它，也不要把它写进回复。

直接以这一轮你选定的格式回复，开头不堆铺垫、不加标记。`;
}
