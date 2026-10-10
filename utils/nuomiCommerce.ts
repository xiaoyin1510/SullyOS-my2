import { useCallback, useEffect, useRef, useState } from 'react';
import { sendNuomiCommerceCardToCharacter } from './nuomiCommerceChat';

/** Nuomi buyer-side commerce demo. All records are local to this SullyOS installation. */
export type CommerceKind = 'parcel' | 'food';
export type FulfillmentMode = 'delivery' | 'pickup';
export type ParcelStatus = 'awaiting_shipment' | 'shipped' | 'delivering' | 'completed' | 'cancelled';
export type FoodStatus = 'waiting_restaurant' | 'preparing' | 'rider_picked' | 'delivering' | 'completed' | 'cancelled';
export type CommerceStatus = ParcelStatus | FoodStatus;

export interface ProductShop {
  id: string; name: string; slogan: string; category: string; rating: number; sales: string;
  freight: number; freeFreightAt: number; emoji: string; gradient: string; tags: string[]; shippingDays?: number;
}
export interface ShopProduct {
  id: string; shopId: string; name: string; category: string; price: number; originalPrice: number;
  emoji: string; gradient: string; description: string; variants: string[]; tags: string[]; sales: number;
}
export interface FoodRestaurant {
  id: string; name: string; category: string; rating: number; monthlySales: string; distance: string;
  etaMinutes: number; deliveryFee: number; minOrder: number; emoji: string; gradient: string;
  tags: string[]; announcement: string; pickupAvailable: boolean;
}
export interface FoodMenuItem {
  id: string; restaurantId: string; name: string; category: string; price: number; originalPrice?: number;
  emoji: string; description: string; popular?: boolean; options?: string[]; sold: number;
}
export interface CommerceCartLine {
  id: string; kind: CommerceKind; itemId: string; storeId: string; storeName: string; name: string;
  price: number; quantity: number; emoji: string; variant?: string; selected: boolean;
  shippingFee: number; freeShippingAt: number; shippingDays?: number; etaMinutes?: number;
}
export interface CommerceOrderItem {
  id: string; itemId: string; storeId: string; storeName: string; name: string; price: number;
  quantity: number; emoji: string; variant?: string;
}
export interface CommerceAddress { recipient: string; phone: string; address: string; detail: string; }
export interface OrderEvent { status: CommerceStatus; label: string; detail: string; timestamp: number; }
export interface CommerceOrder {
  id: string; kind: CommerceKind; createdAt: number; status: CommerceStatus; items: CommerceOrderItem[];
  subtotal: number; shippingFee: number; total: number; address: CommerceAddress; note: string;
  fulfillment: FulfillmentMode; merchantId?: string; merchantName?: string; storeNames: string[];
  trackingNo?: string; carrier?: string; events: OrderEvent[];
  expectedDeliveryAt?: number; fulfillmentStartedAt?: number; statusUpdatedAt?: number; shippingDays?: number; etaMinutes?: number;
  paymentStatus?: 'not_requested' | 'pending_character' | 'paid_by_character' | 'declined';
  paymentRequestId?: string; paymentRequestedAt?: number; payerCharacterId?: string; payerCharacterName?: string;
  recipientCharacterId?: string; recipientCharacterName?: string; giftOpenedAt?: number;
  companionCharacterId?: string; companionCharacterName?: string;
  sharedCharacterId?: string; sharedCharacterName?: string; pickupCode?: string;
}
export interface NuomiCommerceState {
  version: 1; carts: Record<CommerceKind, CommerceCartLine[]>; orders: CommerceOrder[];
  address: CommerceAddress; favorites: string[];
}

export const DEFAULT_COMMERCE_ADDRESS: CommerceAddress = {
  recipient: '林小姐', phone: '138****6208', address: '云杉路 18 号', detail: '2 栋 1203 室',
};
const STORAGE_KEY = 'sully.nuomi.commerce.v1';
const CHANGE_EVENT = 'sully-nuomi-commerce-changed';

export const PRODUCT_SHOPS: ProductShop[] = [
  { id: 'shop-select', name: '糯米优选', slogan: '认真挑选的日常好物', category: '生活好物', rating: 4.9, sales: '2.6万+', freight: 6, freeFreightAt: 79, shippingDays: 2, emoji: '🛍️', gradient: 'from-amber-100 to-orange-200', tags: ['精选', '满79包邮'] },
  { id: 'shop-island', name: '小岛零食铺', slogan: '把小快乐装进口袋', category: '零食饮料', rating: 4.8, sales: '1.8万+', freight: 5, freeFreightAt: 59, shippingDays: 2, emoji: '🍪', gradient: 'from-rose-100 to-pink-200', tags: ['回购榜', '满59包邮'] },
  { id: 'shop-home', name: '松弛家居研究所', slogan: '让家舒服一点点', category: '家居日用', rating: 4.9, sales: '9800+', freight: 8, freeFreightAt: 99, shippingDays: 3, emoji: '🪴', gradient: 'from-emerald-100 to-teal-200', tags: ['生活美学', '满99包邮'] },
  { id: 'shop-wear', name: '慢慢穿搭', slogan: '舒服自在，刚刚好', category: '服饰配件', rating: 4.7, sales: '7600+', freight: 8, freeFreightAt: 129, shippingDays: 3, emoji: '🧢', gradient: 'from-violet-100 to-purple-200', tags: ['日常穿搭', '满129包邮'] },
  { id: 'shop-digital', name: '好物数码局', slogan: '小设备解决小麻烦', category: '数码配件', rating: 4.8, sales: '6300+', freight: 6, freeFreightAt: 99, shippingDays: 2, emoji: '🎧', gradient: 'from-sky-100 to-blue-200', tags: ['实用数码', '满99包邮'] },
  { id: 'shop-sweet', name: '甜心杂货社', slogan: '给平凡日子一点甜', category: '礼物文创', rating: 4.9, sales: '1.1万+', freight: 5, freeFreightAt: 69, shippingDays: 2, emoji: '🎁', gradient: 'from-fuchsia-100 to-pink-200', tags: ['送礼灵感', '满69包邮'] },
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  { id: 'p-mug', shopId: 'shop-select', name: '云朵陶瓷马克杯', category: '生活好物', price: 29, originalPrice: 45, emoji: '☕', gradient: 'from-orange-100 to-amber-200', description: '温润哑光釉面，手感饱满，适合每天早晨的第一杯热饮。', variants: ['奶油白', '燕麦色', '鼠尾草绿'], tags: ['人气好物', '柔和配色'], sales: 1260 },
  { id: 'p-bag', shopId: 'shop-select', name: '轻便帆布托特包', category: '生活好物', price: 39, originalPrice: 59, emoji: '👜', gradient: 'from-yellow-100 to-orange-200', description: '厚实帆布、内袋分区，通勤和周末出门都能装。', variants: ['原色', '墨绿', '黑色'], tags: ['轻便耐用'], sales: 968 },
  { id: 'p-bottle', shopId: 'shop-select', name: '随行保温杯 420ml', category: '生活好物', price: 49, originalPrice: 69, emoji: '🥤', gradient: 'from-teal-100 to-emerald-200', description: '简洁随行杯，适合办公室、通勤和短途出行。', variants: ['雾白', '薄荷绿', '樱花粉'], tags: ['保温随行'], sales: 783 },
  { id: 'p-cookies', shopId: 'shop-island', name: '黄油曲奇分享盒', category: '零食饮料', price: 26.8, originalPrice: 36, emoji: '🍪', gradient: 'from-amber-100 to-orange-200', description: '酥香黄油曲奇，独立小袋包装，适合下午茶分享。', variants: ['经典原味', '巧克力味'], tags: ['下午茶'], sales: 2480 },
  { id: 'p-gummy', shopId: 'shop-island', name: '酸甜水果软糖组合', category: '零食饮料', price: 18.9, originalPrice: 25, emoji: '🍬', gradient: 'from-pink-100 to-rose-200', description: '多种水果口味混合装，酸甜有嚼劲。', variants: ['综合口味', '少酸版'], tags: ['追剧必备'], sales: 1830 },
  { id: 'p-tea', shopId: 'shop-island', name: '蜜桃乌龙冷泡茶', category: '零食饮料', price: 22, originalPrice: 30, emoji: '🍑', gradient: 'from-rose-100 to-orange-200', description: '轻盈果香与乌龙茶底搭配，冷泡也清爽。', variants: ['6 袋装', '12 袋装'], tags: ['清爽茶饮'], sales: 1320 },
  { id: 'p-plant', shopId: 'shop-home', name: '桌面小森林仿真绿植', category: '家居日用', price: 32, originalPrice: 48, emoji: '🪴', gradient: 'from-green-100 to-emerald-200', description: '无需浇水的桌面绿植，为书桌或床头添一点绿意。', variants: ['龟背竹', '尤加利', '小橄榄树'], tags: ['桌面装饰'], sales: 986 },
  { id: 'p-lamp', shopId: 'shop-home', name: '暖光蘑菇小夜灯', category: '家居日用', price: 58, originalPrice: 79, emoji: '🍄', gradient: 'from-yellow-100 to-amber-200', description: '柔和暖光，三档亮度，适合睡前阅读和床头氛围。', variants: ['奶油白', '雾粉'], tags: ['氛围感'], sales: 842 },
  { id: 'p-towel', shopId: 'shop-home', name: '柔软速干毛巾 3 条装', category: '家居日用', price: 35, originalPrice: 49, emoji: '🧺', gradient: 'from-cyan-100 to-teal-200', description: '亲肤柔软，吸水快干，日常洗漱更方便。', variants: ['米白组合', '灰绿组合'], tags: ['实用日用'], sales: 653 },
  { id: 'p-cap', shopId: 'shop-wear', name: '简约弯檐棒球帽', category: '服饰配件', price: 35, originalPrice: 52, emoji: '🧢', gradient: 'from-slate-100 to-blue-200', description: '轻量棉质帽身，弯檐修饰脸型，四季都能搭。', variants: ['米白', '藏青', '卡其'], tags: ['百搭'], sales: 1258 },
  { id: 'p-socks', shopId: 'shop-wear', name: '软糯中筒袜 5 双装', category: '服饰配件', price: 28, originalPrice: 39, emoji: '🧦', gradient: 'from-purple-100 to-pink-200', description: '柔软弹力罗口，适合日常通勤和居家。', variants: ['暖色系', '冷色系', '黑白系'], tags: ['多色可选'], sales: 974 },
  { id: 'p-tote', shopId: 'shop-wear', name: '迷你斜挎手机包', category: '服饰配件', price: 42, originalPrice: 65, emoji: '👝', gradient: 'from-rose-100 to-fuchsia-200', description: '轻巧小包，可放手机、卡包和钥匙。', variants: ['奶油白', '莓果红', '黑色'], tags: ['小巧出门'], sales: 721 },
  { id: 'p-earbuds', shopId: 'shop-digital', name: '无线蓝牙耳机', category: '数码配件', price: 89, originalPrice: 129, emoji: '🎧', gradient: 'from-sky-100 to-indigo-200', description: '轻巧耳机盒，日常通勤、学习与视频通话适用。', variants: ['珍珠白', '曜石黑'], tags: ['数码精选'], sales: 1168 },
  { id: 'p-charger', shopId: 'shop-digital', name: '多口快充充电头', category: '数码配件', price: 59, originalPrice: 89, emoji: '🔌', gradient: 'from-blue-100 to-cyan-200', description: '小体积多口设计，出门减少充电器数量。', variants: ['双口 30W', '三口 45W'], tags: ['出行刚需'], sales: 863 },
  { id: 'p-cable', shopId: 'shop-digital', name: '编织快充数据线', category: '数码配件', price: 19.9, originalPrice: 29, emoji: '🔋', gradient: 'from-teal-100 to-sky-200', description: '编织外皮耐弯折，日常备用线。', variants: ['Type-C', 'Lightning'], tags: ['实用配件'], sales: 1430 },
  { id: 'p-candle', shopId: 'shop-sweet', name: '晚风香薰蜡烛礼盒', category: '礼物文创', price: 68, originalPrice: 88, emoji: '🕯️', gradient: 'from-fuchsia-100 to-rose-200', description: '温柔香气与简约礼盒包装，适合生日和小小纪念日。', variants: ['白茶', '桂花', '雪松'], tags: ['礼物推荐'], sales: 703 },
  { id: 'p-card', shopId: 'shop-sweet', name: '手写祝福卡片套装', category: '礼物文创', price: 16, originalPrice: 22, emoji: '💌', gradient: 'from-pink-100 to-red-200', description: '多款简约插画卡片，给礼物加上一点心意。', variants: ['花朵款', '星星款', '混合款'], tags: ['附信封'], sales: 1588 },
  { id: 'p-plush', shopId: 'shop-sweet', name: '迷你毛绒挂件', category: '礼物文创', price: 25, originalPrice: 35, emoji: '🧸', gradient: 'from-amber-100 to-pink-200', description: '软乎乎的小挂件，可以挂在包上或钥匙上。', variants: ['小熊', '小兔', '小猫'], tags: ['可爱小物'], sales: 1290 },
];

export const FOOD_RESTAURANTS: FoodRestaurant[] = [
  { id: 'r-rice', name: '巷口小碗菜', category: '家常菜', rating: 4.9, monthlySales: '月售 3200+', distance: '450m', etaMinutes: 28, deliveryFee: 3, minOrder: 15, emoji: '🍱', gradient: 'from-orange-100 to-amber-200', tags: ['放心吃', '热卖榜'], announcement: '现炒现做，饭菜分装，预计 25–35 分钟送达。', pickupAvailable: true },
  { id: 'r-noodle', name: '一碗热汤面', category: '面食粉面', rating: 4.8, monthlySales: '月售 2800+', distance: '620m', etaMinutes: 25, deliveryFee: 2.5, minOrder: 12, emoji: '🍜', gradient: 'from-rose-100 to-orange-200', tags: ['汤面热销', '回购高'], announcement: '汤底每日熬制，面条下单现煮。', pickupAvailable: true },
  { id: 'r-coffee', name: '山茶咖啡社', category: '咖啡奶茶', rating: 4.9, monthlySales: '月售 4100+', distance: '380m', etaMinutes: 18, deliveryFee: 2, minOrder: 10, emoji: '☕', gradient: 'from-stone-100 to-amber-200', tags: ['下午茶', '人气咖啡'], announcement: '咖啡现磨制作；冰饮随单提供独立封口。', pickupAvailable: true },
  { id: 'r-spicy', name: '川香小馆', category: '川湘风味', rating: 4.7, monthlySales: '月售 1900+', distance: '900m', etaMinutes: 35, deliveryFee: 4, minOrder: 20, emoji: '🌶️', gradient: 'from-red-100 to-orange-200', tags: ['下饭菜', '可选辣度'], announcement: '辣度可选，请在下单备注里说明忌口。', pickupAvailable: true },
  { id: 'r-bakery', name: '早安面包房', category: '面包甜点', rating: 4.8, monthlySales: '月售 2200+', distance: '720m', etaMinutes: 24, deliveryFee: 3, minOrder: 12, emoji: '🥐', gradient: 'from-yellow-100 to-amber-200', tags: ['早餐', '每日现烤'], announcement: '面包每日分批出炉，售完即止。', pickupAvailable: true },
  { id: 'r-burger', name: '脆皮研究所', category: '汉堡炸鸡', rating: 4.7, monthlySales: '月售 3600+', distance: '1.1km', etaMinutes: 32, deliveryFee: 3.5, minOrder: 18, emoji: '🍔', gradient: 'from-amber-100 to-red-200', tags: ['炸鸡人气榜', '套餐更划算'], announcement: '炸物现点现炸，配送途中请尽快食用。', pickupAvailable: true },
  { id: 'r-convenience', name: '深夜便利站', category: '便利零食', rating: 4.8, monthlySales: '月售 1500+', distance: '300m', etaMinutes: 16, deliveryFee: 2, minOrder: 8, emoji: '🏪', gradient: 'from-emerald-100 to-teal-200', tags: ['夜宵补给', '日用品'], announcement: '饮料、零食和生活应急用品，深夜也可下单。', pickupAvailable: true },
];

export const FOOD_MENU: FoodMenuItem[] = [
  { id: 'f-rice-1', restaurantId: 'r-rice', name: '招牌红烧肉饭', category: '热销套餐', price: 26, originalPrice: 32, emoji: '🍛', description: '软糯红烧肉、时蔬和米饭。', popular: true, options: ['正常饭量', '加饭 +2 元'], sold: 1280 },
  { id: 'f-rice-2', restaurantId: 'r-rice', name: '香煎鸡腿饭', category: '热销套餐', price: 23, originalPrice: 28, emoji: '🍗', description: '现煎鸡腿排搭配清爽时蔬。', popular: true, options: ['正常饭量', '加饭 +2 元'], sold: 980 },
  { id: 'f-rice-3', restaurantId: 'r-rice', name: '番茄炒蛋饭', category: '家常小炒', price: 18, emoji: '🍅', description: '家常番茄炒蛋，酸甜开胃。', options: ['正常饭量', '加饭 +2 元'], sold: 760 },
  { id: 'f-rice-4', restaurantId: 'r-rice', name: '清炒时蔬', category: '家常小炒', price: 12, emoji: '🥬', description: '当日时蔬清炒。', sold: 320 },
  { id: 'f-noodle-1', restaurantId: 'r-noodle', name: '招牌牛肉汤面', category: '招牌面食', price: 29, originalPrice: 35, emoji: '🍜', description: '慢炖牛肉汤底，牛肉片和青菜。', popular: true, options: ['不辣', '微辣', '中辣'], sold: 1530 },
  { id: 'f-noodle-2', restaurantId: 'r-noodle', name: '酸菜肉丝面', category: '招牌面食', price: 24, emoji: '🥢', description: '酸菜清香与肉丝搭配。', options: ['不辣', '微辣', '中辣'], sold: 870 },
  { id: 'f-noodle-3', restaurantId: 'r-noodle', name: '鲜虾馄饨', category: '小食加点', price: 19, emoji: '🥟', description: '鲜虾馅馄饨，汤鲜味美。', sold: 660 },
  { id: 'f-noodle-4', restaurantId: 'r-noodle', name: '冰豆浆', category: '饮料', price: 6, emoji: '🥛', description: '清爽豆浆，冰饮。', sold: 410 },
  { id: 'f-coffee-1', restaurantId: 'r-coffee', name: '海盐焦糖拿铁', category: '人气咖啡', price: 23, originalPrice: 28, emoji: '☕', description: '浓缩咖啡与柔滑奶泡，带一点海盐焦糖。', popular: true, options: ['冰', '热', '少冰'], sold: 2380 },
  { id: 'f-coffee-2', restaurantId: 'r-coffee', name: '燕麦拿铁', category: '人气咖啡', price: 25, emoji: '🥤', description: '燕麦奶与咖啡融合，口感醇厚。', options: ['冰', '热', '少冰'], sold: 1860 },
  { id: 'f-coffee-3', restaurantId: 'r-coffee', name: '桂花乌龙茶', category: '清爽茶饮', price: 18, emoji: '🧋', description: '桂花香气与乌龙茶底，清爽回甘。', options: ['正常糖', '半糖', '无糖'], sold: 1280 },
  { id: 'f-coffee-4', restaurantId: 'r-coffee', name: '巴斯克芝士蛋糕', category: '搭配甜点', price: 22, emoji: '🍰', description: '外层焦香，内里绵密。', sold: 760 },
  { id: 'f-spicy-1', restaurantId: 'r-spicy', name: '小炒黄牛肉', category: '招牌热菜', price: 38, emoji: '🥩', description: '牛肉和鲜椒大火快炒。', popular: true, options: ['微辣', '中辣', '特辣'], sold: 920 },
  { id: 'f-spicy-2', restaurantId: 'r-spicy', name: '鱼香肉丝', category: '招牌热菜', price: 28, emoji: '🥢', description: '酸甜微辣，下饭家常菜。', options: ['微辣', '中辣'], sold: 670 },
  { id: 'f-spicy-3', restaurantId: 'r-spicy', name: '酸辣土豆丝', category: '家常小炒', price: 16, emoji: '🥔', description: '爽脆土豆丝。', options: ['微辣', '中辣', '特辣'], sold: 520 },
  { id: 'f-spicy-4', restaurantId: 'r-spicy', name: '米饭', category: '主食', price: 3, emoji: '🍚', description: '一份米饭。', sold: 1100 },
  { id: 'f-bakery-1', restaurantId: 'r-bakery', name: '黄油可颂', category: '每日现烤', price: 12, emoji: '🥐', description: '层层酥脆，黄油香气浓郁。', popular: true, sold: 1430 },
  { id: 'f-bakery-2', restaurantId: 'r-bakery', name: '莓果奶油吐司', category: '每日现烤', price: 18, emoji: '🍞', description: '松软吐司配莓果奶油。', sold: 760 },
  { id: 'f-bakery-3', restaurantId: 'r-bakery', name: '可可曲奇', category: '小点心', price: 9, emoji: '🍪', description: '可可香浓，适合搭配咖啡。', sold: 880 },
  { id: 'f-bakery-4', restaurantId: 'r-bakery', name: '早餐组合', category: '套餐', price: 25, originalPrice: 31, emoji: '🥪', description: '可颂、煎蛋与咖啡组合。', popular: true, sold: 680 },
  { id: 'f-burger-1', restaurantId: 'r-burger', name: '双层脆鸡堡', category: '招牌汉堡', price: 29, originalPrice: 35, emoji: '🍔', description: '两层脆鸡排、蔬菜和特调酱。', popular: true, options: ['原味', '加辣'], sold: 1740 },
  { id: 'f-burger-2', restaurantId: 'r-burger', name: '香辣鸡翅 4 只', category: '炸物小食', price: 22, emoji: '🍗', description: '外脆内嫩，现点现炸。', options: ['原味', '辣味'], sold: 1120 },
  { id: 'f-burger-3', restaurantId: 'r-burger', name: '薯条大份', category: '炸物小食', price: 13, emoji: '🍟', description: '金黄酥脆薯条。', sold: 980 },
  { id: 'f-burger-4', restaurantId: 'r-burger', name: '可乐', category: '饮料', price: 7, emoji: '🥤', description: '冰爽碳酸饮料。', sold: 1370 },
  { id: 'f-conv-1', restaurantId: 'r-convenience', name: '冰镇气泡水', category: '饮料', price: 5, emoji: '🫧', description: '冰镇饮料一瓶。', sold: 570 },
  { id: 'f-conv-2', restaurantId: 'r-convenience', name: '夜宵零食拼盘', category: '零食', price: 19, emoji: '🍿', description: '薯片、饼干和小糖果随机组合。', sold: 490 },
  { id: 'f-conv-3', restaurantId: 'r-convenience', name: '纸巾补给装', category: '生活应急', price: 8.5, emoji: '🧻', description: '日常纸巾应急补给。', sold: 320 },
  { id: 'f-conv-4', restaurantId: 'r-convenience', name: '巧克力牛奶', category: '饮料', price: 6.5, emoji: '🥛', description: '冷藏巧克力牛奶。', sold: 380 },
];

function initialState(): NuomiCommerceState {
  return { version: 1, carts: { parcel: [], food: [] }, orders: [], address: DEFAULT_COMMERCE_ADDRESS, favorites: [] };
}
function safeAddress(input: unknown): CommerceAddress {
  const a = input && typeof input === 'object' ? input as Partial<CommerceAddress> : {};
  return { recipient: String(a.recipient || DEFAULT_COMMERCE_ADDRESS.recipient), phone: String(a.phone || DEFAULT_COMMERCE_ADDRESS.phone), address: String(a.address || DEFAULT_COMMERCE_ADDRESS.address), detail: String(a.detail || DEFAULT_COMMERCE_ADDRESS.detail) };
}
export function readNuomiCommerceState(): NuomiCommerceState {
  if (typeof window === 'undefined') return initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<NuomiCommerceState>;
    return {
      version: 1,
      carts: {
        parcel: Array.isArray(parsed.carts?.parcel) ? parsed.carts!.parcel : [],
        food: Array.isArray(parsed.carts?.food) ? parsed.carts!.food : [],
      },
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      address: safeAddress(parsed.address),
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((x): x is string => typeof x === 'string') : [],
    };
  } catch { return initialState(); }
}
function writeState(state: NuomiCommerceState) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.warn('Nuomi commerce local save failed', error); }
}
function publishState(state: NuomiCommerceState) {
  writeState(state);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
}
export const money = (value: number) => `¥${Math.max(0, value).toFixed(2).replace(/\.00$/, '')}`;
export const parcelStatusLabel: Record<ParcelStatus, string> = {
  awaiting_shipment: '待发货', shipped: '运输中', delivering: '派送中', completed: '已签收', cancelled: '已取消',
};
export const foodStatusLabel: Record<FoodStatus, string> = {
  waiting_restaurant: '待商家接单', preparing: '正在制作', rider_picked: '骑手已取餐', delivering: '配送中', completed: '已送达', cancelled: '已取消',
};
const labelForStatus = (kind: CommerceKind, status: CommerceStatus) => kind === 'parcel' ? parcelStatusLabel[status as ParcelStatus] : foodStatusLabel[status as FoodStatus];
const eventDetail = (kind: CommerceKind, status: CommerceStatus, fulfillment: FulfillmentMode): string => {
  if (kind === 'parcel') {
    const map: Record<ParcelStatus, string> = { awaiting_shipment: '商家正在整理包裹，等待揽收', shipped: '快递已揽收，正在发往分拣中心', delivering: '包裹到达目的地，快递员准备派送', completed: '包裹已签收，感谢购买', cancelled: '订单已取消' };
    return map[status as ParcelStatus];
  }
  if (fulfillment === 'pickup') {
    const map: Record<FoodStatus, string> = { waiting_restaurant: '订单已提交，等待店员确认', preparing: '店员正在准备餐品', rider_picked: '餐品已备好，可以到店取餐', delivering: '请到店出示取餐码', completed: '已完成取餐，祝你用餐愉快', cancelled: '订单已取消' };
    return map[status as FoodStatus];
  }
  const map: Record<FoodStatus, string> = { waiting_restaurant: '订单已送达商家，等待确认', preparing: '商家正在制作餐品', rider_picked: '骑手已到店取餐', delivering: '骑手正在前往收货地址', completed: '餐品已送达，请及时享用', cancelled: '订单已取消' };
  return map[status as FoodStatus];
};

const labelForOrder = (order: CommerceOrder, status: CommerceStatus): string => {
  if (order.kind === 'parcel') return parcelStatusLabel[status as ParcelStatus];
  if (order.fulfillment === 'pickup') {
    const pickupLabels: Partial<Record<FoodStatus, string>> = { waiting_restaurant: '等待店员接单', preparing: '正在准备餐品', rider_picked: '可以取餐', completed: '已取餐', cancelled: '已取消' };
    return pickupLabels[status as FoodStatus] || foodStatusLabel[status as FoodStatus] || status;
  }
  return foodStatusLabel[status as FoodStatus] || status;
};

function orderEta(order: CommerceOrder): number {
  if (order.expectedDeliveryAt) return order.expectedDeliveryAt;
  const base = order.fulfillmentStartedAt || order.createdAt;
  if (order.kind === 'parcel') return base + (Math.max(1, order.shippingDays || 3) * 24 * 60 * 60 * 1000);
  return base + (Math.max(8, order.etaMinutes || 30) * 60 * 1000);
}

/** Move shipment/food milestones forward from elapsed time. Re-opening the app catches up missed stages. */
function advanceOrderByClock(order: CommerceOrder, now: number): CommerceOrder {
  if (order.status === 'completed' || order.status === 'cancelled' || order.paymentStatus === 'pending_character' || order.paymentStatus === 'declined') return order;
  const base = order.fulfillmentStartedAt || order.createdAt;
  const eta = orderEta(order);
  const total = Math.max(60_000, eta - base);
  const steps: Array<{ status: CommerceStatus; at: number }> = order.kind === 'parcel'
    ? [
        { status: 'shipped', at: base + Math.min(15 * 60_000, total * 0.08) },
        { status: 'delivering', at: Math.max(base + 15 * 60_000, eta - 6 * 60 * 60_000) },
        { status: 'completed', at: eta },
      ]
    : order.fulfillment === 'pickup'
      ? [
          { status: 'preparing', at: base + Math.min(60_000, total * 0.12) },
          { status: 'rider_picked', at: base + Math.max(2 * 60_000, total * 0.72) },
          { status: 'completed', at: eta },
        ]
      : [
          { status: 'preparing', at: base + Math.min(60_000, total * 0.12) },
          { status: 'rider_picked', at: base + Math.max(2 * 60_000, total * 0.56) },
          { status: 'delivering', at: base + Math.max(3 * 60_000, total * 0.8) },
          { status: 'completed', at: eta },
        ];
  const orderSequence = order.kind === 'parcel'
    ? ['awaiting_shipment', 'shipped', 'delivering', 'completed']
    : order.fulfillment === 'pickup'
      ? ['waiting_restaurant', 'preparing', 'rider_picked', 'completed']
      : ['waiting_restaurant', 'preparing', 'rider_picked', 'delivering', 'completed'];
  const existingStage = orderSequence.indexOf(order.status);
  let nextStatus = order.status;
  const events = [...(order.events || [])];
  let changed = false;
  for (const step of steps) {
    const stage = orderSequence.indexOf(step.status);
    if (stage <= existingStage || now < step.at) continue;
    nextStatus = step.status;
    events.push({ status: step.status, label: labelForOrder(order, step.status), detail: eventDetail(order.kind, step.status, order.fulfillment), timestamp: step.at });
    changed = true;
  }
  const expectedDeliveryAt = order.expectedDeliveryAt || eta;
  const pickupCode = order.kind === 'food' && order.fulfillment === 'pickup' ? (order.pickupCode || order.id.slice(-4).toUpperCase()) : order.pickupCode;
  if (!changed && order.expectedDeliveryAt === expectedDeliveryAt && order.pickupCode === pickupCode) return order;
  return { ...order, status: nextStatus, expectedDeliveryAt, pickupCode, events, ...(changed ? { statusUpdatedAt: now } : {}) } as CommerceOrder;
}

export function resolveNuomiCharacterPaymentReply(paymentRequestId: string, characterId: string, reply: string, repliedAt: number): 'paid' | 'declined' | null {
  if (!paymentRequestId || !reply) return null;
  const decline = /(?:我.{0,4}(?:不能|不想|不方便|没法|没办法|无法).{0,8}(?:帮你|替你|给你|代付|付款|付钱|买单)|不想(?:帮你|替你|给你).{0,6}(?:付|付款|付钱|买单)|不(?:帮你|替你|方便替你|方便帮你|愿意替你).{0,6}(?:付|付款|付钱|买单|代付)|不能代付|不方便代付|你自己付|自己付吧|这次你付|我这次不付)/.test(reply);
  const agree = !decline && /(?:我.{0,5}(?:帮你|替你|给你).{0,6}(?:付|付款|付钱|买单)|我来.{0,4}(?:付|付款|买单)|这单我来|算我的|我请你|包在我身上|我来承担)/.test(reply);
  if (!agree && !decline) return null;
  const current = readNuomiCommerceState();
  let matched = false;
  const orders = current.orders.map(order => {
    if (order.paymentRequestId !== paymentRequestId || order.payerCharacterId !== characterId || order.paymentStatus !== 'pending_character' || repliedAt <= (order.paymentRequestedAt || order.createdAt)) return order;
    matched = true;
    if (agree) {
      const base = repliedAt;
      const eta = order.kind === 'parcel' ? base + Math.max(1, order.shippingDays || 3) * 24 * 60 * 60 * 1000 : base + Math.max(8, order.etaMinutes || 30) * 60 * 1000;
      return { ...order, paymentStatus: 'paid_by_character' as const, fulfillmentStartedAt: base, expectedDeliveryAt: eta, status: order.kind === 'parcel' ? 'awaiting_shipment' as const : 'waiting_restaurant' as const, events: [...order.events, { status: order.status, label: 'TA 答应代付', detail: `${order.payerCharacterName || 'TA'} 答应替你承担这笔订单。`, timestamp: repliedAt }] };
    }
    return { ...order, paymentStatus: 'declined' as const, status: 'cancelled' as const, events: [...order.events, { status: 'cancelled' as const, label: '订单已取消', detail: `${order.payerCharacterName || 'TA'} 这次没有答应代付，订单已为你取消。`, timestamp: repliedAt }] };
  });
  if (!matched) return null;
  publishState({ ...current, orders });
  return agree ? 'paid' : 'declined';
}

export function useNuomiCommerce(enableClock = true) {
  const [state, setState] = useState<NuomiCommerceState>(() => readNuomiCommerceState());
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    const refresh = (event?: Event) => {
      const eventState = (event as CustomEvent<NuomiCommerceState> | undefined)?.detail;
      const next = eventState && eventState.version === 1 ? eventState : readNuomiCommerceState();
      stateRef.current = next; setState(next);
    };
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(CHANGE_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  useEffect(() => {
    if (!enableClock || typeof window === 'undefined') return;
    let busy = false;
    const tick = async () => {
      if (busy || typeof window === 'undefined') return;
      busy = true;
      try {
        const previous = readNuomiCommerceState();
        const orders = previous.orders.map(order => advanceOrderByClock(order, Date.now()));
        const changedOrders = orders.filter((order, index) => order !== previous.orders[index]);
        if (!changedOrders.length) return;
        const next = { ...previous, orders };
        stateRef.current = next; setState(next); publishState(next);
        for (const order of changedOrders) {
          const previousOrder = previous.orders.find(item => item.id === order.id);
          if (!previousOrder) continue;
          const notifyCharId = order.recipientCharacterId || order.companionCharacterId || order.sharedCharacterId;
          if (!notifyCharId) continue;
          const priorEventKeys = new Set((previousOrder.events || []).map(event => `${event.status}:${event.timestamp}`));
          const newEvents = (order.events || []).filter(event => !priorEventKeys.has(`${event.status}:${event.timestamp}`));
          const isGift = !!order.recipientCharacterId;
          const etaText = order.expectedDeliveryAt ? new Date(order.expectedDeliveryAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
          for (const orderEvent of newEvents) {
            const isFinal = orderEvent.status === 'completed';
            const statusText = labelForOrder(order, orderEvent.status);
            const title = isGift
              ? (isFinal ? '礼物送到啦' : orderEvent.status === 'shipped' ? '礼物已经寄出' : orderEvent.status === 'delivering' ? '礼物正在派送' : '礼物订单有新进展')
              : isFinal ? (order.kind === 'parcel' ? '快递已签收' : order.fulfillment === 'pickup' ? '已经取餐' : '外卖已送达')
                : order.kind === 'parcel' ? (orderEvent.status === 'awaiting_shipment' ? '商家正在准备包裹' : orderEvent.status === 'shipped' ? '快递已发出' : '快递正在派送')
                : orderEvent.status === 'waiting_restaurant' ? '商家已收到订单' : orderEvent.status === 'preparing' ? '餐点正在准备' : orderEvent.status === 'rider_picked' ? (order.fulfillment === 'pickup' ? '可以去取餐了' : '骑手已取餐') : '外卖正在送来';
            const content = isGift
              ? (isFinal ? '你送我的礼物到了，我有点期待，想看看里面是什么。' : `礼物有新进展：${statusText}。`)
              : isFinal ? `${order.kind === 'parcel' ? '快递' : order.fulfillment === 'pickup' ? '餐点' : '外卖'}${order.fulfillment === 'pickup' ? '已经取到了' : '已经送到了'}。`
                : `${order.merchantName || order.storeNames.join('、')}：${statusText}。`;
            await sendNuomiCommerceCardToCharacter(notifyCharId, {
              kind: isGift && isFinal ? 'gift-arrival' : 'order-update', app: order.kind === 'parcel' ? '糯米商城' : '糯米外卖',
              title,
              detail: `${order.items.map(item => `${item.emoji} ${item.name} ×${item.quantity}`).join('、')}。${etaText ? `预计送达时间：${etaText}。` : ''}${isGift && isFinal ? '可以继续在聊天里聊聊拆礼物的反应。' : '订单进度已更新。'}`,
              content,
              status: statusText, orderId: order.id, amount: order.total, eta: etaText,
              items: order.items.map(item => ({ name: item.name, quantity: item.quantity, emoji: item.emoji, variant: item.variant, price: item.price, storeName: item.storeName })),
              storeName: order.merchantName || order.storeNames.join('、'), fulfillment: order.fulfillment,
            }, `order-status:${order.id}:${orderEvent.status}:${orderEvent.timestamp}`, isFinal);
          }
        }
      } finally { busy = false; }
    };
    void tick();
    const interval = window.setInterval(() => { void tick(); }, 15_000);
    const onFocus = () => { void tick(); };
    const onVisibility = () => { if (!document.hidden) void tick(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisibility); };
  }, [enableClock]);
  const commit = useCallback((mutate: (current: NuomiCommerceState) => NuomiCommerceState) => {
    const next = mutate(readNuomiCommerceState());
    stateRef.current = next; setState(next); publishState(next); return next;
  }, []);

  const addToCart = useCallback((line: Omit<CommerceCartLine, 'id' | 'quantity' | 'selected'>, replaceDifferentStore = false, quantity = 1): boolean => {
    let added = false;
    commit(current => {
      const currentCart = current.carts[line.kind];
      if (line.kind === 'food' && currentCart.some(item => item.storeId !== line.storeId) && !replaceDifferentStore) return current;
      const base = line.kind === 'food' && replaceDifferentStore ? currentCart.filter(item => item.storeId === line.storeId) : currentCart;
      const id = `${line.itemId}::${line.variant || 'standard'}::${line.storeId}`;
      const addQuantity = Math.min(99, Math.max(1, Math.floor(quantity)));
      const existing = base.find(item => item.id === id);
      const nextCart = existing
        ? base.map(item => item.id === id ? { ...item, quantity: Math.min(99, item.quantity + addQuantity), selected: true } : item)
        : [...base, { ...line, id, quantity: addQuantity, selected: true }];
      added = true;
      return { ...current, carts: { ...current.carts, [line.kind]: nextCart } };
    });
    return added;
  }, [commit]);

  const setQuantity = useCallback((kind: CommerceKind, id: string, quantity: number) => commit(current => ({
    ...current, carts: { ...current.carts, [kind]: quantity <= 0 ? current.carts[kind].filter(item => item.id !== id) : current.carts[kind].map(item => item.id === id ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item) },
  })), [commit]);
  const toggleCartLine = useCallback((kind: CommerceKind, id: string) => commit(current => ({
    ...current, carts: { ...current.carts, [kind]: current.carts[kind].map(item => item.id === id ? { ...item, selected: !item.selected } : item) },
  })), [commit]);
  const selectAllCart = useCallback((kind: CommerceKind, selected: boolean) => commit(current => ({
    ...current, carts: { ...current.carts, [kind]: current.carts[kind].map(item => ({ ...item, selected })) },
  })), [commit]);
  const removeCartLine = useCallback((kind: CommerceKind, id: string) => commit(current => ({
    ...current, carts: { ...current.carts, [kind]: current.carts[kind].filter(item => item.id !== id) },
  })), [commit]);
  const toggleFavorite = useCallback((productId: string) => commit(current => ({
    ...current, favorites: current.favorites.includes(productId) ? current.favorites.filter(id => id !== productId) : [...current.favorites, productId],
  })), [commit]);
  const setAddress = useCallback((address: CommerceAddress) => commit(current => ({ ...current, address: safeAddress(address) })), [commit]);

  const createOrder = useCallback((kind: CommerceKind, options: {
    address?: CommerceAddress; note?: string; fulfillment?: FulfillmentMode; itemsOverride?: CommerceCartLine[];
    payerCharacterId?: string; payerCharacterName?: string; paymentRequestId?: string;
    recipientCharacterId?: string; recipientCharacterName?: string; companionCharacterId?: string; companionCharacterName?: string;
  } = {}): CommerceOrder | null => {
    const current = readNuomiCommerceState();
    const selected = options.itemsOverride || current.carts[kind].filter(line => line.selected);
    if (selected.length === 0) return null;
    const fulfillment: FulfillmentMode = kind === 'food' ? (options.fulfillment || 'delivery') : 'delivery';
    // A multi-shop parcel checkout becomes one shipment per seller. Food orders are always a single restaurant.
    const groups = new Map<string, CommerceCartLine[]>();
    selected.forEach(line => {
      const groupKey = kind === 'parcel' ? line.storeId : 'food-single-restaurant';
      groups.set(groupKey, [...(groups.get(groupKey) || []), line]);
    });
    const baseTime = Date.now();
    const orders: CommerceOrder[] = Array.from(groups.values()).map((lines, index) => {
      const createdAt = baseTime + index;
      const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingFee = kind === 'parcel'
        ? (subtotal >= (lines[0]?.freeShippingAt || 0) ? 0 : (lines[0]?.shippingFee || 0))
        : (fulfillment === 'delivery' ? (lines[0]?.shippingFee || 0) : 0);
      const status: CommerceStatus = kind === 'parcel' ? 'awaiting_shipment' : 'waiting_restaurant';
      const paymentPending = !!options.payerCharacterId;
      const shippingDays = kind === 'parcel' ? Math.max(1, lines[0]?.shippingDays || 3) : undefined;
      const etaMinutes = kind === 'food' ? Math.max(8, FOOD_RESTAURANTS.find(item => item.id === lines[0]?.storeId)?.etaMinutes || 30) : undefined;
      const expectedDeliveryAt = paymentPending ? undefined : kind === 'parcel' ? createdAt + (shippingDays || 3) * 24 * 60 * 60 * 1000 : createdAt + (etaMinutes || 30) * 60 * 1000;
      const merchantId = kind === 'food' ? lines[0]?.storeId : undefined;
      const merchantName = kind === 'food' ? lines[0]?.storeName : undefined;
      return {
        id: `${kind === 'parcel' ? 'NM' : 'ND'}${String(createdAt).slice(-10)}${Math.floor(Math.random() * 90 + 10)}`,
        kind, createdAt, status,
        items: lines.map(item => ({ id: item.id, itemId: item.itemId, storeId: item.storeId, storeName: item.storeName, name: item.name, price: item.price, quantity: item.quantity, emoji: item.emoji, variant: item.variant })),
        subtotal, shippingFee, total: subtotal + shippingFee, address: safeAddress(options.address || current.address), note: (options.note || '').trim(), fulfillment,
        merchantId, merchantName, storeNames: Array.from(new Set(lines.map(item => item.storeName))),
        trackingNo: kind === 'parcel' ? `NM${String(createdAt).slice(-10)}CN` : undefined,
        carrier: kind === 'parcel' ? '糯米快递' : undefined,
        shippingDays, etaMinutes, expectedDeliveryAt, fulfillmentStartedAt: paymentPending ? undefined : createdAt,
        paymentStatus: paymentPending ? 'pending_character' : 'not_requested',
        paymentRequestId: options.paymentRequestId, paymentRequestedAt: paymentPending ? createdAt : undefined,
        payerCharacterId: options.payerCharacterId, payerCharacterName: options.payerCharacterName,
        recipientCharacterId: options.recipientCharacterId, recipientCharacterName: options.recipientCharacterName,
        companionCharacterId: options.companionCharacterId, companionCharacterName: options.companionCharacterName,
        pickupCode: kind === 'food' && fulfillment === 'pickup' ? String(Math.floor(1000 + Math.random() * 9000)) : undefined,
        events: [{
          status,
          label: paymentPending ? '等待代付回复' : labelForOrder({ kind, fulfillment } as CommerceOrder, status),
          detail: paymentPending ? `已向${options.payerCharacterName || 'TA'}发送代付申请；收到答复后再${kind === 'parcel' ? '安排发货' : '通知商家接单'}。` : eventDetail(kind, status, fulfillment),
          timestamp: createdAt,
        }],
      };
    });
    const firstOrder = orders[0] || null;
    if (!firstOrder) return null;
    const selectedIds = new Set(selected.map(item => item.id));
    commit(latest => ({
      ...latest,
      carts: options.itemsOverride ? latest.carts : { ...latest.carts, [kind]: latest.carts[kind].filter(item => !selectedIds.has(item.id)) },
      orders: [...orders, ...latest.orders],
      address: firstOrder.address,
    }));
    return firstOrder;
  }, [commit]);

  const advanceOrder = useCallback((orderId: string) => commit(current => ({
    ...current,
    orders: current.orders.map(order => {
      if (order.id !== orderId || order.status === 'completed' || order.status === 'cancelled') return order;
      let nextStatus: CommerceStatus = order.status;
      if (order.kind === 'parcel') {
        const sequence: ParcelStatus[] = ['awaiting_shipment', 'shipped', 'delivering', 'completed'];
        nextStatus = sequence[Math.min(sequence.indexOf(order.status as ParcelStatus) + 1, sequence.length - 1)];
      } else if (order.fulfillment === 'pickup') {
        const sequence: FoodStatus[] = ['waiting_restaurant', 'preparing', 'rider_picked', 'completed'];
        nextStatus = sequence[Math.min(sequence.indexOf(order.status as FoodStatus) + 1, sequence.length - 1)];
      } else {
        const sequence: FoodStatus[] = ['waiting_restaurant', 'preparing', 'rider_picked', 'delivering', 'completed'];
        nextStatus = sequence[Math.min(sequence.indexOf(order.status as FoodStatus) + 1, sequence.length - 1)];
      }
      return { ...order, status: nextStatus, events: [...order.events, { status: nextStatus, label: labelForOrder(order, nextStatus), detail: eventDetail(order.kind, nextStatus, order.fulfillment), timestamp: Date.now() }] };
    }),
  })), [commit]);
  const linkOrderToCharacter = useCallback((orderId: string, characterId: string, characterName: string) => commit(current => ({
    ...current, orders: current.orders.map(order => order.id === orderId ? { ...order, sharedCharacterId: characterId, sharedCharacterName: characterName } : order),
  })), [commit]);

  const cancelOrder = useCallback((orderId: string) => commit(current => ({
    ...current,
    orders: current.orders.map(order => {
      if (order.id !== orderId || !['awaiting_shipment', 'waiting_restaurant'].includes(order.status)) return order;
      const status: CommerceStatus = 'cancelled';
      return { ...order, status, paymentStatus: order.paymentStatus === 'pending_character' ? 'declined' as const : order.paymentStatus, events: [...order.events, { status, label: '已取消', detail: order.paymentStatus === 'pending_character' ? '你取消了代付申请，这笔订单不再继续。' : '这笔订单已取消。', timestamp: Date.now() }] };
    }),
  })), [commit]);
  const markGiftOpened = useCallback((orderId: string) => commit(current => ({
    ...current,
    orders: current.orders.map(order => order.id === orderId && order.recipientCharacterId ? { ...order, giftOpenedAt: Date.now() } : order),
  })), [commit]);

  return { state, addToCart, setQuantity, toggleCartLine, selectAllCart, removeCartLine, toggleFavorite, setAddress, createOrder, advanceOrder, cancelOrder, markGiftOpened, linkOrderToCharacter };
}
