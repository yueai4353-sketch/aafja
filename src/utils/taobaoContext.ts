/**
 * 淘宝APP专用上下文构建
 * 读取世界书、构建AI人设、构建用户人设，然后按分类推荐商品
 */
export async function buildTaobaoAIContext(persona: any, contactId: string, myProfile: any = {}, category: string = '全部') {
    if (!persona) return null;

    // === 1. 构建 AI 人设信息 ===
    const ai = persona;
    let aiCoreInfo = '';
    if (ai.mode === 'detailed') {
        aiCoreInfo = `
角色姓名：${ai.name}
性别：${ai.gender || '未知'}
年龄：${ai.age || '未知'}
身份：${ai.identity || '未知'}
性格：${ai.personality || '未知'}
外观：${ai.appearance || '未知'}
生活习惯：${ai.lifestyle || '未知'}
成长经历：${ai.background || '未知'}
与用户的关系：${ai.relationship || '未设定'}
${ai.nsfw_info ? 'NSFW相关：' + ai.nsfw_info : ''}`;
    } else {
        aiCoreInfo = `
角色姓名：${ai.name}
人设描述：${ai.bio || ''}`;
    }

    // === 2. 构建用户人设信息 ===
    const userCoreInfo = `
用户姓名：${myProfile.real_name || myProfile.name || '未告知'}
性别：${myProfile.gender || '未知'}
年龄：${myProfile.age || '未知'}
身份：${myProfile.identity || '未知'}
性格：${myProfile.personality || '未知'}
外观：${myProfile.appearance || '未知'}
生活习惯：${myProfile.lifestyle || '未知'}
${myProfile.nsfw ? 'NSFW相关：' + myProfile.nsfw : ''}`;

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
            books.forEach((wb: any) => {
                if (wb.editMode === 'simple') {
                    if (wb.content && wb.content.trim()) {
                        worldbookResult += `\n[${wb.name}]: ${wb.content}`;
                    }
                } else if (wb.entries && wb.entries.length > 0) {
                    wb.entries.forEach((entry: any) => {
                        if (entry.content && entry.content.trim()) {
                            worldbookResult += `\n[${wb.name}] - ${entry.keys}: ${entry.content}`;
                        }
                    });
                }
            });
        }
    } catch (e) {
        console.warn('[淘宝] 读取世界书失败:', e);
    }

    // === 4. 构建最终提示词 ===
    const categoryFilter = category === '全部' 
        ? '请按以下 7 个分类推荐商品，每个分类 5 到 7 条：'
        : `请只推荐「${category}」分类的商品，推荐 8 到 12 条：`;

    const prompt = `【任务】你是一个虚拟购物推荐AI，你需要根据角色人设和用户喜好，生成个性化的商品推荐列表。

【重要规则】
- 不要写角色、人设、记忆、剧情或旁白。
- 不要输出任何多余的解释、问候或对话。
- 只输出纯 JSON 格式的商品数据，不要加 \`\`\`json 标记。
- 商品必须贴合角色世界观和用户的真实喜好。
- 商品名称要具体、真实，像真正的电商平台一样。
- 价格要合理，符合该商品的正常市场价位。
- 每个商品必须有一个简短的推荐理由，结合角色人设或用户偏好来写（用角色的语气）。
- 每个商品必须有一个 icon 字段，用一个 emoji 表示该商品的图标。

【角色人设信息（用于理解推荐风格和语气）】
${aiCoreInfo}

【用户信息（用于个性化推荐）】
${userCoreInfo}

${worldbookResult ? `【世界书/背景设定（用于理解世界观和生活环境）】\n${worldbookResult}\n` : ''}

【推荐要求】
${categoryFilter}

分类说明：
1. 数码好物：小设备、桌面装备、智能配件、耳机音箱、充电设备等
2. 生活家居：收纳、香氛、餐厨用品、居家装饰、清洁工具等
3. 穿搭配饰：服饰、包袋、鞋履、首饰、手表、日常搭配单品等
4. 美妆个护：护肤品、彩妆、身体护理、仪容工具、美容仪器等
5. 情趣用品：成人用品、情趣内衣、调情道具、按摩器具、氛围用品等
6. 食品零食：零食、饮品、养生食品、进口美食、地方特产等
7. 运动户外：运动装备、健身用品、户外用品、瑜伽用品等

【输出格式】
输出一个 JSON 对象，格式如下：
{
    "categories": [
        {
            "name": "分类名称",
            "items": [
                {
                    "title": "商品名称（要具体，如品牌+商品名+规格）",
                    "price": 价格数字（单位：元），
                    "shop": "店铺名称（如：Anker 官方旗舰店）",
                    "icon": "一个代表该商品的emoji",
                    "reason": "推荐理由（1句话，用角色语气）",
                    "tag": "标签（如：热卖/新品/限时/好评）"
                }
            ]
        }
    ]
}

注意：
- price 必须是数字，不要加引号
- title 要像真实电商商品标题，具体到品牌和型号
- shop 是该商品所属的店铺名称，要真实可信
- icon 用一个 emoji 代表该商品类型（如🔌代表充电器，⌨️代表键盘，💄代表口红）
- reason 用角色的口吻和性格来写，体现人设特点
- 如果角色和用户之间有特殊关系，推荐理由可以体现这种关系（如关心、调侃、暧昧等）
- 情趣用品分类的推荐要自然、不尴尬，结合角色与用户的关系来写理由

直接输出 JSON，不要任何前缀后缀。`;

    return {
        prompt,
        aiName: ai.name,
        category
    };
}

/**
 * 构建搜索商品的提示词
 */
export function buildTaobaoSearchPrompt(persona: any, myProfile: any = {}, searchQuery: string) {
    if (!persona) return null;

    const ai = persona;
    let aiCoreInfo = '';
    if (ai.mode === 'detailed') {
        aiCoreInfo = `角色：${ai.name}，${ai.gender || ''}，${ai.personality || ''}`;
    } else {
        aiCoreInfo = `角色：${ai.name}，${ai.bio || ''}`;
    }

    const prompt = `【任务】根据用户搜索词，生成匹配的虚拟商品列表。

【规则】
- 只输出纯 JSON，不要多余文字
- 商品要和搜索词高度相关
- 价格合理、名称具体
- 推荐理由用角色语气

【角色信息】
${aiCoreInfo}

【用户搜索词】${searchQuery}

【输出格式】
{
    "items": [
        {
            "title": "商品名称",
            "price": 价格数字,
            "reason": "推荐理由（角色语气，1句话）",
            "tag": "标签"
        }
    ]
}

生成 8-12 个相关商品。直接输出 JSON。`;

    return {
        prompt,
        aiName: ai.name,
        searchQuery
    };
}
