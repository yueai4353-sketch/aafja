import { AppDB } from '../db';

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
                     // 简单模式：内容始终注入AI (不论是否有 recentMessages)
                     if (wb.content && wb.content.trim()) {
                         worldbookResult += `\n[${wb.name}]: ${wb.content}`;
                     }
                } else if (wb.entries && wb.entries.length > 0) {
                    // 条目模式：必须有最近的聊天记录才触发关键词匹配
                    if (recentMessages.length > 0) {
                        wb.entries.forEach((entry: any) => {
                            // 支持中英文逗号分割
                            const keys = entry.keys.split(/[,，]/).map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
                            // 如果 entry.keys 为空，则相当于无条件触发？通常我们需要给一个机制，不过这里按照包含判断
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

    let prompt = '';
    
    // 收集聊天记录中用户发送的图片 base64（用于多模态 Vision 请求）
    const imageMessages: string[] = [];

    const formattedHistory = recentMessages.map((msg: any) => {
        if (msg.msgType === 'system' || msg.msgType === 'narrator') {
            if (msg.text === '你撤回了一条消息' && msg.recalledContent) {
                 const secondsMatch = msg.recalledContent.match(/\[SECONDS:(\d+)\]$/);
                 const seconds = secondsMatch ? secondsMatch[1] : '0';
                 const actualContent = msg.recalledContent.replace(/\[SECONDS:\d+\]$/, '');
                 return `[撤回: 原内容:"${actualContent}", 撤回了${seconds}秒, 和你当时的活跃状态:活跃]`;
            }
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
        return `${msg.isMe ? myProfile?.name || '我' : persona.name}: ${text}`;
    }).join('\n');
    // 根据"停用时间感知"开关决定 timeContext 内容
    let timeContextValue: string;
    if (disableTimeAwareness) {
        // 开关开启：不注入真实时间，告知 AI 根据上下文推算时间线
        timeContextValue = result.timeContext || `【时间感知说明】请忽略现实中的真实系统时间，不要依赖任何外部时钟。请根据聊天记录中的上下文、事件发展和对话内容来推算当前所处的时间线。\n`;
    } else {
        // 开关关闭（默认）：注入真实当前时间
        const nowTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        timeContextValue = result.timeContext || `【系统当前时间】${nowTime}\n`;
    }

    if (useV2) {
        // 内部已经有一个独立导出的 buildAutoOfflineSystemPromptV2，我们直接调用它，而不是再声明一次
        prompt = buildAutoOfflineSystemPromptV2({
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
            userGender: myProfile?.gender || '',
            aiPov: aiPov,
            userPov: userPov,
            customStyle: customStyle,
            forceMindCard: forceMindCard,
            currentMode: 'online', // Or detect if currently offline based on context/state
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

    const worldRealityBlock = worldbookForceContent ? `══════════ 【你所在世界的事实】══════════
（这是你这世界的事实，无法违背；它们补强你，不替代你的个性。）
${worldbookForceContent}
═══════════════════════════════════════════════
` : '';

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
[SILENT_CONTINUE] 不是对方说的话——它在没有对方实际消息的时候出现，不用回应它，也不要把它写进回复。

直接以这一轮你选定的格式回复，开头不堆铺垫、不加标记。`;
}
