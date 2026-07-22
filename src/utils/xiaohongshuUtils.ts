// 小红书分享功能 - 核心常量和工具函数

export const MESSAGE_TYPE = 'xiaohongshu_share';
export const DATASET_KEY = 'xiaohongshuShare';
export const CONTACT_DATASET_KEY = 'xiaohongshuContactId';
export const CARD_CLASS = 'xiaohongshu-share-card';
export const XHS_REQUEST_TIMEOUT_MS = 30000;
export const XHS_FACTUAL_TEXT_MAX_CHARS = 16000;
export const XHS_TRANSCRIPT_MAX_CHARS = 5000;
export const XHS_PROMPT_MAX_VISUALS = 18;
export const XHS_COMMENTS_MAX = 12;
export const XHS_SUB_COMMENTS_MAX = 3;
export const XHS_COMMENT_IMAGES_MAX = 3;
export const PROFILE_POSTS_MAX = 6;
export const PRODUCT_IMAGES_MAX = 6;

export const STATUS_LABELS = {
    pending: '待解析',
    ready: '已解析',
    failed: '解析失败'
} as const;

export const POST_TYPE_LABELS = {
    video: '视频',
    image: '图文',
    unknown: '未知'
} as const;

export type ShareStatus = keyof typeof STATUS_LABELS;
export type PostType = keyof typeof POST_TYPE_LABELS;

// 类型定义
export interface PromptBlock {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

export interface XiaohongshuShareData {
    url: string;
    shareId: string;
    status: ShareStatus;
    postType?: PostType;
    title?: string;
    desc?: string;
    author?: string;
    imageList?: string[];
    videoUrl?: string;
    comments?: any[];
    timestamp?: number;
}

// 工具函数

export function isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function safeText(value: any): string {
    return String(value == null ? '' : value).trim();
}

export function normalizeWhitespace(value: any): string {
    return safeText(value).replace(/\s+/g, ' ');
}

export function truncate(value: any, maxLength?: number): string {
    const text = safeText(value);
    if (!maxLength || text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)) + '...';
}

export function truncateAtLine(value: any, maxLength?: number): string {
    const text = safeText(value);
    if (!maxLength || text.length <= maxLength) return text;
    const suffix = '\n...（内容已按上下文上限截断）';
    const contentLimit = Math.max(0, maxLength - suffix.length);
    const slice = text.slice(0, contentLimit);
    const lineBreak = slice.lastIndexOf('\n');
    const safe = lineBreak >= Math.floor(contentLimit * 0.7) ? slice.slice(0, lineBreak) : slice;
    return `${safe.trim()}${suffix}`;
}

export function isUsableImageUrl(value: any): boolean {
    const url = safeText(value);
    return /^(https?:\/\/|data:image\/|blob:)/i.test(url);
}

export function isPromptImageUrl(value: any): boolean {
    const url = safeText(value);
    return /^(https?:\/\/|data:image\/)/i.test(url);
}

export function pushUniquePromptImage(
    blocks: PromptBlock[],
    seen: Set<string>,
    url: any
): void {
    const imageUrl = safeText(url);
    if (!isPromptImageUrl(imageUrl)) return;
    if (seen.has(imageUrl)) return;
    if (seen.size >= XHS_PROMPT_MAX_VISUALS) return;
    seen.add(imageUrl);
    blocks.push({ type: 'image_url', image_url: { url: imageUrl } });
}

export function pushPromptVisual(
    blocks: PromptBlock[],
    seen: Set<string>,
    label: any,
    url: any
): boolean {
    const beforeCount = seen.size;
    pushUniquePromptImage(blocks, seen, url);
    if (seen.size === beforeCount) return false;

    const imageBlock = blocks.pop()!;
    blocks.push({ type: 'text', text: safeText(label) });
    blocks.push(imageBlock);
    return true;
}

export function appendPromptVisualHint(blocks: PromptBlock[], hint: string): void {
    if (blocks.length <= 1 || !blocks[0] || blocks[0].type !== 'text') return;
    blocks[0].text += `\n\n${hint}`;
}

export function isAiReplyPromptContext(ctx: any): boolean {
    return !!(ctx && (
        Object.prototype.hasOwnProperty.call(ctx, 'seeEmojiAsImage')
        || Object.prototype.hasOwnProperty.call(ctx, 'expandCallTs')
    ));
}

export function cleanUrlCandidate(value: any): string {
    let url = safeText(value);
    url = url.replace(/^[<"'""'']+/, '');
    while (/[),.;!?，。；！？、\]\}>）】'"""'']+$/.test(url)) {
        url = url.slice(0, -1);
    }
    return url;
}

export function isXiaohongshuHost(hostname: string): boolean {
    const host = safeText(hostname).toLowerCase();
    return host === 'xiaohongshu.com'
        || host.endsWith('.xiaohongshu.com')
        || host === 'xhslink.com'
        || host.endsWith('.xhslink.com');
}

export function isXiaohongshuShortHost(hostname: string): boolean {
    const host = safeText(hostname).toLowerCase();
    return host === 'xhslink.com' || host.endsWith('.xhslink.com');
}

export function normalizeXiaohongshuUrl(value: any): string {
    const cleaned = cleanUrlCandidate(value);
    if (!cleaned) return '';
    const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
    try {
        const parsed = new URL(withProtocol);
        if (!isXiaohongshuHost(parsed.hostname)) return '';
        if (!isXiaohongshuShortHost(parsed.hostname)) parsed.protocol = 'https:';
        parsed.hash = '';
        return parsed.toString();
    } catch (e) {
        return '';
    }
}

export function extractShareId(url: string): string {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').map(p => p.trim()).filter(Boolean);
        const itemIndex = parts.indexOf('item');
        const exploreIndex = parts.indexOf('explore');
        if (itemIndex >= 0 && parts[itemIndex + 1]) return parts[itemIndex + 1];
        if (exploreIndex >= 0 && parts[exploreIndex + 1]) return parts[exploreIndex + 1];
        return safeText(
            parsed.searchParams.get('noteId')
            || parsed.searchParams.get('note_id')
            || parsed.searchParams.get('source_note_id')
            || parts[parts.length - 1]
            || ''
        );
    } catch (e) {
        return '';
    }
}

// 个人主页和商品分享相关函数

export function isLikelyProfileNoteId(value: any): boolean {
    return /^[0-9a-f]{24}$/i.test(safeText(value));
}

export function isProfilePostUrl(url: any): boolean {
    try {
        const parsed = new URL(safeText(url));
        if (!isXiaohongshuHost(parsed.hostname)) return false;
        const parts = parsed.pathname.split('/').map(p => p.trim()).filter(Boolean);
        const itemIndex = parts.indexOf('item');
        const exploreIndex = parts.indexOf('explore');
        if (itemIndex >= 0 && isLikelyProfileNoteId(parts[itemIndex + 1])) return true;
        if (exploreIndex >= 0 && isLikelyProfileNoteId(parts[exploreIndex + 1])) return true;
        return isLikelyProfileNoteId(parsed.searchParams.get('noteId'))
            || isLikelyProfileNoteId(parsed.searchParams.get('note_id'));
    } catch (e) {
        return false;
    }
}

export function isProfilePageUrl(url: any): boolean {
    try {
        const parsed = new URL(safeText(url));
        if (!isXiaohongshuHost(parsed.hostname)) return false;
        const parts = parsed.pathname.split('/').map(p => p.trim()).filter(Boolean);
        const userIndex = parts.indexOf('user');
        if (userIndex >= 0 && parts[userIndex + 1] === 'profile') return true;
        return parts[0] === 'profile' && !!parts[1];
    } catch (e) {
        return false;
    }
}

export function isLikelyProfileImageUrl(value: any): boolean {
    const url = safeText(value);
    if (!url) return false;
    if (/^(data:image\/|blob:)/i.test(url)) return true;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        return host === 'xhscdn.com'
            || host.endsWith('.xhscdn.com')
            || host === 'xhscdn.net'
            || host.endsWith('.xhscdn.net')
            || parsed.pathname === '/meta/xiaohongshu/image'
            || /\.(?:jpe?g|png|webp|gif|avif)(?:$|[?#])/i.test(parsed.pathname);
    } catch (e) {
        return false;
    }
}

export function normalizeCommentImageUrl(value: any): string {
    const url = safeText(value);
    if (!url) return '';
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const isCdn = host === 'xhscdn.com'
            || host.endsWith('.xhscdn.com')
            || host === 'xhscdn.net'
            || host.endsWith('.xhscdn.net');
        const isProxy = parsed.pathname === '/meta/xiaohongshu/image';
        return /https?:/i.test(parsed.protocol) && (isCdn || isProxy) ? parsed.toString() : '';
    } catch (e) {
        return '';
    }
}

export interface ProfileStats {
    followingCount: string;
    followerCount: string;
    likedAndCollectedCount: string;
    noteCount: string;
}

export function extractProfileStatsFromSourceText(text: any): ProfileStats {
    const source = normalizeWhitespace(text);
    const likedMatch = source.match(/\u6536\u83b7\u4e86\s*([0-9]+(?:\.[0-9]+)?\s*(?:[KkWw\u4e07\u5343+]+)?)\s*\u6b21?\u8d5e(?:\u4e0e|\u548c)?\u6536\u85cf/);
    return {
        followingCount: '',
        followerCount: '',
        likedAndCollectedCount: likedMatch ? safeText(likedMatch[1]).replace(/\s+/g, '') : '',
        noteCount: ''
    };
}

export function cleanProductShareTitle(rawValue: any): string {
    let raw = normalizeWhitespace(rawValue);
    if (!raw) return '';
    const codeTail = raw.match(/(?:[\uD800-\uDFFF\u2600-\u27BF]\s*)+([A-Za-z0-9]{8,})(?:\s*[\uD800-\uDFFF\u2600-\u27BF])+\s*$/);
    if (codeTail) raw = raw.slice(0, codeTail.index);
    return truncate(normalizeWhitespace(raw.replace(/[\uD800-\uDFFF\uFE0F\u200D]/g, ' ')), 160);
}

export function extractProductTitleFromSourceText(text: any): string {
    const source = normalizeWhitespace(text);
    const marker = '\u3010\u5c0f\u7ea2\u4e66\u3011';
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) return '';
    const afterMarker = source.slice(markerIndex + marker.length);
    const beforeLink = afterMarker.split(/https?:\/\//i)[0] || afterMarker;
    return cleanProductShareTitle(beforeLink);
}

export function isProductShareSourceText(text: any): boolean {
    const source = normalizeWhitespace(text);
    return !!(
        extractProductTitleFromSourceText(source)
        && /\u3010\u5c0f\u7ea2\u4e66\u3011/.test(source)
        && /https?:\/\/(?:[^\s]+\.)?xhslink\.com\//i.test(source)
        && /(?:\u6253\u5f00|\u6253\u958b)\u3010\u5c0f\u7ea2\u4e66app\u3011\u67e5\u770b\s*[A-Za-z0-9]{4,}/i.test(source)
    );
}

export function isProfileShareSourceText(text: any): boolean {
    const source = normalizeWhitespace(text);
    return /(\u6765\u770b\u770b\u6211\u7684\u4e3b\u9875|\u4e3b\u9875\s*>>|\u5c0f\u7ea2\u4e66\u4e3b\u9875|\u4e2a\u4eba\u4e3b\u9875|\u500b\u4eba\u4e3b\u9801)/i.test(source)
        || /\u6536\u83b7\u4e86[^\n]{0,40}\u8d5e(?:\u4e0e|\u548c)?\u6536\u85cf[^\n]{0,40}\u4e3b\u9875/i.test(source);
}

// 解析和格式化函数

export function parseTimestamp(value: any): number {
    const ts = parseInt(value, 10);
    return Number.isFinite(ts) ? ts : 0;
}

export function parseCountNumber(value: any): number {
    const text = safeText(value).replace(/,/g, '');
    if (!text) return 0;
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (!match) return 0;
    let number = Number(match[1]);
    if (!Number.isFinite(number)) return 0;
    if (/[万Ww]/.test(text)) number *= 10000;
    else if (/[千Kk]/.test(text)) number *= 1000;
    return Math.max(0, Math.round(number));
}

export function parseBooleanFlag(value: any): boolean {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0' || value == null || value === '') return false;
    return safeText(value).toLowerCase() === 'true';
}

// 数据结构标准化

export interface PostStats {
    likedCount: string;
    collectedCount: string;
    commentCount: string;
    shareCount: string;
}

export function normalizeStats(value: any): PostStats {
    const stats = isObject(value) ? value : {};
    return {
        likedCount: safeText(stats.likedCount || stats.likes || stats.likeCount),
        collectedCount: safeText(stats.collectedCount || stats.collects || stats.collectCount),
        commentCount: safeText(stats.commentCount || stats.comments),
        shareCount: safeText(stats.shareCount || stats.shares)
    };
}

export function hasStats(stats: any): boolean {
    return !!(stats && (stats.likedCount || stats.collectedCount || stats.commentCount || stats.shareCount));
}

export function normalizeProfileStats(value: any): ProfileStats {
    const stats = isObject(value) ? value : {};
    return {
        followingCount: safeText(stats.followingCount || stats.following || stats.follows || stats.followCount || stats.followsCount || stats.followingNum),
        followerCount: safeText(stats.followerCount || stats.followers || stats.followersCount || stats.followerNum || stats.fans || stats.fansCount),
        likedAndCollectedCount: safeText(stats.likedAndCollectedCount || stats.likedAndCollectCount || stats.likesAndCollects || stats.likeCollectCount || stats.likedCollectCount || stats.interactionCount || stats.likedCount),
        noteCount: safeText(stats.noteCount || stats.notes || stats.notesCount || stats.postCount || stats.posts || stats.discoveryCount)
    };
}

export function hasProfileStats(stats: any): boolean {
    return !!(stats && (stats.followingCount || stats.followerCount || stats.likedAndCollectedCount || stats.noteCount));
}

export function mergeProfileStats(primary: any, fallback: any): ProfileStats {
    const first = normalizeProfileStats(primary);
    const second = normalizeProfileStats(fallback);
    return {
        followingCount: first.followingCount || second.followingCount,
        followerCount: first.followerCount || second.followerCount,
        likedAndCollectedCount: first.likedAndCollectedCount || second.likedAndCollectedCount,
        noteCount: first.noteCount || second.noteCount
    };
}

export interface ProfileData {
    userId: string;
    redId: string;
    nickname: string;
    description: string;
    avatarUrl: string;
    ipLocation: string;
    verifiedInfo: string;
    stats: ProfileStats;
}

export function normalizeProfile(value: any): ProfileData {
    const profile = isObject(value) ? value : {};
    const explicitStats = normalizeProfileStats(profile.stats);
    const stats = hasProfileStats(explicitStats) ? explicitStats : normalizeProfileStats(profile);
    return {
        userId: safeText(profile.userId || profile.user_id || profile.id),
        redId: safeText(profile.redId || profile.red_id || profile.redBookId || profile.xhsId),
        nickname: safeText(profile.nickname || profile.nickName || profile.name || profile.userName),
        description: safeText(profile.description || profile.desc || profile.bio || profile.introduction),
        avatarUrl: safeText(profile.avatarUrl || profile.avatar || profile.image || profile.imageUrl),
        ipLocation: safeText(profile.ipLocation || profile.ip_location || profile.location),
        verifiedInfo: safeText(profile.verifiedInfo || profile.verifyInfo || profile.certification || profile.verified),
        stats
    };
}

export function hasProfileData(profile: any): boolean {
    return !!(profile && (
        profile.userId
        || profile.redId
        || profile.nickname
        || profile.description
        || profile.avatarUrl
        || profile.ipLocation
        || profile.verifiedInfo
        || hasProfileStats(profile.stats)
    ));
}

export function mergeProfileData(baseProfile: any, incomingProfile: any): ProfileData {
    const base = normalizeProfile(baseProfile);
    const incoming = normalizeProfile(incomingProfile);
    return {
        userId: incoming.userId || base.userId,
        redId: incoming.redId || base.redId,
        nickname: incoming.nickname || base.nickname,
        description: incoming.description || base.description,
        avatarUrl: incoming.avatarUrl || base.avatarUrl,
        ipLocation: incoming.ipLocation || base.ipLocation,
        verifiedInfo: incoming.verifiedInfo || base.verifiedInfo,
        stats: mergeProfileStats(incoming.stats, base.stats)
    };
}

// 商品数据标准化

export function normalizeProductPrice(value: any): string {
    if (value == null) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    if (typeof value === 'string') return safeText(value);
    if (Array.isArray(value)) {
        for (const item of value) {
            const price = normalizeProductPrice(item);
            if (price) return price;
        }
        return '';
    }
    if (!isObject(value)) return '';
    return normalizeProductPrice(value.displayText || value.display_text || value.text || value.priceText || value.price_text || value.price || value.amount || value.value);
}

export function normalizeProductImages(value: any): string[] {
    const source = Array.isArray(value) ? value : (value ? [value] : []);
    const output: string[] = [];
    source.forEach((item) => {
        const rawUrl = typeof item === 'string'
            ? item
            : safeText(item && (item.url || item.src || item.imageUrl || item.image_url || item.coverUrl || item.cover_url));
        if (!isLikelyProfileImageUrl(rawUrl)) return;
        if (!output.includes(rawUrl) && output.length < PRODUCT_IMAGES_MAX) output.push(rawUrl);
    });
    return output;
}

export interface ProductData {
    productId: string;
    title: string;
    description: string;
    price: string;
    originalPrice: string;
    shopName: string;
    brandName: string;
    salesText: string;
    coverUrl: string;
    images: string[];
}

export function normalizeProduct(value: any): ProductData {
    const product = isObject(value) ? value : {};
    const images = normalizeProductImages(product.images || product.imageList || product.image_list || product.imageUrls || product.image_urls || product.pictures);
    const rawCoverUrl = safeText(product.coverUrl || product.cover_url || product.cover || product.mainImage || product.main_image || product.imageUrl || product.image_url || product.image || images[0]);
    return {
        productId: safeText(product.productId || product.product_id || product.goodsId || product.goods_id || product.commodityId || product.commodity_id || product.skuId || product.sku_id || product.spuId || product.spu_id || product.id),
        title: safeText(product.title || product.name || product.productName || product.product_name || product.goodsName || product.goods_name || product.commodityName || product.commodity_name || product.skuName || product.sku_name),
        description: safeText(product.description || product.desc || product.subtitle || product.subTitle || product.sub_title || product.summary || product.slogan),
        price: normalizeProductPrice(product.price || product.displayPrice || product.display_price || product.currentPrice || product.current_price || product.salePrice || product.sale_price || product.priceInfo || product.price_info),
        originalPrice: normalizeProductPrice(product.originalPrice || product.original_price || product.marketPrice || product.market_price || product.originPrice || product.origin_price || product.listPrice || product.list_price),
        shopName: safeText(product.shopName || product.shop_name || product.storeName || product.store_name || product.sellerName || product.seller_name || product.merchantName || product.merchant_name),
        brandName: safeText(product.brandName || product.brand_name || product.brand),
        salesText: safeText(product.salesText || product.sales_text || product.soldText || product.sold_text || product.saleText || product.sale_text || product.sales || product.salesVolume || product.sales_volume || product.soldCount || product.sold_count),
        coverUrl: isLikelyProfileImageUrl(rawCoverUrl) ? rawCoverUrl : '',
        images
    };
}

export function hasProductData(product: any): boolean {
    return !!(product && (
        product.productId
        || product.title
        || product.description
        || product.price
        || product.originalPrice
        || product.shopName
        || product.brandName
        || product.salesText
        || product.coverUrl
        || (Array.isArray(product.images) && product.images.length)
    ));
}

export function mergeProductData(baseProduct: any, incomingProduct: any): ProductData {
    const base = normalizeProduct(baseProduct);
    const incoming = normalizeProduct(incomingProduct);
    const images: string[] = [];
    [...incoming.images, ...base.images].forEach((url) => {
        if (url && !images.includes(url) && images.length < PRODUCT_IMAGES_MAX) images.push(url);
    });
    return {
        productId: incoming.productId || base.productId,
        title: incoming.title || base.title,
        description: incoming.description || base.description,
        price: incoming.price || base.price,
        originalPrice: incoming.originalPrice || base.originalPrice,
        shopName: incoming.shopName || base.shopName,
        brandName: incoming.brandName || base.brandName,
        salesText: incoming.salesText || base.salesText,
        coverUrl: incoming.coverUrl || base.coverUrl || images[0] || '',
        images
    };
}

// 个人主页帖子标准化

export function hasProfilePostEvidence(item: any): boolean {
    if (!item) return false;
    const hasText = !!(item.title || item.description);
    const hasMedia = !!item.coverUrl;
    const hasStats = !!(item.likedCount || item.collectedCount || item.commentCount);
    return isProfilePostUrl(item.url)
        || (hasText && (hasMedia || hasStats))
        || (hasMedia && hasStats);
}

export function normalizeProfilePostCount(...values: any[]): string {
    for (const value of values) {
        if (typeof value === 'number') {
            if (Number.isFinite(value)) return safeText(value);
            continue;
        }
        if (typeof value === 'string' && value.trim()) return safeText(value);
    }
    return '';
}

export interface ProfilePost {
    title: string;
    description: string;
    coverUrl: string;
    url: string;
    likedCount: string;
    collectedCount: string;
    commentCount: string;
    postType: string;
}

export function normalizeProfilePost(value: any): ProfilePost | null {
    if (!isObject(value)) return null;
    const rawPostType = safeText(value.postType || value.type).toLowerCase();
    const postType = ['video', 'image', 'unknown'].includes(rawPostType) ? rawPostType : 'unknown';
    const rawCoverUrl = safeText(value.coverUrl || value.cover || value.imageUrl || value.image);
    const rawUrl = normalizeXiaohongshuUrl(value.url || value.link || value.href) || safeText(value.url || value.link || value.href);
    if (rawUrl && isProfilePageUrl(rawUrl)) return null;
    const item: ProfilePost = {
        title: safeText(value.title),
        description: safeText(value.description || value.desc),
        coverUrl: isLikelyProfileImageUrl(rawCoverUrl) ? rawCoverUrl : '',
        url: isProfilePostUrl(rawUrl) ? rawUrl : '',
        likedCount: normalizeProfilePostCount(value.likedCount, value.likeCount, value.likes),
        collectedCount: normalizeProfilePostCount(value.collectedCount, value.collectCount, value.collects),
        commentCount: normalizeProfilePostCount(value.commentCount, value.commentsCount, value.comments),
        postType
    };
    return hasProfilePostEvidence(item) ? item : null;
}

export function normalizeProfilePosts(value: any): ProfilePost[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(normalizeProfilePost)
        .filter((item): item is ProfilePost => item !== null)
        .slice(0, PROFILE_POSTS_MAX);
}

// 视频信息标准化

export interface VideoInfo {
    coverUrl: string;
    duration: string;
    durationSeconds: number;
    width: string;
    height: string;
    videoUrl: string;
    transcript: string;
    transcriptLanguage: string;
    transcriptTruncated: boolean;
}

export function normalizeVideoInfo(value: any): VideoInfo {
    const info = isObject(value) ? value : {};
    const rawDurationSeconds = Number(info.durationSeconds);
    const durationSeconds = Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0
        ? rawDurationSeconds
        : 0;
    return {
        coverUrl: safeText(info.coverUrl || info.cover),
        duration: safeText(info.duration),
        durationSeconds,
        width: safeText(info.width),
        height: safeText(info.height),
        videoUrl: safeText(info.videoUrl || info.url),
        transcript: truncate(info.transcript, XHS_TRANSCRIPT_MAX_CHARS),
        transcriptLanguage: truncate(info.transcriptLanguage, 40),
        transcriptTruncated: info.transcriptTruncated === true
    };
}

export function hasVideoInfo(info: any): boolean {
    return !!(info && (
        info.coverUrl
        || info.duration
        || info.durationSeconds
        || info.width
        || info.height
        || info.videoUrl
        || info.transcript
    ));
}

// 评论数据标准化

export function normalizeCommentPictures(value: any): string[] {
    if (!Array.isArray(value)) return [];
    const output: string[] = [];
    for (const item of value) {
        const url = normalizeCommentImageUrl(item && typeof item === 'object'
            ? (item.url || item.imageUrl || item.image_url)
            : item);
        if (url && !output.includes(url)) output.push(url);
        if (output.length >= XHS_COMMENT_IMAGES_MAX) break;
    }
    return output;
}

export interface CommentData {
    id: string;
    authorName: string;
    content: string;
    likeCount: string;
    createdAt: number;
    createdAtText: string;
    ipLocation: string;
    isNoteAuthor: boolean;
    targetAuthorName: string;
    subCommentCount: string;
    parsedSubCommentCount: number;
    pictures: string[];
    subComments: CommentData[];
}

export function normalizeComment(value: any, includeReplies: boolean = true): CommentData | null {
    if (typeof value === 'string') {
        const content = truncate(normalizeWhitespace(value), 500);
        return content ? {
            id: '',
            authorName: '',
            content,
            likeCount: '',
            createdAt: 0,
            createdAtText: '',
            ipLocation: '',
            isNoteAuthor: false,
            targetAuthorName: '',
            subCommentCount: '',
            parsedSubCommentCount: 0,
            pictures: [],
            subComments: []
        } : null;
    }
    if (!isObject(value)) return null;
    const pictures = normalizeCommentPictures(value.pictures || value.images || value.imageList);
    const replies = includeReplies && Array.isArray(value.subComments)
        ? value.subComments
            .slice(0, XHS_SUB_COMMENTS_MAX)
            .map(item => normalizeComment(item, false))
            .filter((item): item is CommentData => item !== null)
        : [];
    const content = truncate(value.content || value.text || value.comment, 500)
        || (pictures.length ? '[图片评论]' : '');
    const item: CommentData = {
        id: truncate(value.id || value.commentId || value.comment_id, 100),
        authorName: truncate(value.authorName || value.author || value.nickname || value.user, 80),
        content,
        likeCount: truncate(value.likeCount || value.likes, 30),
        createdAt: parseTimestamp(value.createdAt || value.time || value.timestamp),
        createdAtText: truncate(value.createdAtText, 40),
        ipLocation: truncate(value.ipLocation || value.ip_location, 80),
        isNoteAuthor: value.isNoteAuthor === true,
        targetAuthorName: truncate(value.targetAuthorName, 80),
        subCommentCount: truncate(value.subCommentCount, 30),
        parsedSubCommentCount: replies.length,
        pictures,
        subComments: replies
    };
    return item.authorName || item.content || item.pictures.length || item.subComments.length ? item : null;
}

export function normalizeComments(value: any): CommentData[] {
    if (!Array.isArray(value)) return [];
    return value
        .slice(0, XHS_COMMENTS_MAX)
        .map(item => normalizeComment(item, true))
        .filter((item): item is CommentData => item !== null);
}

// 摘要信息标准化

export interface ImageSummary {
    totalCount: number;
    parsedCount: number;
    hasMore: boolean;
}

export function normalizeImageSummary(value: any, images: any, imageCount: any): ImageSummary {
    const summary = isObject(value) ? value : {};
    const parsedCount = parseCountNumber(summary.parsedCount) || (Array.isArray(images) ? images.length : 0);
    const totalCount = parseCountNumber(summary.totalCount) || parseCountNumber(imageCount) || parsedCount;
    return {
        totalCount,
        parsedCount,
        hasMore: parseBooleanFlag(summary.hasMore) || !!(totalCount && totalCount > parsedCount)
    };
}

export interface CommentSummary {
    totalCount: string;
    topLevelCount: string;
    parsedCount: number;
    parsedReplyCount: number;
    hasMore: boolean;
}

export function normalizeCommentSummary(value: any, comments: any, stats: any): CommentSummary {
    const summary = isObject(value) ? value : {};
    const parsedCount = parseCountNumber(summary.parsedCount) || (Array.isArray(comments) ? comments.length : 0);
    const parsedReplyCount = parseCountNumber(summary.parsedReplyCount)
        || (Array.isArray(comments)
            ? comments.reduce((sum: number, comment: any) => sum + (
                isObject(comment) && Array.isArray(comment.subComments) ? comment.subComments.length : 0
            ), 0)
            : 0);
    const totalCount = safeText(summary.totalCount) || safeText(stats && stats.commentCount);
    const topLevelCount = safeText(summary.topLevelCount);
    const totalNumber = parseCountNumber(totalCount);
    const topLevelNumber = parseCountNumber(topLevelCount);
    return {
        totalCount,
        topLevelCount,
        parsedCount,
        parsedReplyCount,
        hasMore: parseBooleanFlag(summary.hasMore)
            || !!(topLevelNumber && topLevelNumber > parsedCount)
            || !!(totalNumber && totalNumber > parsedCount + parsedReplyCount)
    };
}

export function hasSummary(summary: any): boolean {
    return !!(summary && (
        summary.totalCount
        || summary.topLevelCount
        || summary.parsedCount
        || summary.parsedReplyCount
        || summary.hasMore
    ));
}

// 笔记数据验证

export function hasNoteData(data: any, postType: any, images: any, videoFrames: any, comments: any, stats: any): boolean {
    return !!(
        postType !== 'unknown'
        || safeText(data.title)
        || safeText(data.description || data.desc)
        || safeText(data.authorName || data.author)
        || safeText(data.coverUrl)
        || (Array.isArray(images) && images.length)
        || (Array.isArray(videoFrames) && videoFrames.length)
        || (Array.isArray(comments) && comments.length)
        || hasStats(stats)
        || parseTimestamp(data.publishedAt)
        || hasVideoInfo(normalizeVideoInfo(data.videoInfo))
    );
}

export function inferShareKind(
    data: any,
    postType: any,
    profile: any,
    profilePosts: any,
    product: any,
    images: any,
    videoFrames: any,
    comments: any,
    stats: any,
    sourceText: any
): string {
    const rawShareKind = safeText(data.shareKind || data.shareType || data.kind).toLowerCase();
    if (rawShareKind === 'note' || rawShareKind === 'profile' || rawShareKind === 'product') return rawShareKind;
    if (hasProductData(product)) return 'product';
    if (isProductShareSourceText(sourceText)) return 'product';
    if (hasProfileData(profile) || (Array.isArray(profilePosts) && profilePosts.length)) return 'profile';
    if (isProfileShareSourceText(sourceText)) return 'profile';
    if (hasNoteData(data, postType, images, videoFrames, comments, stats)) return 'note';
    return 'unknown';
}

// DOM 操作辅助函数
export function appendText(parent: HTMLElement, className: string | null, text: string): HTMLDivElement {
    const el = document.createElement('div');
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
}

export function appendSpan(parent: HTMLElement, className: string | null, text: string): HTMLSpanElement {
    const el = document.createElement('span');
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
}
