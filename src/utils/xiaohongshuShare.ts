// 小红书分享功能 - 消息处理模块
import {
    safeText,
    isObject,
    truncate,
    normalizeXiaohongshuUrl,
    extractShareId,
    normalizeComments,
    normalizeStats,
    normalizeProfile,
    normalizeProduct,
    isProductShareSourceText,
    extractProductTitleFromSourceText,
    extractProfileStatsFromSourceText,
    mergeProfileStats,
    normalizeProfilePosts,
    inferShareKind,
    normalizeProductImages,
    isLikelyProfileImageUrl,
    parseCountNumber,
    normalizeImageSummary,
    normalizeCommentSummary,
    normalizeVideoInfo,
    hasStats,
    mergeProfileData,
    mergeProductData,
    hasSummary,
    hasVideoInfo,
    parseTimestamp,
    normalizeWhitespace,
    normalizeProfileStats,
    hasProfileStats,
    normalizeProfilePost,
    truncateAtLine,
    appendText,
    appendSpan,
    DATASET_KEY,
    CONTACT_DATASET_KEY,
    CARD_CLASS,
    STATUS_LABELS,
    POST_TYPE_LABELS,
    XHS_FACTUAL_TEXT_MAX_CHARS
} from './xiaohongshuUtils';

// 辅助函数：检查是否为可用的图片URL
function isUsableImageUrl(url: any): boolean {
    const urlStr = safeText(url);
    return !!(urlStr && (urlStr.startsWith('http://') || urlStr.startsWith('https://')));
}

// 消息类型常量
export const MESSAGE_TYPE = 'xiaohongshu_share';

// 辅助函数：添加视觉提示块
function pushPromptVisual(blocks: any[], seen: Set<string>, label: string, url: any): boolean {
    const urlStr = safeText(url);
    if (!urlStr || seen.has(urlStr)) return false;
    seen.add(urlStr);
    blocks.push({
        type: 'image_url',
        image_url: { url: urlStr, detail: 'high' }
    });
    return true;
}

// 辅助函数：添加视觉输入说明
function appendPromptVisualHint(blocks: any[], hint: string): void {
    const textBlock = blocks.find(b => b.type === 'text');
    if (textBlock) {
        textBlock.text = `${hint}\n\n${textBlock.text}`;
    }
}

export const ChatXiaohongshuShare = {
    _savingShareStack: [] as any[],
    _fetchRequests: new Map<string, any>(),
    _fetchGeneration: 0,

    init() {
        this.patchSendMessage();
        this.patchAddMessage();
        this.patchChatDBHelper();
        this.patchRecoverPendingMessagesFromDOM();
        this.patchGetAiReply();
    },

    extractXiaohongshuUrl(text: any): string {
        const source = safeText(text);
        if (!source) return '';

        const candidates: string[] = [];
        const urlPart = '[A-Za-z0-9\\-._~:/?#@!$&()*+,;=%]+';
        const httpMatches = source.match(new RegExp(`https?:\\/\\/${urlPart}`, 'gi')) || [];
        httpMatches.forEach(url => candidates.push(url));

        const bareMatches = source.match(new RegExp(`(?:^|[\\s])((?:www\\.)?xiaohongshu\\.com\\/${urlPart}|xhslink\\.com\\/${urlPart})`, 'gi')) || [];
        bareMatches.forEach(match => candidates.push(match.trim()));

        for (const candidate of candidates) {
            const normalized = normalizeXiaohongshuUrl(candidate);
            if (normalized) return normalized;
        }
        return '';
    },

    buildInitialShare(url: string, sourceText: string = ''): any {
        const normalizedUrl = normalizeXiaohongshuUrl(url) || safeText(url);
        return this.normalizeShareData({
            platform: 'xiaohongshu',
            shareKind: 'unknown',
            postType: 'unknown',
            url: normalizedUrl,
            resolvedUrl: '',
            canonicalUrl: '',
            shareId: extractShareId(normalizedUrl),
            sourceText,
            title: '',
            description: '',
            authorName: '',
            ipLocation: '',
            coverUrl: '',
            images: [],
            videoFrames: [],
            comments: [],
            tags: [],
            stats: {},
            profile: {},
            profilePosts: [],
            product: {},
            publishedAt: 0,
            publishedAtText: '',
            updatedAt: 0,
            updatedAtText: '',
            imageCount: 0,
            imageSummary: {
                totalCount: 0,
                parsedCount: 0,
                hasMore: false
            },
            commentSummary: {
                totalCount: '',
                topLevelCount: '',
                parsedCount: 0,
                parsedReplyCount: 0,
                hasMore: false
            },
            videoInfo: {
                coverUrl: '',
                duration: '',
                durationSeconds: 0,
                width: '',
                height: '',
                videoUrl: '',
                transcript: '',
                transcriptLanguage: '',
                transcriptTruncated: false
            },
            status: 'pending',
            fetchedAt: null,
            error: ''
        });
    },

    normalizeShareData(value: any): any {
        let data = value;
        if (typeof value === 'string') {
            const parsed = this.parseShareJson(value);
            data = parsed || { url: normalizeXiaohongshuUrl(value) || value };
        }
        if (!isObject(data)) data = {};

        const url = safeText(data.url);
        const rawPostType = safeText(data.postType || data.type).toLowerCase();
        const postType = ['video', 'image', 'unknown'].includes(rawPostType) ? rawPostType : 'unknown';
        const rawImages = Array.isArray(data.images) ? data.images : [];
        const videoFrames = Array.isArray(data.videoFrames) ? data.videoFrames : [];
        const comments = normalizeComments(data.comments);
        const stats = normalizeStats(data.stats);
        const sourceText = truncate(data.sourceText || data.shareText || data.originalText, 500);
        const profile = normalizeProfile(data.profile || data.userProfile);
        const product = normalizeProduct(data.product || data.goods || data.commodity || data.sku);
        if (!product.title && isProductShareSourceText(sourceText)) {
            product.title = extractProductTitleFromSourceText(sourceText);
        }
        const sourceProfileStats = extractProfileStatsFromSourceText(sourceText);
        profile.stats = mergeProfileStats(
            { likedAndCollectedCount: sourceProfileStats.likedAndCollectedCount },
            profile.stats
        );
        const profilePosts = normalizeProfilePosts(data.profilePosts || data.recentPosts || data.postList || data.notes);
        const shareKind = inferShareKind(data, postType, profile, profilePosts, product, rawImages, videoFrames, comments, stats, sourceText);
        if (shareKind === 'product') {
            if (!product.title) product.title = safeText(data.title);
            if (!product.description) product.description = safeText(data.description || data.desc);
            if (!product.coverUrl && isLikelyProfileImageUrl(data.coverUrl)) product.coverUrl = safeText(data.coverUrl);
            if (!product.images.length) product.images = normalizeProductImages(rawImages);
        }
        const images = shareKind === 'product' && product.images.length ? product.images : rawImages;
        const coverUrl = safeText(data.coverUrl)
            || (shareKind === 'profile' ? profile.avatarUrl : '')
            || (shareKind === 'product' ? (product.coverUrl || product.images[0] || '') : '');
        const imageCount = parseCountNumber(data.imageCount);
        const imageSummary = normalizeImageSummary(data.imageSummary, images, imageCount);
        const commentSummary = normalizeCommentSummary(data.commentSummary, comments, stats);

        return {
            platform: 'xiaohongshu',
            shareKind,
            postType,
            url,
            resolvedUrl: safeText(data.resolvedUrl),
            canonicalUrl: safeText(data.canonicalUrl),
            shareId: safeText(data.shareId) || extractShareId(data.canonicalUrl || data.resolvedUrl || url),
            sourceText,
            title: truncate(data.title, 160),
            description: shareKind === 'note'
                ? truncate(data.description || data.desc, 1000)
                : safeText(data.description || data.desc),
            authorName: truncate(data.authorName || data.author, 100),
            ipLocation: truncate(data.ipLocation || data.ip_location, 80),
            coverUrl,
            images,
            videoFrames,
            comments,
            tags: Array.isArray(data.tags) ? data.tags.map(safeText).filter(Boolean).slice(0, 12) : [],
            stats,
            profile,
            profilePosts,
            product,
            publishedAt: parseTimestamp(data.publishedAt),
            publishedAtText: safeText(data.publishedAtText),
            updatedAt: parseTimestamp(data.updatedAt),
            updatedAtText: safeText(data.updatedAtText),
            imageCount: imageSummary.totalCount || imageCount || images.length,
            imageSummary,
            commentSummary,
            videoInfo: normalizeVideoInfo(data.videoInfo),
            status: ['pending', 'ready', 'failed'].includes(data.status) ? data.status : 'pending',
            fetchedAt: data.fetchedAt || null,
            error: safeText(data.error)
        };
    },

    mergeShareData(baseShare: any, incomingShare: any): any {
        const base = this.normalizeShareData(baseShare);
        const incoming = this.normalizeShareData(incomingShare);
        return this.normalizeShareData({
            ...base,
            shareKind: incoming.shareKind !== 'unknown' ? incoming.shareKind : base.shareKind,
            resolvedUrl: incoming.resolvedUrl || base.resolvedUrl,
            canonicalUrl: incoming.canonicalUrl || base.canonicalUrl,
            shareId: incoming.shareId || base.shareId,
            sourceText: incoming.sourceText || base.sourceText,
            postType: incoming.postType !== 'unknown' ? incoming.postType : base.postType,
            title: incoming.title || base.title,
            description: incoming.description || base.description,
            authorName: incoming.authorName || base.authorName,
            ipLocation: incoming.ipLocation || base.ipLocation,
            coverUrl: incoming.coverUrl || base.coverUrl,
            images: incoming.images.length ? incoming.images : base.images,
            videoFrames: incoming.videoFrames.length ? incoming.videoFrames : base.videoFrames,
            comments: incoming.comments.length ? incoming.comments : base.comments,
            tags: incoming.tags.length ? incoming.tags : base.tags,
            stats: hasStats(incoming.stats) ? incoming.stats : base.stats,
            profile: mergeProfileData(base.profile, incoming.profile),
            profilePosts: incoming.shareKind === 'profile' && incoming.status === 'ready'
                ? incoming.profilePosts
                : (incoming.profilePosts.length ? incoming.profilePosts : base.profilePosts),
            product: mergeProductData(base.product, incoming.product),
            publishedAt: incoming.publishedAt || base.publishedAt,
            publishedAtText: incoming.publishedAtText || base.publishedAtText,
            updatedAt: incoming.updatedAt || base.updatedAt,
            updatedAtText: incoming.updatedAtText || base.updatedAtText,
            imageCount: incoming.imageCount || base.imageCount,
            imageSummary: hasSummary(incoming.imageSummary) ? incoming.imageSummary : base.imageSummary,
            commentSummary: hasSummary(incoming.commentSummary) ? incoming.commentSummary : base.commentSummary,
            videoInfo: hasVideoInfo(incoming.videoInfo) ? incoming.videoInfo : base.videoInfo,
            status: incoming.status || base.status,
            fetchedAt: incoming.fetchedAt || Date.now(),
            error: incoming.error
        });
    },

    markShareFailed(share: any, error: any): any {
        return this.normalizeShareData({
            ...this.normalizeShareData(share),
            status: 'failed',
            fetchedAt: Date.now(),
            error: safeText(error) || '解析失败'
        });
    },

    parseShareJson(value: any): any {
        try {
            const parsed = JSON.parse(value || '{}');
            return isObject(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    },

    stringifyShare(share: any): string {
        return JSON.stringify(this.normalizeShareData(share));
    },

    getShareFromElement(element: any): any {
        if (!element || !element.dataset) return null;
        const raw = element.dataset[DATASET_KEY] || '';
        const parsed = this.parseShareJson(raw);
        if (parsed) return this.normalizeShareData(parsed);
        const card = element.querySelector(`.${CARD_CLASS}`);
        if (card && card.dataset && card.dataset[DATASET_KEY]) {
            const cardParsed = this.parseShareJson(card.dataset[DATASET_KEY]);
            if (cardParsed) return this.normalizeShareData(cardParsed);
        }
        return null;
    },

    getElementTimestamp(element: any): number {
        return parseTimestamp(element && element.dataset ? element.dataset.timestamp : '');
    },

    getElementContactId(element: any): string {
        return safeText(element && element.dataset ? element.dataset[CONTACT_DATASET_KEY] : '');
    },

    setElementContactId(element: any, contactId: any): string {
        const cid = safeText(contactId);
        if (element && element.dataset && cid) {
            element.dataset[CONTACT_DATASET_KEY] = cid;
        }
        return cid;
    },

    getShareKey(contactId: any, fullTimestamp: any, url: any): string {
        return `${safeText(contactId)}|${parseTimestamp(fullTimestamp)}|${safeText(url)}`;
    },

    pushSavingShare(share: any): void {
        this._savingShareStack.push(this.normalizeShareData(share));
    },

    popSavingShare(): void {
        this._savingShareStack.pop();
    },

    peekSavingShare(): any {
        return this._savingShareStack[this._savingShareStack.length - 1] || null;
    },

    buildPreviewText(share: any): string {
        const data = this.normalizeShareData(share);
        const isProfile = data.shareKind === 'profile';
        const isProduct = data.shareKind === 'product';
        const profile = data.profile || {};
        const product = data.product || {};
        const fallbackTitle = isProfile ? '小红书主页' : (isProduct ? '小红书商品' : '小红书链接');
        const label = isProfile
            ? (data.title || (profile.nickname ? `${profile.nickname}的小红书主页` : '') || data.url || fallbackTitle)
            : isProduct
                ? (product.title || data.title || data.url || fallbackTitle)
            : (data.title || data.url || fallbackTitle);
        return `[${isProfile ? '小红书主页' : (isProduct ? '小红书商品' : '小红书分享')}] ${truncate(label, 80)}`;
    },

    formatListValue(value: any): string {
        if (typeof value === 'string') return normalizeWhitespace(value);
        if (!isObject(value)) return normalizeWhitespace(value);

        const title = safeText(value.title);
        const desc = safeText(value.description || value.desc);
        const text = safeText(value.text || value.content);
        const type = safeText(value.type || value.kind || value.label);
        const url = safeText(value.url || value.imageUrl || value.frameUrl);
        const parts = [type, title, desc, text, url].filter(Boolean);
        return normalizeWhitespace(parts.join(' | '));
    },

    formatCommentReply(value: any): string {
        if (typeof value === 'string') return normalizeWhitespace(value);
        if (!isObject(value)) return normalizeWhitespace(value);
        let author = safeText(value.authorName || value.author || value.nickname || value.user);
        if (value.isNoteAuthor === true && author) author += '（作者）';
        const content = safeText(value.content || value.text || value.comment);
        const target = safeText(value.targetAuthorName);
        let line = author && content ? `${author}：${content}` : (content || author);
        if (target) line = `${author || '该用户'} 回复 ${target}：${content}`;
        const meta = [];
        if (value.likeCount) meta.push(`赞 ${safeText(value.likeCount)}`);
        if (value.createdAtText) meta.push(safeText(value.createdAtText));
        if (value.ipLocation) meta.push(`IP ${safeText(value.ipLocation)}`);
        if (Array.isArray(value.pictures) && value.pictures.length) meta.push(`图片 ${value.pictures.length} 张`);
        if (meta.length) line += `（${meta.join('，')}）`;
        return normalizeWhitespace(line);
    },

    formatCommentValue(value: any): string {
        if (typeof value === 'string') return normalizeWhitespace(value);
        if (!isObject(value)) return normalizeWhitespace(value);

        let author = safeText(value.authorName || value.author || value.nickname || value.user);
        if (value.isNoteAuthor === true && author) author += '（作者）';
        const content = safeText(value.content || value.text || value.comment);
        let line = author && content ? `${author}：${content}` : (content || author);
        const meta = [];
        const likes = safeText(value.likeCount || value.likes);
        if (likes) meta.push(`赞 ${likes}`);
        if (value.createdAtText) meta.push(safeText(value.createdAtText));
        if (value.ipLocation) meta.push(`IP ${safeText(value.ipLocation)}`);
        if (Array.isArray(value.pictures) && value.pictures.length) meta.push(`图片 ${value.pictures.length} 张`);
        const parsedReplies = parseCountNumber(value.parsedSubCommentCount);
        const totalReplies = safeText(value.subCommentCount);
        if (parseCountNumber(totalReplies) > 0 || parsedReplies > 0) {
            meta.push(`回复 ${parsedReplies}/${totalReplies || parsedReplies}`);
        }
        if (meta.length) line += `（${meta.join('，')}）`;
        const replies = Array.isArray(value.subComments)
            ? value.subComments.map(item => this.formatCommentReply(item)).filter(Boolean)
            : [];
        if (replies.length) line += `；回复：${replies.join('；')}`;
        return normalizeWhitespace(line);
    },

    appendListLines(lines: string[], label: string, list: any[], formatter: (item: any) => string): void {
        if (!Array.isArray(list) || list.length === 0) return;
        const items = list.map(item => formatter.call(this, item)).filter(Boolean);
        if (items.length === 0) return;
        lines.push(`${label}：`);
        items.forEach(item => lines.push(`- ${item}`));
    },

    formatStatsLine(stats: any): string {
        if (!hasStats(stats)) return '';
        const parts = [];
        if (stats.likedCount) parts.push(`点赞 ${stats.likedCount}`);
        if (stats.collectedCount) parts.push(`收藏 ${stats.collectedCount}`);
        if (stats.commentCount) parts.push(`评论 ${stats.commentCount}`);
        if (stats.shareCount) parts.push(`分享 ${stats.shareCount}`);
        return parts.join('，');
    },

    formatProfileStatsLine(stats: any): string {
        const data = normalizeProfileStats(stats);
        if (!hasProfileStats(data)) return '';
        const parts = [];
        if (data.followingCount) parts.push(`关注 ${data.followingCount}`);
        if (data.followerCount) parts.push(`粉丝 ${data.followerCount}`);
        if (data.likedAndCollectedCount) parts.push(`获赞与收藏 ${data.likedAndCollectedCount}`);
        if (data.noteCount) parts.push(`笔记 ${data.noteCount}`);
        return parts.join('；');
    },

    formatProfilePostValue(value: any): string {
        const item = normalizeProfilePost(value);
        if (!item) return '';
        const parts = [];
        if (item.title) parts.push(item.title);
        if (item.description) parts.push(item.description);
        if (item.likedCount) parts.push(`点赞 ${item.likedCount}`);
        if (item.collectedCount) parts.push(`收藏 ${item.collectedCount}`);
        if (item.commentCount) parts.push(`评论 ${item.commentCount}`);
        if (item.url) parts.push(item.url);
        return normalizeWhitespace(parts.join(' | '));
    },

    formatImageSummaryLine(data: any): string {
        const summary = data.imageSummary || {};
        const totalCount = parseCountNumber(summary.totalCount) || data.imageCount || data.images.length;
        const parsedCount = parseCountNumber(summary.parsedCount) || data.images.length;
        if (!totalCount && !parsedCount) return '';
        let line = `共 ${totalCount || '未知'} 张，已解析 ${parsedCount} 张`;
        if (summary.hasMore) line += '，还有未解析图片';
        return line;
    },

    formatCommentSummaryLine(data: any): string {
        const summary = data.commentSummary || {};
        const totalCount = safeText(summary.totalCount);
        const parsedCount = parseCountNumber(summary.parsedCount) || data.comments.length;
        if (!totalCount && !parsedCount) return '';
        const topLevelCount = safeText(summary.topLevelCount);
        const parsedReplyCount = parseCountNumber(summary.parsedReplyCount);
        let line = `共 ${totalCount || '未知'} 条，已解析一级评论 ${parsedCount} 条`;
        if (topLevelCount) line += `（平台显示一级评论 ${topLevelCount} 条）`;
        if (parsedReplyCount) line += `，已解析回复 ${parsedReplyCount} 条`;
        if (summary.hasMore) line += '，还有未解析评论';
        return line;
    },

    formatVideoInfoLine(info: any): string {
        const data = normalizeVideoInfo(info);
        const parts = [];
        if (data.durationSeconds) parts.push(`时长 ${data.durationSeconds} 秒`);
        else if (data.duration) parts.push(`时长 ${data.duration}`);
        if (data.width || data.height) parts.push(`尺寸 ${data.width || '?'}x${data.height || '?'}`);
        return parts.join('，');
    },

    formatCardSummaryLine(data: any): string {
        const parts = [];
        const imageSummary = this.formatImageSummaryLine(data);
        const commentSummary = this.formatCommentSummaryLine(data);
        if (imageSummary) parts.push(`图 ${data.imageSummary.parsedCount || data.images.length}/${data.imageSummary.totalCount || data.imageCount || '?'}`);
        if (commentSummary) parts.push(`评 ${data.commentSummary.parsedCount || data.comments.length}/${data.commentSummary.totalCount || '?'}`);
        return parts.join('，');
    },

    buildProductFactualText(share: any): string {
        const data = this.normalizeShareData(share);
        const product = data.product || {};
        const lines = ['user 给你分享了一个小红书商品：'];
        if (data.sourceText) lines.push(`用户分享文案：${data.sourceText}`);
        if (data.url) lines.push(`链接：${data.url}`);
        const resolvedLink = data.canonicalUrl || data.resolvedUrl;
        if (resolvedLink && resolvedLink !== data.url) lines.push(`解析后链接：${resolvedLink}`);
        if (product.title || data.title) lines.push(`商品标题：${product.title || data.title}`);
        if (product.productId || data.shareId) lines.push(`商品ID：${product.productId || data.shareId}`);
        if (product.price) lines.push(`价格：${product.price}`);
        if (product.originalPrice) lines.push(`原价：${product.originalPrice}`);
        if (product.shopName) lines.push(`店铺：${product.shopName}`);
        if (product.brandName) lines.push(`品牌：${product.brandName}`);
        if (product.salesText) lines.push(`销量/售卖信息：${product.salesText}`);
        if (product.description || data.description) lines.push(`商品描述：${product.description || data.description}`);
        if (product.coverUrl || data.coverUrl) lines.push(`商品封面：${product.coverUrl || data.coverUrl}`);
        const productImages = product.images && product.images.length ? product.images : data.images;
        this.appendListLines(lines, '商品图片', productImages, this.formatListValue);
        lines.push(`解析状态：${STATUS_LABELS[data.status] || data.status || '待解析'}`);
        if (data.error) lines.push(`解析错误：${data.error}`);
        return lines.join('\n');
    },

    buildProfileFactualText(share: any): string {
        const data = this.normalizeShareData(share);
        const profile = data.profile || {};
        const lines = ['user 给你分享了一个小红书主页：'];
        if (data.sourceText) lines.push(`用户分享文案：${data.sourceText}`);
        if (data.url) lines.push(`链接：${data.url}`);
        const resolvedLink = data.canonicalUrl || data.resolvedUrl;
        if (resolvedLink && resolvedLink !== data.url) lines.push(`解析后链接：${resolvedLink}`);
        if (data.title) lines.push(`标题：${data.title}`);
        if (profile.nickname || data.authorName) lines.push(`主页昵称：${profile.nickname || data.authorName}`);
        if (profile.redId) lines.push(`小红书号：${profile.redId}`);
        if (profile.userId) lines.push(`用户ID：${profile.userId}`);
        if (profile.description || data.description) lines.push(`简介：${profile.description || data.description}`);
        if (profile.ipLocation) lines.push(`IP属地：${profile.ipLocation}`);
        if (profile.verifiedInfo) lines.push(`认证信息：${profile.verifiedInfo}`);
        if (profile.avatarUrl || data.coverUrl) lines.push(`头像：${profile.avatarUrl || data.coverUrl}`);
        const statsLine = this.formatProfileStatsLine(profile.stats);
        if (statsLine) lines.push(`主页数据（平台公开显示，可能为约数）：${statsLine}`);
        this.appendListLines(lines, '最近笔记', data.profilePosts, this.formatProfilePostValue);
        lines.push(`解析状态：${STATUS_LABELS[data.status] || data.status || '待解析'}`);
        if (data.error) lines.push(`解析错误：${data.error}`);
        return lines.join('\n');
    },

    buildFactualText(share: any): string {
        const data = this.normalizeShareData(share);
        if (data.shareKind === 'product') return this.buildProductFactualText(data);
        if (data.shareKind === 'profile') return this.buildProfileFactualText(data);
        const lines = ['user 给你分享了一个小红书链接：'];
        if (data.sourceText) lines.push(`用户分享文案：${data.sourceText}`);
        if (data.url) lines.push(`链接：${data.url}`);
        const resolvedLink = data.canonicalUrl || data.resolvedUrl;
        if (resolvedLink && resolvedLink !== data.url) lines.push(`解析后链接：${resolvedLink}`);
        lines.push(`类型：${POST_TYPE_LABELS[data.postType] || data.postType || '未知'}`);
        if (data.publishedAtText) lines.push(`发布时间：${data.publishedAtText}`);
        if (data.updatedAtText) lines.push(`更新时间：${data.updatedAtText}`);
        if (data.title) lines.push(`标题：${data.title}`);
        if (data.authorName) lines.push(`作者：${data.authorName}`);
        if (data.ipLocation) lines.push(`IP属地：${data.ipLocation}`);
        if (data.description) lines.push(`正文：${data.description}`);
        if (data.tags.length) lines.push(`标签：${data.tags.join('、')}`);
        const statsLine = this.formatStatsLine(data.stats);
        if (statsLine) lines.push(`互动：${statsLine}`);
        const imageSummaryLine = this.formatImageSummaryLine(data);
        if (imageSummaryLine) lines.push(`图片概况：${imageSummaryLine}`);
        const commentSummaryLine = this.formatCommentSummaryLine(data);
        if (commentSummaryLine) lines.push(`评论概况：${commentSummaryLine}`);
        const videoInfoLine = this.formatVideoInfoLine(data.videoInfo);
        if (videoInfoLine) lines.push(`视频信息：${videoInfoLine}`);
        if (data.videoInfo.transcript) {
            const language = data.videoInfo.transcriptLanguage ? `（${data.videoInfo.transcriptLanguage}）` : '';
            const truncated = data.videoInfo.transcriptTruncated ? '（字幕已截断）' : '';
            lines.push(`视频字幕${language}${truncated}：\n${data.videoInfo.transcript}`);
        }
        this.appendListLines(lines, '评论', data.comments, this.formatCommentValue);
        lines.push(`解析状态：${STATUS_LABELS[data.status] || data.status || '待解析'}`);
        if (data.error) lines.push(`解析错误：${data.error}`);
        return truncateAtLine(lines.join('\n'), XHS_FACTUAL_TEXT_MAX_CHARS);
    },

    buildPromptContent(share: any, messageText: any): any {
        const data = this.normalizeShareData(share);
        const text = safeText(messageText) || this.buildFactualText(data);
        const blocks = [{ type: 'text', text }];
        const seen = new Set<string>();

        if (data.shareKind === 'product') {
            const product = data.product || {};
            pushPromptVisual(blocks, seen, '商品封面', product.coverUrl || data.coverUrl);
            let imageIndex = 1;
            const productImages = product.images && product.images.length ? product.images : data.images;
            productImages.forEach((url: any) => {
                if (pushPromptVisual(blocks, seen, `商品图片 ${imageIndex}`, url)) {
                    imageIndex += 1;
                }
            });
            if (blocks.length > 1) {
                appendPromptVisualHint(blocks, '【视觉输入】下面附带了商品封面和商品图片块，请直接观察这些真实图片，不要只把图片 URL 当作文本链接。');
                return blocks;
            }
            return text;
        }

        if (data.shareKind === 'profile') {
            pushPromptVisual(blocks, seen, '主页头像', data.profile && data.profile.avatarUrl || data.coverUrl);
            let postIndex = 1;
            data.profilePosts.forEach((post: any) => {
                if (pushPromptVisual(blocks, seen, `主页最近笔记 ${postIndex}`, post && post.coverUrl)) {
                    postIndex += 1;
                }
            });
            if (blocks.length > 1) {
                appendPromptVisualHint(blocks, '【视觉输入】下面附带了主页头像和最近笔记封面图片块，请直接观察这些真实图片，不要只把图片 URL 当作文本链接。');
                return blocks;
            }
            return text;
        }

        const useVideoFrames = data.videoFrames.length
            && (data.postType === 'video' || !data.images.length);

        if (useVideoFrames) {
            let visualIndex = 1;
            data.videoFrames.forEach((frame: any) => {
                const frameUrl = typeof frame === 'string' ? frame : frame && frame.url;
                if (pushPromptVisual(blocks, seen, `视频截帧 ${visualIndex}`, frameUrl)) {
                    visualIndex += 1;
                }
            });
        } else if (data.images.length) {
            let visualIndex = 1;
            data.images.forEach((url: any) => {
                if (pushPromptVisual(blocks, seen, `图片 ${visualIndex}`, url)) {
                    visualIndex += 1;
                }
            });
        }

        if (seen.size === 0) {
            pushPromptVisual(blocks, seen, '封面', data.coverUrl);
            pushPromptVisual(blocks, seen, '视频封面', data.videoInfo && data.videoInfo.coverUrl);
        }

        let commentVisualIndex = 1;
        const appendCommentPictures = (comment: any) => {
            if (!isObject(comment)) return;
            const pictures = Array.isArray(comment.pictures) ? comment.pictures : [];
            pictures.forEach((url: any) => {
                if (pushPromptVisual(blocks, seen, `评论图片 ${commentVisualIndex}`, url)) {
                    commentVisualIndex += 1;
                }
            });
        };
        data.comments.forEach((comment: any) => {
            appendCommentPictures(comment);
            if (isObject(comment) && Array.isArray(comment.subComments)) {
                comment.subComments.forEach(appendCommentPictures);
            }
        });

        if (blocks.length > 1) {
            appendPromptVisualHint(blocks, '【视觉输入】下面附带的图片块是用户分享内容的真实画面，请直接观察图片内容，不要只把图片 URL 当作文本链接。');
            return blocks;
        }
        return text;
    },

    buildPendingMessage(share: any, meetingMode: any, heartVoice: any, meta: any = {}): any {
        const data = this.normalizeShareData(share);
        const fullTimestamp = parseTimestamp(meta.fullTimestamp);
        const shareContactId = safeText(meta.shareContactId);
        const msg: any = {
            type: MESSAGE_TYPE,
            content: this.buildFactualText(data),
            data,
            meetingMode: meetingMode || 'online'
        };
        if (fullTimestamp) msg.fullTimestamp = fullTimestamp;
        if (shareContactId) msg.shareContactId = shareContactId;
        if (heartVoice) msg.heartVoice = heartVoice;
        return msg;
    },

    clearContentButKeepIndicators(contentDiv: any): void {
        Array.from(contentDiv.childNodes).forEach((node: any) => {
            if (
                node.nodeType === 1 &&
                (
                    node.classList.contains('mind-card-indicator') ||
                    node.classList.contains('heart-voice-indicator') ||
                    node.classList.contains('spy-report-indicator')
                )
            ) {
                return;
            }
            node.remove();
        });
    },

    renderMessageElement(messageDiv: any, share: any, options: any = {}): void {
        if (!messageDiv || !messageDiv.dataset) return;
        const contentDiv = messageDiv.querySelector('.chat-message-content');
        if (!contentDiv) return;

        const data = this.normalizeShareData(share || this.getShareFromElement(messageDiv));
        const isProfile = data.shareKind === 'profile';
        const isProduct = data.shareKind === 'product';
        const profile = data.profile || {};
        const product = data.product || {};
        const mediaUrl = isProduct
            ? (product.coverUrl || data.coverUrl || (product.images && product.images[0]) || data.images[0] || '')
            : isProfile
                ? (profile.avatarUrl || data.coverUrl || '')
                : (data.coverUrl || data.images[0] || '');
        const mediaFallback = isProfile ? '主页' : (isProduct ? '商品' : '小红书');
        const cardTitle = isProfile
            ? (data.title || (profile.nickname ? `${profile.nickname}的小红书主页` : '') || '小红书主页')
            : isProduct
                ? (product.title || data.title || '小红书商品')
            : (data.title || '小红书分享');
        const shareContactId = this.setElementContactId(
            messageDiv,
            options.shareContactId || options.contactId || this.getElementContactId(messageDiv)
        );
        messageDiv.dataset.type = MESSAGE_TYPE;
        messageDiv.dataset[DATASET_KEY] = this.stringifyShare(data);
        messageDiv.classList.add('xiaohongshu-share-message');
        contentDiv.classList.add('xiaohongshu-share-content');
        contentDiv.style.background = 'transparent';
        contentDiv.style.padding = '0';
        this.clearContentButKeepIndicators(contentDiv);

        const card = document.createElement('div');
        card.className = CARD_CLASS;
        card.dataset[DATASET_KEY] = this.stringifyShare(data);
        if (shareContactId) card.dataset[CONTACT_DATASET_KEY] = shareContactId;
        card.style.cssText = [
            'width: 320px',
            'max-width: 85vw',
            'display: flex',
            'align-items: stretch',
            'overflow: hidden',
            'border-radius: 12px',
            'background: #ffffff',
            'box-shadow: 0 2px 8px rgba(0,0,0,0.06)'
        ].join('; ');

        const mediaWrapper = document.createElement('div');
        mediaWrapper.style.cssText = [
            'width: 120px',
            'flex: 0 0 120px',
            'background: #ff2442',
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'padding: 8px 0 8px 8px', // 左边、上边、下边留出红色边框效果
            'box-sizing: border-box'
        ].join('; ');

        const media = document.createElement('div');
        media.className = 'xiaohongshu-share-media';
        media.style.cssText = [
            'width: 100%',
            'height: 100%',
            'min-height: 160px',
            'background: #f5f5f5',
            'border-radius: 8px', // 图片有圆角，配合外层的红色边距形成图一效果
            'overflow: hidden',
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'color: #999',
            'font-size: 12px'
        ].join('; ');

        if (isUsableImageUrl(mediaUrl)) {
            const img = document.createElement('img');
            img.src = mediaUrl;
            img.alt = '';
            img.referrerPolicy = 'no-referrer';
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            img.onerror = () => {
                media.textContent = mediaFallback;
            };
            media.textContent = '';
            media.appendChild(img);
        } else {
            media.textContent = mediaFallback;
        }
        mediaWrapper.appendChild(media);
        card.appendChild(mediaWrapper);

        const body = document.createElement('div');
        body.className = 'xiaohongshu-share-body';
        body.style.cssText = [
            'min-width: 0',
            'flex: 1',
            'padding: 12px',
            'display: flex',
            'flex-direction: column',
            'gap: 8px'
        ].join('; ');

        appendText(body, 'xiaohongshu-share-title', cardTitle).style.cssText = [
            'font-size: 15px',
            'font-weight: bold',
            'line-height: 1.4',
            'color: #000000',
            'display: -webkit-box',
            '-webkit-line-clamp: 2',
            '-webkit-box-orient: vertical',
            'overflow: hidden',
            'text-overflow: ellipsis'
        ].join('; ');

        const meta = document.createElement('div');
        meta.className = 'xiaohongshu-share-meta';
        meta.style.cssText = [
            'display: flex',
            'align-items: center',
            'gap: 8px',
            'font-size: 12px',
            'color: #666666',
            'flex-wrap: wrap'
        ].join('; ');
        
        const authorSpan = appendSpan(meta, '', isProfile
            ? (profile.nickname || data.authorName || '小红书')
            : isProduct
                ? (product.shopName || product.brandName || data.authorName || '小红书')
                : (data.authorName || '小红书'));
        authorSpan.style.color = '#333';
        
        appendSpan(meta, '', isProfile ? '主页' : (isProduct ? '商品' : (POST_TYPE_LABELS[data.postType] || data.postType || '图文')));
        
        if (!isProfile && !isProduct && data.publishedAtText) {
            appendSpan(meta, '', data.publishedAtText.slice(0, 10));
        }
        
        const statusSpan = document.createElement('div');
        statusSpan.style.cssText = [
            'font-size: 12px',
            'color: #666',
            'margin-top: -2px'
        ].join('; ');
        statusSpan.textContent = STATUS_LABELS[data.status] || data.status || '待解析';
        
        body.appendChild(meta);
        body.appendChild(statusSpan);

        const statsLine = isProfile
            ? this.formatProfileStatsLine(profile.stats)
            : isProduct
                ? [
                    product.price ? `价格 ${product.price}` : '',
                    product.originalPrice ? `原价 ${product.originalPrice}` : '',
                    product.salesText || ''
                ].filter(Boolean).join('，')
                : this.formatStatsLine(data.stats);
        if (statsLine) {
            appendText(body, 'xiaohongshu-share-stats', truncate(statsLine, 100)).style.cssText = [
                'font-size: 12px',
                'line-height: 1.4',
                'color: #666666',
                'word-break: break-word'
            ].join('; ');
        }

        const summaryLine = isProfile
            ? (data.profilePosts.length ? `最近笔记 ${data.profilePosts.length} 条` : '')
            : isProduct
                ? ((product.images && product.images.length) || data.images.length ? `商品图 ${(product.images && product.images.length) || data.images.length} 张` : '')
            : this.formatCardSummaryLine(data);
        if (summaryLine) {
            appendText(body, 'xiaohongshu-share-summary', truncate(summaryLine, 60)).style.cssText = [
                'font-size: 12px',
                'line-height: 1.4',
                'color: #666666',
                'word-break: break-word'
            ].join('; ');
        }

        const desc = isProfile
            ? (profile.description || data.description || (data.status === 'failed' ? data.error : '') || data.sourceText || data.url || '')
            : isProduct
                ? (product.description || data.description || (data.status === 'failed' ? data.error : '') || data.sourceText || data.url || '')
            : (data.description || (data.status === 'failed' ? data.error : '') || data.sourceText || data.url || '');
        if (desc) {
            appendText(body, 'xiaohongshu-share-desc', truncate(desc, 120)).style.cssText = [
                'font-size: 13px',
                'line-height: 1.5',
                'color: #333333',
                'display: -webkit-box',
                '-webkit-line-clamp: 4',
                '-webkit-box-orient: vertical',
                'overflow: hidden',
                'text-overflow: ellipsis',
                'margin-top: 2px'
            ].join('; ');
        }

        card.appendChild(body);
        contentDiv.appendChild(card);

        if (options.autoResolve !== false) {
            this.queueResolveForElement(messageDiv).catch((e: any) => {
                console.warn('[ChatXiaohongshuShare] resolve failed:', e);
            });
        }
    },

    async getBackendBaseUrl(): Promise<string> {
        try {
            if ((window as any).BackendSyncManager && typeof (window as any).BackendSyncManager.getBackendUrl === 'function') {
                const baseUrl = await (window as any).BackendSyncManager.getBackendUrl();
                return safeText(baseUrl).replace(/\/+$/, '');
            }
        } catch (e) {
            console.warn('[ChatXiaohongshuShare] getBackendUrl failed:', e);
        }
        // 默认返回本地开发服务器地址
        return window.location.origin || 'http://localhost:3000';
    },

    async fetchShareMeta(share: any, options: any = {}): Promise<any> {
        const data = this.normalizeShareData(share);
        const signal = options && options.signal;
        if (signal && signal.aborted) throw new Error('Xiaohongshu parse timeout');
        const baseUrl = await this.getBackendBaseUrl();
        if (signal && signal.aborted) throw new Error('Xiaohongshu parse timeout');
        if (!baseUrl) throw new Error('Xiaohongshu parser unavailable');
        const params = new URLSearchParams();
        params.set('url', data.url);
        if (data.sourceText) params.set('sourceText', data.sourceText);
        const endpoint = `${baseUrl}/meta/xiaohongshu?${params.toString()}`;
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            ...(signal ? { signal } : {})
        });
        const text = await response.text();
        let parsed;
        try {
            parsed = JSON.parse(text || '{}');
        } catch (e) {
            throw new Error('Xiaohongshu parser returned invalid JSON');
        }
        if (!response.ok && !parsed.status) {
            throw new Error(parsed.error || `Xiaohongshu parser failed: ${response.status}`);
        }
        return this.mergeShareData(data, parsed);
    },

    isCurrentFetchRequest(key: string, generation: number): boolean {
        const current = this._fetchRequests.get(key);
        return !!(current && current.generation === generation);
    },

    async fetchShareMetaWithTimeout(share: any): Promise<any> {
        const controller = new AbortController();
        const XHS_REQUEST_TIMEOUT_MS = 30000; // 30秒超时
        const timer = setTimeout(() => controller.abort(), XHS_REQUEST_TIMEOUT_MS);
        try {
            return await this.fetchShareMeta(share, { signal: controller.signal });
        } catch (e: any) {
            const message = controller.signal.aborted
                ? 'Xiaohongshu parse timeout'
                : e.message;
            return this.markShareFailed(share, message);
        } finally {
            clearTimeout(timer);
        }
    },

    queueResolveForElement(messageDiv: any): Promise<any> {
        const currentShare = this.getShareFromElement(messageDiv);
        if (!currentShare || currentShare.status !== 'pending' || !currentShare.url) {
            return Promise.resolve(currentShare);
        }

        const XHS_REQUEST_TIMEOUT_MS = 30000;
        const fullTimestamp = this.getElementTimestamp(messageDiv);
        const shareContactId = this.getElementContactId(messageDiv);
        const key = this.getShareKey(shareContactId, fullTimestamp, currentShare.url);
        const existing = this._fetchRequests.get(key);
        if (existing) return existing.promise;

        const controller = new AbortController();
        const generation = ++this._fetchGeneration;
        const request: any = {
            key,
            generation,
            controller,
            timer: setTimeout(() => controller.abort(), XHS_REQUEST_TIMEOUT_MS),
            promise: null
        };
        const promise = Promise.resolve()
            .then(() => this.resolveAndApplyShare(
                messageDiv,
                currentShare,
                shareContactId,
                fullTimestamp,
                request
            ))
            .finally(() => {
                clearTimeout(request.timer);
                if (this.isCurrentFetchRequest(key, generation)) {
                    this._fetchRequests.delete(key);
                }
            });
        request.promise = promise;
        this._fetchRequests.set(key, request);
        return promise;
    },

    async resolveAndApplyShare(messageDiv: any, baseShare: any, shareContactId: any, fullTimestamp: any, request: any): Promise<any> {
        let nextShare;
        try {
            nextShare = await this.fetchShareMeta(baseShare, { signal: request.controller.signal });
        } catch (e: any) {
            const message = request.controller.signal.aborted
                ? 'Xiaohongshu parse timeout'
                : e.message;
            nextShare = this.markShareFailed(baseShare, message);
        }
        clearTimeout(request.timer);
        if (!this.isCurrentFetchRequest(request.key, request.generation)) return nextShare;
        const liveShare = this.getShareFromElement(messageDiv);
        if (!liveShare || liveShare.url !== this.normalizeShareData(baseShare).url) return nextShare;
        await this.applyShareUpdate(messageDiv, nextShare, shareContactId, fullTimestamp);
        return nextShare;
    },

    async applyShareUpdate(messageDiv: any, share: any, shareContactId: any, fullTimestamp: any): Promise<void> {
        const data = this.normalizeShareData(share);
        if (messageDiv && messageDiv.dataset) {
            this.setElementContactId(messageDiv, shareContactId);
            messageDiv.dataset[DATASET_KEY] = this.stringifyShare(data);
            this.renderMessageElement(messageDiv, data, {
                shareContactId,
                autoResolve: false
            });
        }
        this.updatePendingMessages(data, shareContactId, fullTimestamp);
        await this.persistShareForElement(messageDiv, data, shareContactId, fullTimestamp);
    },

    async persistShareForElement(messageDiv: any, share: any, shareContactId: any, fullTimestamp: any): Promise<void> {
        const ts = parseTimestamp(fullTimestamp || (messageDiv && messageDiv.dataset && messageDiv.dataset.timestamp));
        if (!ts) return;

        const dataJson = this.stringifyShare(share);
        const content = this.buildPreviewText(share);
        const sessionId = safeText(messageDiv && messageDiv.dataset ? messageDiv.dataset.iflineSessionId : '');

        try {
            if (sessionId && typeof (window as any).IFLineDB !== 'undefined' && (window as any).IFLineDB.messages) {
                const row = await (window as any).IFLineDB.messages
                    .where('[sessionId+fullTimestamp]')
                    .equals([sessionId, ts])
                    .first();
                if (row) {
                    row.messageType = MESSAGE_TYPE;
                    row.content = content;
                    row.xiaohongshuShare = dataJson;
                    await (window as any).IFLineDB.messages.put(row);
                }
                return;
            }

            const contactId = safeText(shareContactId);
            if (!contactId || typeof (window as any).ChatDB === 'undefined' || !(window as any).ChatDB.messages) return;
            let row = await (window as any).ChatDB.messages
                .where('[contactId+fullTimestamp]')
                .equals([contactId, ts])
                .first();
            const numericContactId = parseInt(contactId, 10);
            if (!row && !isNaN(numericContactId)) {
                row = await (window as any).ChatDB.messages
                    .where('[contactId+fullTimestamp]')
                    .equals([numericContactId, ts])
                    .first();
            }
            if (row) {
                row.messageType = MESSAGE_TYPE;
                row.content = content;
                row.xiaohongshuShare = dataJson;
                await (window as any).ChatDB.messages.put(row);
            }
        } catch (e) {
            console.warn('[ChatXiaohongshuShare] persist failed:', e);
        }
    },

    updatePendingMessages(share: any, shareContactId: any, fullTimestamp: any): void {
        const manager = (window as any).ChatManager;
        if (!manager || !Array.isArray(manager.pendingMessages)) return;

        const data = this.normalizeShareData(share);
        const targetTs = parseTimestamp(fullTimestamp);
        const targetContactId = safeText(shareContactId);

        manager.pendingMessages = manager.pendingMessages.map((pending: any) => {
            if (!pending || pending.type !== MESSAGE_TYPE) return pending;
            const pendingTs = parseTimestamp(pending.fullTimestamp);
            const pendingContactId = safeText(pending.shareContactId);
            const sameIdentity = targetTs && pendingTs === targetTs
                && (!targetContactId || !pendingContactId || pendingContactId === targetContactId);
            const sameLegacyUrl = !pendingTs
                && pending.data
                && this.normalizeShareData(pending.data).url === data.url;
            if (!sameIdentity && !sameLegacyUrl) return pending;

            return this.buildPendingMessage(
                data,
                pending.meetingMode || manager.currentMeetingMode,
                pending.heartVoice,
                {
                    shareContactId: targetContactId || pendingContactId,
                    fullTimestamp: targetTs || pendingTs
                }
            );
        });
    },

    findElementForPending(pending: any): any {
        const fullTimestamp = parseTimestamp(pending && pending.fullTimestamp);
        if (!fullTimestamp) return null;
        const shareContactId = safeText(pending && pending.shareContactId);
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return null;
        const candidates = Array.from(chatMessages.querySelectorAll(`.chat-message[data-type="${MESSAGE_TYPE}"]`));
        return candidates.find((element: any) => {
            if (this.getElementTimestamp(element) !== fullTimestamp) return false;
            const elementContactId = this.getElementContactId(element);
            return !shareContactId || !elementContactId || elementContactId === shareContactId;
        }) || null;
    },

    async waitForPendingShares(manager: any): Promise<void> {
        if (!manager || manager.isGettingAiReply || !Array.isArray(manager.pendingMessages)) return;

        const pendingShares = manager.pendingMessages.filter((pending: any) => {
            if (!pending || pending.type !== MESSAGE_TYPE) return false;
            const data = this.normalizeShareData(pending.data || {});
            return data.status === 'pending' && !!data.url;
        });
        if (pendingShares.length === 0) return;

        await Promise.all(pendingShares.map((pending: any) => this.waitForPendingShare(pending, manager)));
    },

    async waitForPendingShare(pending: any, manager: any): Promise<void> {
        const data = this.normalizeShareData(pending.data || {});
        const shareContactId = safeText(pending.shareContactId);
        const fullTimestamp = parseTimestamp(pending.fullTimestamp);
        const element = this.findElementForPending(pending);

        try {
            if (element) {
                await this.queueResolveForElement(element);
                return;
            }
            const nextShare = await this.fetchShareMetaWithTimeout(data);
            this.updatePendingMessages(nextShare, shareContactId, fullTimestamp);
        } catch (e: any) {
            const failedShare = this.markShareFailed(data, e.message);
            if (element) {
                await this.applyShareUpdate(element, failedShare, shareContactId, fullTimestamp);
            } else {
                this.updatePendingMessages(failedShare, shareContactId, fullTimestamp);
            }
        }
    },

    patchSendMessage() {
        if (!(window as any).ChatManager || (window as any).ChatManager._xiaohongshuShareSendPatched) return;
        const originalSendMessage = (window as any).ChatManager.sendMessage;
        if (typeof originalSendMessage !== 'function') return;

        const self = this;
        (window as any).ChatManager.sendMessage = async function (...args: any[]) {
            const shareContactIdRaw = this.currentContactId;
            const shareContactId = safeText(shareContactIdRaw);
            const meetingMode = this.currentMeetingMode || 'online';

            if (shareContactId && typeof (window as any).AppDB !== 'undefined' && (window as any).AppDB.contacts) {
                const numericContactId = parseInt(shareContactId, 10);
                let contact = !isNaN(numericContactId) ? await (window as any).AppDB.contacts.get(numericContactId) : null;
                if (!contact) contact = await (window as any).AppDB.contacts.get(shareContactId);
                if (contact && contact.personaDeleted) return;
            }

            if (this.isNarratorInputMode && meetingMode === 'offline') {
                return originalSendMessage.apply(this, args);
            }
            if ((window as any).NpcManager && (window as any).NpcManager.isNpcInputMode && (window as any).NpcManager.currentSpeaker
                && meetingMode === 'offline') {
                return originalSendMessage.apply(this, args);
            }

            const chatInput = document.getElementById('chat-input') as HTMLInputElement;
            const message = chatInput ? chatInput.value.trim() : '';
            if (!message) return originalSendMessage.apply(this, args);

            const url = self.extractXiaohongshuUrl(message);
            if (!url) return originalSendMessage.apply(this, args);

            if (chatInput) chatInput.value = '';

            const share = self.buildInitialShare(url, message);
            const extraData: any = { xiaohongshuShare: share, xiaohongshuContactId: shareContactId };
            if (this.quotedMessage) {
                extraData.quoted = this.quotedMessage.text;
            }

            const heartVoice = typeof this.consumeHeartVoice === 'function'
                ? this.consumeHeartVoice()
                : '';
            if (heartVoice) extraData.heartVoice = heartVoice;

            const messageDiv = await this.addMessage('user', share.url, MESSAGE_TYPE, extraData, null, null, shareContactIdRaw);
            const fullTimestamp = self.getElementTimestamp(messageDiv);
            self.setElementContactId(messageDiv, shareContactId);
            if (Array.isArray(this.pendingMessages)) {
                this.pendingMessages.push(
                    self.buildPendingMessage(share, meetingMode, heartVoice, {
                        shareContactId,
                        fullTimestamp
                    })
                );
            }
            if (typeof this._interruptGroupChainIfActive === 'function') {
                this._interruptGroupChainIfActive();
            }
            if (typeof this.cancelQuote === 'function') {
                this.cancelQuote();
            }
            if (typeof this.delayProactiveTimer === 'function') {
                this.delayProactiveTimer(shareContactIdRaw);
            }
            return messageDiv;
        };
        (window as any).ChatManager._xiaohongshuShareSendPatched = true;
    },

    patchAddMessage() {
        if (!(window as any).ChatManager || (window as any).ChatManager._xiaohongshuShareAddMessagePatched) return;
        const originalAddMessage = (window as any).ChatManager.addMessage;
        if (typeof originalAddMessage !== 'function') return;

        const self = this;
        (window as any).ChatManager.addMessage = async function (type: string, content: string, messageType: string = 'text', extraData: any = null, ...rest: any[]) {
            if (messageType !== MESSAGE_TYPE) {
                return originalAddMessage.call(this, type, content, messageType, extraData, ...rest);
            }

            const baseShare = extraData && extraData.xiaohongshuShare
                ? extraData.xiaohongshuShare
                : { url: content };
            const share = self.normalizeShareData(baseShare);
            const targetContactId = rest[2] != null ? rest[2] : this.currentContactId;
            const shareContactId = safeText((extraData && extraData.xiaohongshuContactId) || targetContactId);
            const patchedExtra = { ...(extraData || {}), xiaohongshuShare: share, xiaohongshuContactId: shareContactId };
            self.pushSavingShare(share);
            try {
                const messageDiv = await originalAddMessage.call(this, type, share.url || content, messageType, patchedExtra, ...rest);
                self.setElementContactId(messageDiv, shareContactId);
                self.renderMessageElement(messageDiv, share, { shareContactId });
                return messageDiv;
            } finally {
                self.popSavingShare();
            }
        };
        (window as any).ChatManager._xiaohongshuShareAddMessagePatched = true;
    },

    patchChatDBHelper() {
        if (typeof (window as any).ChatDBHelper === 'undefined') return;
        this.patchExtractMessageData();
        this.patchCreateMessageElement();
        this.patchFormatRowForPrompt();
    },

    patchExtractMessageData() {
        if (typeof (window as any).ChatDBHelper === 'undefined' || (window as any).ChatDBHelper._xiaohongshuShareExtractPatched) return;
        const originalExtractMessageData = (window as any).ChatDBHelper.extractMessageData;
        if (typeof originalExtractMessageData !== 'function') return;

        const self = this;
        (window as any).ChatDBHelper.extractMessageData = function (contactId: any, element: any) {
            const data = originalExtractMessageData.call(this, contactId, element);
            if (!element || !element.dataset || element.dataset.type !== MESSAGE_TYPE) return data;

            const share = self.getShareFromElement(element)
                || self.peekSavingShare()
                || self.buildInitialShare(data.content || '');

            data.messageType = MESSAGE_TYPE;
            data.content = self.buildPreviewText(share);
            data.xiaohongshuShare = self.stringifyShare(share);
            data.image = '';
            data.video = '';
            return data;
        };
        (window as any).ChatDBHelper._xiaohongshuShareExtractPatched = true;
    },

    patchCreateMessageElement() {
        if (typeof (window as any).ChatDBHelper === 'undefined' || (window as any).ChatDBHelper._xiaohongshuShareCreateElementPatched) return;
        const originalCreateMessageElement = (window as any).ChatDBHelper.createMessageElement;
        if (typeof originalCreateMessageElement !== 'function') return;

        const self = this;
        (window as any).ChatDBHelper.createMessageElement = function (msgData: any, ctx: any) {
            const result = originalCreateMessageElement.call(this, msgData, ctx);
            if (!msgData || msgData.messageType !== MESSAGE_TYPE) return result;

            const render = (element: any) => {
                const parsed = self.parseShareJson(msgData.xiaohongshuShare || '');
                const share = parsed || { url: msgData.content || '' };
                const shareContactId = safeText(msgData.contactId);
                self.setElementContactId(element, shareContactId);
                self.renderMessageElement(element, share, { shareContactId });
                return element;
            };

            if (result && typeof result.then === 'function') {
                return result.then(render);
            }
            return render(result);
        };
        (window as any).ChatDBHelper._xiaohongshuShareCreateElementPatched = true;
    },

    patchFormatRowForPrompt() {
        if (typeof (window as any).ChatDBHelper === 'undefined' || (window as any).ChatDBHelper._xiaohongshuShareFormatPatched) return;
        const originalFormatRowForPrompt = (window as any).ChatDBHelper.formatRowForPrompt;
        if (typeof originalFormatRowForPrompt !== 'function') return;

        const self = this;
        (window as any).ChatDBHelper.formatRowForPrompt = function (row: any, ctx: any) {
            if (!row || row.messageType !== MESSAGE_TYPE || row.isRecalled) {
                return originalFormatRowForPrompt.call(this, row, ctx);
            }

            const parsed = self.parseShareJson(row.xiaohongshuShare || '');
            const share = parsed || { url: row.content || '' };
            let messageText = self.buildFactualText(share);

            if (row.quotedText) {
                messageText = `[引用: ${row.quotedText}]\n${messageText}`;
            }
            if (row.heartVoiceContent) {
                messageText += `\n[USER_HEART_VOICE]${row.heartVoiceContent}[/USER_HEART_VOICE]`;
            }

            const role = row.type === 'received' ? 'assistant' : 'user';
            const isAiContext = ctx && (ctx.mode === 'ai_reply' || ctx.mode === 'proactive');
            const content = role === 'user' && isAiContext
                ? self.buildPromptContent(share, messageText)
                : messageText;

            return {
                promptMessage: {
                    role,
                    content,
                    fullTimestamp: row.fullTimestamp || null
                },
                ...(row.type === 'received' ? { updateLastActiveAiTs: row.fullTimestamp || 0 } : {})
            };
        };
        (window as any).ChatDBHelper._xiaohongshuShareFormatPatched = true;
    },

    patchRecoverPendingMessagesFromDOM() {
        if (!(window as any).ChatManager || (window as any).ChatManager._xiaohongshuShareRecoverPatched) return;
        const originalRecover = (window as any).ChatManager.recoverPendingMessagesFromDOM;
        if (typeof originalRecover !== 'function') return;

        const self = this;
        (window as any).ChatManager.recoverPendingMessagesFromDOM = function (...args: any[]) {
            const result = originalRecover.apply(this, args);
            self.rewriteRecoveredPendingMessages(this);
            return result;
        };
        (window as any).ChatManager._xiaohongshuShareRecoverPatched = true;
    },

    patchGetAiReply() {
        if (!(window as any).ChatManager || (window as any).ChatManager._xiaohongshuShareGetAiReplyPatched) return;
        const originalGetAiReply = (window as any).ChatManager.getAiReply;
        if (typeof originalGetAiReply !== 'function') return;

        const self = this;
        (window as any).ChatManager.getAiReply = async function (...args: any[]) {
            try {
                if (Array.isArray(this.pendingMessages)
                    && this.pendingMessages.length === 0
                    && typeof this.recoverPendingMessagesFromDOM === 'function') {
                    this.recoverPendingMessagesFromDOM();
                }
                await self.waitForPendingShares(this);
            } catch (e) {
                console.warn('[ChatXiaohongshuShare] wait before AI reply failed:', e);
            }
            return originalGetAiReply.apply(this, args);
        };
        (window as any).ChatManager._xiaohongshuShareGetAiReplyPatched = true;
    },

    collectRecoverableUserMessages(): any[] {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return [];

        const allMsgs = Array.from(chatMessages.querySelectorAll('.chat-message:not(.chat-date):not(#loading-message)'));
        let lastAiTimestamp = 0;
        for (let i = allMsgs.length - 1; i >= 0; i--) {
            const msg = allMsgs[i] as any;
            if (msg.classList.contains('ai')
                || msg.classList.contains('narrator-message')
                || msg.classList.contains('mcp-result-message')
                || msg.dataset.type === 'mcp_result') {
                lastAiTimestamp = parseTimestamp(msg.dataset.timestamp);
                break;
            }
        }

        return allMsgs.filter((msg: any) => {
            const timestamp = parseTimestamp(msg.dataset.timestamp);
            const type = msg.dataset.type || 'text';
            return msg.classList.contains('user')
                && timestamp > lastAiTimestamp
                && type !== 'trace_couple_invite'
                && type !== 'trace_couple_response';
        });
    },

    rewriteRecoveredPendingMessages(manager: any): void {
        if (!manager || !Array.isArray(manager.pendingMessages)) return;
        const userMessages = this.collectRecoverableUserMessages();
        manager.pendingMessages = manager.pendingMessages.map((pending: any, index: number) => {
            const element = userMessages[index];
            if (!element || element.dataset.type !== MESSAGE_TYPE) return pending;

            const share = this.getShareFromElement(element) || this.buildInitialShare(pending.content || '');
            const shareContactId = this.getElementContactId(element) || safeText(manager.currentContactId);
            const fullTimestamp = this.getElementTimestamp(element);
            this.setElementContactId(element, shareContactId);
            return this.buildPendingMessage(
                share,
                pending.meetingMode || manager.currentMeetingMode,
                element.dataset.heartVoice || pending.heartVoice,
                { shareContactId, fullTimestamp }
            );
        });
    }
};

// 导出到全局
(window as any).ChatXiaohongshuShare = ChatXiaohongshuShare;

// 自动初始化
if ((window as any).ChatManager && typeof (window as any).ChatDBHelper !== 'undefined') {
    ChatXiaohongshuShare.init();
} else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ChatXiaohongshuShare.init(), { once: true });
} else {
    ChatXiaohongshuShare.init();
}
