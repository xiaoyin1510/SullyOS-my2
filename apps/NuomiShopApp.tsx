import React, { useMemo, useState } from 'react';
import { useOS } from '../context/OSContext';
import { AppID, CharacterProfile } from '../types';
import CommerceCharacterPicker from '../components/commerce/CommerceCharacterPicker';
import { sendNuomiCommerceCardToCharacter } from '../utils/nuomiCommerceChat';
import {
  ArrowLeft, CaretRight, CheckCircle, Heart, MapPin, Minus, Package, Plus,
  Receipt, MagnifyingGlass, ShoppingBag, ShoppingCart, Star, Truck, X,
} from '@phosphor-icons/react';
import {
  CommerceOrder, CommerceAddress, ProductShop, ShopProduct, PRODUCT_SHOPS, SHOP_PRODUCTS,
  money, parcelStatusLabel, useNuomiCommerce,
} from '../utils/nuomiCommerce';

type ShopTab = 'home' | 'cart' | 'orders' | 'me';
const PRODUCT_CATEGORIES = ['全部', '生活好物', '零食饮料', '家居日用', '服饰配件', '数码配件', '礼物文创'];

const ShopPill: React.FC<{ children: React.ReactNode; tone?: 'rose' | 'dark' | 'muted' | 'green' }> = ({ children, tone = 'muted' }) => {
  const cls = tone === 'rose' ? 'bg-rose-50 text-rose-600' : tone === 'dark' ? 'bg-stone-900 text-white' : tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${cls}`}>{children}</span>;
};

const ShopStatus: React.FC<{ status: string }> = ({ status }) => {
  const tone = status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' ? 'bg-stone-100 text-stone-400' : status === 'awaiting_shipment' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{parcelStatusLabel[status as keyof typeof parcelStatusLabel] || status}</span>;
};

const ProductTile: React.FC<{ product: ShopProduct; shop?: ProductShop; onClick: () => void; favorite: boolean; onFavorite: (event: React.MouseEvent) => void }> = ({ product, shop, onClick, favorite, onFavorite }) => (
  <div className="overflow-hidden rounded-[20px] border border-stone-100 bg-white shadow-[0_3px_14px_rgba(72,49,31,0.045)]">
    <div className={`relative flex h-[124px] w-full items-center justify-center bg-gradient-to-br ${product.gradient}`}>
      <button onClick={onClick} aria-label={`查看${product.name}`} className="absolute inset-0 flex items-center justify-center"><span className="text-[58px] drop-shadow-sm transition-transform duration-200 hover:scale-105">{product.emoji}</span></button>
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/75 px-2 py-1 text-[9px] font-bold text-stone-600 backdrop-blur-sm">{product.tags[0]}</span>
      <button aria-label="收藏商品" onClick={onFavorite} className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full ${favorite ? 'bg-rose-500 text-white' : 'bg-white/75 text-stone-500'}`}><Heart size={14} weight={favorite ? 'fill' : 'regular'} /></button>
    </div>
    <button onClick={onClick} className="block w-full px-3 pb-1 pt-2 text-left">
      <div className="line-clamp-2 min-h-[36px] text-[12px] font-semibold leading-[18px] text-stone-800">{product.name}</div>
      <div className="mt-1 truncate text-[10px] text-stone-400">{shop?.name || '精选好物'} · 已售 {product.sales.toLocaleString()}</div>
      <div className="mt-2 flex items-end justify-between">
        <div><span className="text-[15px] font-bold text-rose-600">{money(product.price)}</span> <span className="text-[10px] text-stone-300 line-through">{money(product.originalPrice)}</span></div>
        <span className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white"><Plus size={15} weight="bold" /></span>
      </div>
    </button>
  </div>
);

const etaLabel = (order: CommerceOrder): string => {
  if (order.status === 'cancelled') return '订单已取消';
  if (order.paymentStatus === 'pending_character') return `等待${order.payerCharacterName || 'TA'}回复代付后安排发货`;
  if (!order.expectedDeliveryAt) return '正在安排配送';
  const eta = new Date(order.expectedDeliveryAt);
  const dayText = eta.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const timeText = eta.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (order.kind === 'parcel') {
    const daysLeft = Math.max(0, Math.ceil((order.expectedDeliveryAt - Date.now()) / (24 * 60 * 60 * 1000)));
    return order.status === 'completed' ? `已于 ${dayText} 签收` : `预计 ${dayText} 送达 · 约 ${daysLeft || 1} 天`;
  }
  return order.status === 'completed' ? `已于 ${timeText}送达` : `预计 ${timeText} 前后${order.fulfillment === 'pickup' ? '可取餐' : '送达'}`;
};

const OrderCard: React.FC<{ order: CommerceOrder; expanded: boolean; onToggle: () => void; onCancel: () => void; onShare: () => void; onUnbox: () => void }> = ({ order, expanded, onToggle, onCancel, onShare, onUnbox }) => (
  <div className="overflow-hidden rounded-[20px] border border-stone-100 bg-white shadow-[0_3px_14px_rgba(72,49,31,0.04)]">
    <button onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl">📦</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-bold text-stone-800">{order.storeNames.length > 1 ? `${order.storeNames[0]} 等 ${order.storeNames.length} 家店铺` : order.storeNames[0]}</span>{order.paymentStatus === 'pending_character' ? <ShopPill tone="rose">等待 TA 回复</ShopPill> : <ShopStatus status={order.status} />}</div>
        <div className="mt-1 truncate text-[11px] text-stone-400">订单号 {order.id}</div>
        <div className="mt-2 flex items-center gap-2"><div className="flex -space-x-2">{order.items.slice(0, 4).map(item => <span key={item.id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-50 to-orange-100 text-base">{item.emoji}</span>)}</div><span className="text-[11px] text-stone-500">共 {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件</span><span className="ml-auto text-[14px] font-bold text-stone-800">{money(order.total)}</span></div>
        <div className="mt-2 text-[10px] font-semibold text-amber-700">{etaLabel(order)}</div>
      </div>
      <CaretRight size={16} className={`mt-1 shrink-0 text-stone-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
    </button>
    {expanded && <div className="border-t border-stone-100 px-4 pb-4 pt-3">
      <div className="space-y-3">{order.items.map(item => <div key={item.id} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-50 text-xl">{item.emoji}</span><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-stone-700">{item.name}</div>{item.variant && <div className="mt-0.5 text-[10px] text-stone-400">规格：{item.variant}</div>}</div><span className="text-[11px] text-stone-400">×{item.quantity}</span><span className="text-[12px] font-semibold">{money(item.price * item.quantity)}</span></div>)}</div>
      <div className="mt-4 rounded-2xl bg-stone-50 p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-700"><Truck size={15} /> 糯米快递 · 运单追踪</div>
        <div className="mt-1 text-[11px] leading-5 text-stone-500">运单号：{order.trackingNo || '待揽收'} · {etaLabel(order)}</div>
        <div className="mt-3 space-y-3">{order.events.slice().reverse().map((event, idx) => <div key={`${event.timestamp}-${idx}`} className="flex gap-3"><div className="flex w-3 flex-col items-center"><span className={`mt-1 h-2 w-2 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-stone-300'}`} />{idx < order.events.length - 1 && <span className="mt-1 h-full min-h-[18px] w-px bg-stone-200" />}</div><div className="min-w-0 flex-1 pb-1"><div className={`text-[11px] font-semibold ${idx === 0 ? 'text-stone-800' : 'text-stone-400'}`}>{event.label}</div><div className="mt-0.5 text-[10px] leading-4 text-stone-400">{event.detail}</div><div className="mt-0.5 text-[9px] text-stone-300">{new Date(event.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div></div></div>)}</div>
      </div>
      {order.payerCharacterName && <div className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-[10px] text-violet-700">{order.paymentStatus === 'pending_character' ? `正在等 ${order.payerCharacterName} 回复代付请求` : order.paymentStatus === 'paid_by_character' ? `${order.payerCharacterName} 已答应替你付款` : order.paymentStatus === 'declined' ? `${order.payerCharacterName} 没有答应代付` : ''}</div>}
      {order.recipientCharacterName && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] text-rose-700">送给 {order.recipientCharacterName} 的礼物{order.giftOpenedAt ? ' · TA 已拆开' : order.status === 'completed' ? ' · 已送达，可以看看 TA 的反应' : ''}</div>}
      {order.sharedCharacterName && <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[10px] text-sky-700">订单进展也会同步给 {order.sharedCharacterName}</div>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">{['awaiting_shipment', 'waiting_restaurant'].includes(order.status) && <button onClick={onCancel} className="rounded-full border border-stone-200 px-3 py-2 text-[10px] font-semibold text-stone-500">取消订单</button>}<button onClick={onShare} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800">分享订单给 TA</button>{order.recipientCharacterId && order.status === 'completed' && !order.giftOpenedAt && <button onClick={onUnbox} className="rounded-full bg-rose-500 px-3 py-2 text-[10px] font-semibold text-white">看 TA 拆开</button>}</div>
    </div>}
  </div>
);

const AddressModal: React.FC<{ address: CommerceAddress; onClose: () => void; onSave: (next: CommerceAddress) => void }> = ({ address, onClose, onSave }) => {
  const [draft, setDraft] = useState(address);
  return <div className="absolute inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 backdrop-blur-[2px]" onClick={onClose}>
    <div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-bold text-stone-800">收货地址</h3><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100"><X size={16}/></button></div>
      <div className="space-y-3">{([['recipient', '收件人'], ['phone', '联系电话'], ['address', '所在地址'], ['detail', '门牌 / 楼栋']] as const).map(([key, label]) => <label key={key} className="block"><span className="mb-1.5 block text-[11px] font-semibold text-stone-500">{label}</span><input value={draft[key]} onChange={event => setDraft(old => ({ ...old, [key]: event.target.value }))} className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-[13px] text-stone-800 outline-none focus:border-amber-400" placeholder={label}/></label>)}</div>
      <button onClick={() => { onSave(draft); onClose(); }} className="mt-5 w-full rounded-2xl bg-stone-900 py-3.5 text-[13px] font-bold text-white">保存地址</button>
      <p className="mt-2 text-center text-[10px] text-stone-400">收货地址会保存在这台设备上</p>
    </div>
  </div>;
};

const NuomiShopApp: React.FC = () => {
  const { closeApp, characters, setActiveCharacterId, openApp } = useOS();
  const commerce = useNuomiCommerce(false);
  const { state } = commerce;
  const [tab, setTab] = useState<ShopTab>('home');
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [variant, setVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<CommerceAddress>(state.address);
  const [orderNote, setOrderNote] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'全部' | '待发货' | '运输中' | '已完成'>('全部');
  const [toast, setToast] = useState('');
  const [characterPickerAction, setCharacterPickerAction] = useState<'shop-together' | 'share-product' | 'gift-product' | 'share-order' | 'pay-order' | null>(null);
  const [pendingShareOrder, setPendingShareOrder] = useState<CommerceOrder | null>(null);
  const [payerCharacter, setPayerCharacter] = useState<CharacterProfile | null>(null);

  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2100); };
  const cart = state.carts.parcel;
  const selectedCart = cart.filter(line => line.selected);
  const selectedSubtotal = selectedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedShipping = useMemo(() => {
    const groups = new Map<string, { subtotal: number; fee: number; threshold: number }>();
    selectedCart.forEach(line => { const v = groups.get(line.storeId) || { subtotal: 0, fee: line.shippingFee, threshold: line.freeShippingAt }; v.subtotal += line.price * line.quantity; groups.set(line.storeId, v); });
    let result = 0; groups.forEach(group => { if (group.subtotal < group.threshold) result += group.fee; }); return result;
  }, [selectedCart]);
  const filteredProducts = useMemo(() => SHOP_PRODUCTS.filter(product => {
    const shop = PRODUCT_SHOPS.find(item => item.id === product.shopId);
    const matchesCategory = category === '全部' || product.category === category;
    const matchesShop = shopFilter === 'all' || product.shopId === shopFilter;
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query || `${product.name} ${product.description} ${product.tags.join(' ')} ${shop?.name || ''}`.toLocaleLowerCase().includes(query);
    return matchesCategory && matchesShop && matchesSearch;
  }), [category, shopFilter, search]);
  const parcelOrders = state.orders.filter(order => order.kind === 'parcel');
  const filteredOrders = parcelOrders.filter(order => {
    if (orderFilter === '待发货') return order.status === 'awaiting_shipment';
    if (orderFilter === '运输中') return ['shipped', 'delivering'].includes(order.status);
    if (orderFilter === '已完成') return ['completed', 'cancelled'].includes(order.status);
    return true;
  });

  const openProduct = (product: ShopProduct) => { setSelectedProduct(product); setVariant(product.variants[0] || '标准款'); setQuantity(1); };
  const addProductToCart = () => {
    if (!selectedProduct) return;
    const shop = PRODUCT_SHOPS.find(item => item.id === selectedProduct.shopId);
    if (!shop) return;
    commerce.addToCart({ kind: 'parcel', itemId: selectedProduct.id, storeId: shop.id, storeName: shop.name, name: selectedProduct.name, price: selectedProduct.price, emoji: selectedProduct.emoji, variant, shippingFee: shop.freight, freeShippingAt: shop.freeFreightAt, shippingDays: shop.shippingDays || 3 }, false, quantity);
    setSelectedProduct(null); notify('已加入购物车');
  };
  const placeOrder = () => {
    const storeCount = new Set(selectedCart.map(item => item.storeId)).size;
    const paymentRequestId = payerCharacter ? `nuomi-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : undefined;
    const order = commerce.createOrder('parcel', { address: addressDraft, note: orderNote, payerCharacterId: payerCharacter?.id, payerCharacterName: payerCharacter?.name, paymentRequestId });
    if (!order) { notify('请先勾选要结算的商品'); return; }
    setShowCheckout(false); setOrderNote(''); setTab('orders'); setExpandedOrder(order.id);
    if (payerCharacter && paymentRequestId) {
      const character = payerCharacter;
      void sendNuomiCommerceCardToCharacter(character.id, {
        kind: 'pay-request', app: '糯米商城', title: '代付申请', action: 'pay-request', orderId: order.id, paymentRequestId,
        detail: `我在糯米商城选了这些东西，想问问你愿不愿意帮我付这单。${selectedCart.map(item => `${item.emoji} ${item.name} ×${item.quantity}`).join('、')}`,
        content: '我在糯米商城选了点东西，想问问你愿不愿意帮我代付这单。你愿意的话跟我说一声，不方便也没关系。',
        amount: selectedSubtotal + selectedShipping,
        items: selectedCart.map(item => ({ name: item.name, quantity: item.quantity, emoji: item.emoji, variant: item.variant, price: item.price, storeName: item.storeName })),
      }, `pay-request:${paymentRequestId}`, true).then(() => { setActiveCharacterId(character.id); openApp(AppID.Chat); });
      setPayerCharacter(null);
      return;
    }
    notify(storeCount > 1 ? `已按店铺拆分为 ${storeCount} 个独立快递单` : '订单已提交，商家正在安排发货');
  };

  const openCharacterPicker = (action: NonNullable<typeof characterPickerAction>, order?: CommerceOrder) => {
    setPendingShareOrder(order || null);
    setCharacterPickerAction(action);
  };
  const handleCharacterChoice = async (character: CharacterProfile) => {
    const action = characterPickerAction;
    setCharacterPickerAction(null);
    if (!action) return;
    if (action === 'pay-order') { setPayerCharacter(character); notify(`结算时会向 ${character.name} 发起代付申请`); return; }
    if (action === 'share-product' && selectedProduct) {
      const product = selectedProduct; const shop = PRODUCT_SHOPS.find(item => item.id === product.shopId);
      await sendNuomiCommerceCardToCharacter(character.id, { kind: 'product', app: '糯米商城', title: '给你看看这个', detail: `${shop?.name || ''} · ${product.name}。${product.description} 价格 ${money(product.price)}${variant ? `，规格：${variant}` : ''}。`, content: '我逛商城看到这个，觉得挺不错的，发给你看看。你觉得怎么样？', amount: product.price * quantity, storeName: shop?.name, imageEmoji: product.emoji, items: [{ name: product.name, quantity, emoji: product.emoji, variant, price: product.price, storeName: shop?.name }] }, `product-share:${Date.now()}:${character.id}`, true);
      setSelectedProduct(null); setActiveCharacterId(character.id); openApp(AppID.Chat); return;
    }
    if (action === 'gift-product' && selectedProduct) {
      const product = selectedProduct; const shop = PRODUCT_SHOPS.find(item => item.id === product.shopId); if (!shop) return;
      const line = { id: `gift-${product.id}-${Date.now()}`, kind: 'parcel' as const, itemId: product.id, storeId: shop.id, storeName: shop.name, name: product.name, price: product.price, quantity, emoji: product.emoji, variant, selected: true, shippingFee: shop.freight, freeShippingAt: shop.freeFreightAt, shippingDays: shop.shippingDays || 3 };
      const order = commerce.createOrder('parcel', { address: addressDraft, note: `送给 ${character.name} 的礼物`, itemsOverride: [line], recipientCharacterId: character.id, recipientCharacterName: character.name });
      if (!order) { notify('暂时无法创建礼物订单'); return; }
      await sendNuomiCommerceCardToCharacter(character.id, { kind: 'gift', app: '糯米商城', title: '给你准备了一份礼物', action: 'gift', orderId: order.id, status: '路上见', detail: `${product.emoji} ${product.name}${variant ? `（${variant}）` : ''}，预计 ${etaLabel(order)}。`, content: '我给你挑了一件小礼物，已经寄给你啦。等你收到的时候告诉我你的第一反应。', amount: order.total, eta: order.expectedDeliveryAt ? new Date(order.expectedDeliveryAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined, storeName: shop.name, items: order.items.map(item => ({ name: item.name, quantity: item.quantity, emoji: item.emoji, variant: item.variant, price: item.price, storeName: item.storeName })) }, `gift-order:${order.id}`, true);
      setSelectedProduct(null); setTab('orders'); setExpandedOrder(order.id); setActiveCharacterId(character.id); openApp(AppID.Chat); return;
    }
    if (action === 'shop-together') {
      const cartSnapshot = selectedCart.map(item => ({ name: item.name, quantity: item.quantity, emoji: item.emoji, variant: item.variant, price: item.price, storeName: item.storeName }));
      const cartText = cartSnapshot.length ? `我购物车里已经放了：${cartSnapshot.map(item => `${item.emoji || '🛍️'} ${item.name} ×${item.quantity}`).join('、')}，目前商品小计 ${money(selectedSubtotal)}。` : '我还没决定买什么，想先和你一起看看。';
      await sendNuomiCommerceCardToCharacter(character.id, { kind: 'shopping-together', app: '糯米商城', title: '一起逛逛？', detail: `邀请 TA 一起挑商品。${cartText}`, content: `陪我一起逛逛商城好不好？${cartText}你来帮我挑挑，看到喜欢的我也想听听你的意见。`, amount: selectedSubtotal, items: cartSnapshot }, `shopping-together:${Date.now()}:${character.id}`, true);
      setActiveCharacterId(character.id); openApp(AppID.Chat); return;
    }
    if (action === 'share-order' && pendingShareOrder) {
      const order = pendingShareOrder;
      await sendNuomiCommerceCardToCharacter(character.id, { kind: order.recipientCharacterId ? 'gift' : 'order', app: '糯米商城', title: '和你分享一笔订单', detail: `${order.storeNames.join('、')} · ${order.items.map(item => `${item.name} ×${item.quantity}`).join('、')} · ${money(order.total)} · ${etaLabel(order)}`, content: `给你看看我这笔订单，${order.items.map(item => `${item.name} ×${item.quantity}`).join('、')}，一共 ${money(order.total)}。`, amount: order.total, status: order.status, orderId: order.id, eta: order.expectedDeliveryAt ? new Date(order.expectedDeliveryAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined, storeName: order.storeNames.join('、'), items: order.items.map(item => ({ name: item.name, quantity: item.quantity, emoji: item.emoji, variant: item.variant, price: item.price, storeName: item.storeName })) }, `order-share:${order.id}:${character.id}:${Date.now()}`, true);
      commerce.linkOrderToCharacter(order.id, character.id, character.name);
      setPendingShareOrder(null); setActiveCharacterId(character.id); openApp(AppID.Chat); return;
    }
    if (action === 'share-order') setPendingShareOrder(null);
  };

  const handleUnboxGift = async (order: CommerceOrder) => {
    if (!order.recipientCharacterId || order.giftOpenedAt) return;
    const recipient = characters.find(character => character.id === order.recipientCharacterId);
    if (!recipient) { notify('找不到收礼角色'); return; }
    await sendNuomiCommerceCardToCharacter(recipient.id, { kind: 'gift-unbox', app: '糯米商城', title: '拆开礼物', action: 'gift-unbox', orderId: order.id, status: '已送达', amount: order.total, storeName: order.storeNames.join('、'), items: order.items.map(item => ({ name: item.name, quantity: item.quantity, emoji: item.emoji, variant: item.variant, price: item.price, storeName: item.storeName })), detail: '包裹已经送到，现在可以看看 TA 拆开礼物时的反应。', content: '你的礼物已经到了，快拆开看看吧。拆开以后第一时间告诉我你喜欢不喜欢。' }, `gift-unbox:${order.id}`, true);
    commerce.markGiftOpened(order.id);
    setActiveCharacterId(recipient.id); openApp(AppID.Chat);
  };

  return <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f8f7f3] text-stone-800">
    <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-stone-200/70 bg-white/90 px-4 pb-3 pt-3 backdrop-blur-xl">
      <button onClick={closeApp} className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600"><ArrowLeft size={18}/></button>
      <div className="text-center"><div className="text-[15px] font-black tracking-[0.06em]">糯米商城</div><div className="mt-0.5 text-[9px] tracking-[0.24em] text-stone-400">NUOMI MARKET</div></div>
      <button onClick={() => setTab('cart')} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-700"><ShoppingCart size={18}/>{cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}</button>
    </header>

    <main className="min-h-0 flex-1 overflow-y-auto pb-3">
      {tab === 'home' && <div className="mx-auto max-w-3xl px-4 pt-4">
        <label className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white px-3.5 py-3 shadow-sm"><MagnifyingGlass size={17} className="text-stone-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜一搜好物、店铺或灵感" className="w-full bg-transparent text-[12px] outline-none placeholder:text-stone-400"/><span className="text-[10px] text-stone-300">搜索</span></label>
        <div className="relative mt-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#6e4b3a] via-[#926d55] to-[#c69b74] p-5 text-white shadow-[0_12px_26px_rgba(116,78,54,0.18)]">
          <div className="absolute -right-4 -top-8 h-36 w-36 rounded-full bg-white/10"/><div className="absolute -bottom-12 right-20 h-36 w-36 rounded-full bg-amber-100/10"/>
          <div className="relative"><ShopPill tone="rose">本周精选 · 日常好物</ShopPill><h1 className="mt-4 text-[23px] font-black leading-tight tracking-wide">把喜欢的生活<br/>一点点装进来</h1><p className="mt-2 max-w-[205px] text-[11px] leading-5 text-white/75">从小物件到生活灵感，遇见值得带回家的好东西。</p><div className="mt-4 flex items-center gap-2 text-[10px] font-semibold"><span className="rounded-full bg-white px-3 py-2 text-stone-800">逛逛精选</span><span className="flex items-center gap-1 text-white/75"><Package size={14}/> 商城商品 · 快递配送</span></div></div><div className="absolute bottom-3 right-5 text-[64px] drop-shadow-md">🛍️</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[{icon:'🚚',title:'快递配送',sub:'物流进度可追踪'},{icon:'🎁',title:'店铺优惠',sub:'满额可享包邮'},{icon:'🧾',title:'订单记录',sub:'购买记录集中管理'}].map(item => <div key={item.title} className="rounded-2xl border border-stone-100 bg-white px-3 py-3"><div className="text-[22px]">{item.icon}</div><div className="mt-1 text-[11px] font-bold">{item.title}</div><div className="mt-1 text-[9px] text-stone-400">{item.sub}</div></div>)}
        </div>
        <button onClick={() => openCharacterPicker('shop-together')} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3 text-left"><span><span className="block text-[12px] font-bold text-stone-800">💌 和 TA 一起逛</span><span className="mt-1 block text-[10px] text-stone-500">把喜欢的商品分享给角色，一起挑选</span></span><CaretRight size={16} className="text-rose-400"/></button>
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between"><div><div className="text-[16px] font-black">逛逛店铺</div><div className="mt-1 text-[10px] text-stone-400">不同店铺，各有各的好物</div></div><button onClick={() => { setShopFilter('all'); setCategory('全部'); }} className="flex items-center gap-1 text-[11px] font-semibold text-stone-500">全部店铺 <CaretRight size={13}/></button></div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">{PRODUCT_SHOPS.map(shop => <button key={shop.id} onClick={() => { setShopFilter(shop.id); setCategory('全部'); }} className={`w-[136px] shrink-0 overflow-hidden rounded-[20px] border bg-white text-left transition ${shopFilter === shop.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-stone-100'}`}><div className={`flex h-[76px] items-center justify-center bg-gradient-to-br ${shop.gradient}`}><span className="text-[38px]">{shop.emoji}</span></div><div className="p-3"><div className="truncate text-[12px] font-bold">{shop.name}</div><div className="mt-1 truncate text-[9px] text-stone-400">{shop.slogan}</div><div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600"><Star size={11} weight="fill"/>{shop.rating} <span className="text-stone-300">·</span><span className="text-stone-400">{shop.sales}</span></div></div></button>)}</div>
        </section>
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between"><div><div className="text-[16px] font-black">为你挑选</div><div className="mt-1 text-[10px] text-stone-400">小物件也能让日常更舒服</div></div>{shopFilter !== 'all' && <button onClick={() => setShopFilter('all')} className="text-[10px] font-semibold text-rose-500">清除店铺筛选 ×</button>}</div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3">{PRODUCT_CATEGORIES.map(item => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold ${category === item ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-100'}`}>{item}</button>)}</div>
          {filteredProducts.length ? <div className="grid grid-cols-2 gap-3">{filteredProducts.map(product => <ProductTile key={product.id} product={product} shop={PRODUCT_SHOPS.find(item => item.id === product.shopId)} favorite={state.favorites.includes(product.id)} onFavorite={event => { event.stopPropagation(); commerce.toggleFavorite(product.id); }} onClick={() => openProduct(product)} />)}</div> : <div className="rounded-2xl bg-white p-8 text-center text-[12px] text-stone-400">没有找到符合条件的商品，试试其他关键词。</div>}
        </section>
      </div>}

      {tab === 'cart' && <div className="mx-auto max-w-3xl px-4 pb-5 pt-5">
        <div className="flex items-center justify-between"><div><h2 className="text-[20px] font-black">购物车</h2><p className="mt-1 text-[11px] text-stone-400">来自不同店铺的商品会分别计算快递费</p></div><span className="rounded-full bg-white px-3 py-1.5 text-[10px] text-stone-500">{cart.length} 款商品</span></div>
        {cart.length === 0 ? <div className="mt-8 rounded-[26px] bg-white px-6 py-12 text-center"><div className="text-[54px]">🛍️</div><div className="mt-3 text-[15px] font-bold">购物车还是空的</div><p className="mt-1 text-[11px] text-stone-400">去店铺里看看有没有喜欢的小物件。</p><button onClick={() => setTab('home')} className="mt-5 rounded-full bg-stone-900 px-5 py-3 text-[12px] font-bold text-white">去逛逛</button></div> : <>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3"><button onClick={() => commerce.selectAllCart('parcel', !cart.every(item => item.selected))} className="flex items-center gap-2 text-[11px] font-semibold"><span className={`flex h-4 w-4 items-center justify-center rounded-full border ${cart.every(item => item.selected) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'}`}>{cart.every(item => item.selected) && <CheckCircle size={12} weight="fill"/>}</span>全选</button><button onClick={() => { cart.forEach(item => commerce.removeCartLine('parcel', item.id)); }} className="text-[10px] text-stone-400">清空购物车</button></div>
          {PRODUCT_SHOPS.filter(shop => cart.some(item => item.storeId === shop.id)).map(shop => { const lines = cart.filter(item => item.storeId === shop.id); const sub = lines.reduce((sum, item) => sum + item.price * item.quantity, 0); const selectedSub = lines.filter(item => item.selected).reduce((sum, item) => sum + item.price * item.quantity, 0); return <section key={shop.id} className="mt-3 overflow-hidden rounded-[22px] border border-stone-100 bg-white"><div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3"><span className="text-[20px]">{shop.emoji}</span><span className="flex-1 text-[12px] font-bold">{shop.name}</span><span className="text-[10px] text-stone-400">{sub >= shop.freeFreightAt ? '本店包邮' : `再购 ${money(Math.max(0, shop.freeFreightAt - sub))} 包邮`}</span></div>{lines.map(line => <div key={line.id} className="flex items-center gap-3 border-b border-stone-50 p-3 last:border-b-0"><button onClick={() => commerce.toggleCartLine('parcel', line.id)} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${line.selected ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'}`}>{line.selected && <CheckCircle size={12} weight="fill"/>}</button><div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 text-[34px]">{line.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-semibold">{line.name}</div><div className="mt-1 text-[10px] text-stone-400">{line.variant}</div><div className="mt-2 flex items-center justify-between"><span className="text-[14px] font-black text-rose-600">{money(line.price)}</span><div className="flex items-center gap-2"><button onClick={() => commerce.setQuantity('parcel', line.id, line.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100"><Minus size={12}/></button><span className="min-w-4 text-center text-[11px] font-semibold">{line.quantity}</span><button onClick={() => commerce.setQuantity('parcel', line.id, line.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100"><Plus size={12}/></button></div></div></div></div>)}<div className="bg-stone-50/80 px-4 py-2.5 text-right text-[10px] text-stone-500">本店已选商品 {money(selectedSub)} · 快递费 {selectedSub >= shop.freeFreightAt ? money(0) : money(shop.freight)}</div></section>; })}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4"><div><div className="text-[10px] text-stone-400">已选商品合计</div><div className="mt-1 text-[21px] font-black text-rose-600">{money(selectedSubtotal + selectedShipping)}</div><div className="mt-0.5 text-[10px] text-stone-400">商品 {money(selectedSubtotal)} + 快递 {money(selectedShipping)}</div></div><button disabled={!selectedCart.length} onClick={() => { setAddressDraft(state.address); setShowCheckout(true); }} className="rounded-full bg-stone-900 px-6 py-3.5 text-[12px] font-bold text-white disabled:bg-stone-300">去结算（{selectedCart.reduce((s, item) => s + item.quantity, 0)}）</button></div>
        </>}
      </div>}

      {tab === 'orders' && <div className="mx-auto max-w-3xl px-4 pb-5 pt-5">
        <div className="flex items-center justify-between"><div><h2 className="text-[20px] font-black">我的快递订单</h2><p className="mt-1 text-[11px] text-stone-400">商城订单与外卖订单分开记录</p></div><Package size={27} className="text-amber-600"/></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{(['全部', '待发货', '运输中', '已完成'] as const).map(filter => <button key={filter} onClick={() => setOrderFilter(filter)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold ${filter === orderFilter ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 ring-1 ring-stone-100'}`}>{filter}</button>)}</div>
        {filteredOrders.length ? <div className="mt-3 space-y-3">{filteredOrders.map(order => <OrderCard key={order.id} order={order} expanded={expandedOrder === order.id} onToggle={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)} onCancel={() => { commerce.cancelOrder(order.id); notify('订单已取消'); }} onShare={() => openCharacterPicker('share-order', order)} onUnbox={() => { void handleUnboxGift(order); }} />)}</div> : <div className="mt-8 rounded-[26px] bg-white px-6 py-12 text-center"><div className="text-[54px]">📦</div><div className="mt-3 text-[15px] font-bold">还没有快递订单</div><p className="mt-1 text-[11px] text-stone-400">下单后，这里会显示发货、运输和签收进度。</p><button onClick={() => setTab('home')} className="mt-5 rounded-full bg-stone-900 px-5 py-3 text-[12px] font-bold text-white">去逛商城</button></div>}
        <div className="mt-4 flex gap-2 rounded-2xl bg-amber-50 p-3 text-[10px] leading-5 text-amber-800"><Truck size={15} className="mt-0.5 shrink-0"/><span>快递订单与外卖订单分开记录。物流节点会根据预计时效自动更新，不需要手动推进。</span></div>
      </div>}

      {tab === 'me' && <div className="mx-auto max-w-3xl px-4 pb-5 pt-5"><h2 className="text-[20px] font-black">我的糯米</h2><p className="mt-1 text-[11px] text-stone-400">收货信息、收藏和订单都在这里</p>
        <div className="mt-4 rounded-[26px] bg-gradient-to-br from-[#6e4b3a] to-[#b18a6a] p-5 text-white"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl">🐻</div><div><div className="text-[15px] font-bold">糯米生活家</div><div className="mt-1 text-[10px] text-white/70">认真生活，也认真挑选</div></div></div><div className="mt-5 grid grid-cols-3 gap-3"><div><div className="text-[20px] font-black">{parcelOrders.length}</div><div className="mt-1 text-[10px] text-white/70">快递订单</div></div><div><div className="text-[20px] font-black">{state.favorites.length}</div><div className="mt-1 text-[10px] text-white/70">收藏好物</div></div><div><div className="text-[20px] font-black">{cart.reduce((s, item) => s + item.quantity, 0)}</div><div className="mt-1 text-[10px] text-white/70">购物车件数</div></div></div></div>
        <button onClick={() => setShowAddress(true)} className="mt-4 flex w-full items-center gap-3 rounded-[20px] border border-stone-100 bg-white p-4 text-left"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><MapPin size={20}/></div><div className="min-w-0 flex-1"><div className="text-[12px] font-bold">收货地址</div><div className="mt-1 truncate text-[10px] text-stone-400">{state.address.recipient} · {state.address.address} {state.address.detail}</div></div><CaretRight size={16} className="text-stone-300"/></button>
        <button onClick={() => setTab('orders')} className="mt-2 flex w-full items-center gap-3 rounded-[20px] border border-stone-100 bg-white p-4 text-left"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Receipt size={20}/></div><div className="flex-1"><div className="text-[12px] font-bold">全部快递订单</div><div className="mt-1 text-[10px] text-stone-400">物流动态、订单明细与签收记录</div></div><CaretRight size={16} className="text-stone-300"/></button>
        <div className="mt-4 rounded-2xl bg-white p-4"><div className="flex items-center gap-2 text-[12px] font-bold"><ShieldIcon/> 糯米购物</div><p className="mt-2 text-[10px] leading-5 text-stone-400">商品来自不同店铺，结算后各店分别发货。你也可以把商品、订单或礼物分享给角色，在聊天里一起挑选、送礼或邀请 TA 代付。</p></div>
      </div>}
    </main>

    <nav className="z-20 grid shrink-0 grid-cols-4 border-t border-stone-200/70 bg-white/95 px-2 pb-2 pt-2 backdrop-blur-xl">{([{id:'home',label:'逛商城',icon:ShoppingBag},{id:'cart',label:'购物车',icon:ShoppingCart},{id:'orders',label:'快递订单',icon:Package},{id:'me',label:'我的',icon:Heart}] as const).map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`relative flex flex-col items-center gap-1 py-1 ${tab === item.id ? 'text-stone-900' : 'text-stone-400'}`}><Icon size={20} weight={tab === item.id ? 'fill' : 'regular'}/><span className="text-[9px] font-semibold">{item.label}</span>{item.id === 'cart' && cart.length > 0 && <span className="absolute left-[calc(50%+7px)] top-0 h-1.5 w-1.5 rounded-full bg-rose-500"/>}<span className={`mt-0.5 h-0.5 w-4 rounded-full ${tab === item.id ? 'bg-amber-600' : 'bg-transparent'}`}/></button>; })}</nav>

    {selectedProduct && <div className="absolute inset-0 z-40 flex items-end justify-center bg-stone-900/45 p-3 backdrop-blur-[2px]" onClick={() => setSelectedProduct(null)}><div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className={`relative flex h-[190px] items-center justify-center bg-gradient-to-br ${selectedProduct.gradient}`}><span className="text-[94px]">{selectedProduct.emoji}</span><button onClick={() => setSelectedProduct(null)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/75"><X size={17}/></button></div>
      <div className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-[17px] font-black">{selectedProduct.name}</div><div className="mt-1 text-[10px] text-stone-400">{PRODUCT_SHOPS.find(shop => shop.id === selectedProduct.shopId)?.name}</div></div><div className="text-right"><div className="text-[20px] font-black text-rose-600">{money(selectedProduct.price)}</div><div className="text-[10px] text-stone-300 line-through">{money(selectedProduct.originalPrice)}</div></div></div><p className="mt-3 text-[11px] leading-5 text-stone-500">{selectedProduct.description}</p>
        <div className="mt-4"><div className="mb-2 text-[11px] font-bold">选择规格</div><div className="flex flex-wrap gap-2">{selectedProduct.variants.map(item => <button key={item} onClick={() => setVariant(item)} className={`rounded-full px-3.5 py-2 text-[11px] font-semibold ${variant === item ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'}`}>{item}</button>)}</div></div>
        <div className="mt-4 flex items-center justify-between"><div><div className="text-[11px] font-bold">购买数量</div><div className="mt-1 text-[10px] text-stone-400">快递配送 · 订单可追踪</div></div><div className="flex items-center gap-3"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100"><Minus size={14}/></button><span className="min-w-4 text-center text-[12px] font-bold">{quantity}</span><button onClick={() => setQuantity(Math.min(99, quantity + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100"><Plus size={14}/></button></div></div>
        <button onClick={addProductToCart} className="mt-5 w-full rounded-2xl bg-stone-900 py-4 text-[13px] font-bold text-white">加入购物车 · {money(selectedProduct.price * quantity)}</button>
        <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => openCharacterPicker('share-product')} className="rounded-2xl border border-amber-200 bg-amber-50 py-3 text-[11px] font-bold text-amber-800">分享给 TA</button><button onClick={() => openCharacterPicker('gift-product')} className="rounded-2xl border border-rose-200 bg-rose-50 py-3 text-[11px] font-bold text-rose-700">直接送给 TA</button></div>
      </div>
    </div></div>}

    {showCheckout && <div className="absolute inset-0 z-40 flex items-end justify-center bg-stone-900/45 p-3 backdrop-blur-[2px]" onClick={() => setShowCheckout(false)}><div className="w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between"><h3 className="text-[16px] font-black">确认订单</h3><button onClick={() => setShowCheckout(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100"><X size={16}/></button></div>
      <button onClick={() => setShowAddress(true)} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-stone-50 p-3 text-left"><MapPin size={20} className="text-amber-600"/><div className="min-w-0 flex-1"><div className="text-[12px] font-bold">{addressDraft.recipient}　{addressDraft.phone}</div><div className="mt-1 text-[11px] text-stone-500">{addressDraft.address} {addressDraft.detail}</div></div><CaretRight size={15} className="text-stone-300"/></button>
      <div className="mt-4 max-h-36 space-y-2 overflow-y-auto">{selectedCart.map(item => <div key={item.id} className="flex items-center gap-2 text-[11px]"><span>{item.emoji}</span><span className="min-w-0 flex-1 truncate text-stone-600">{item.name} ×{item.quantity}</span><span className="font-semibold">{money(item.price * item.quantity)}</span></div>)}</div>
      <label className="mt-4 block"><span className="mb-1.5 block text-[11px] font-semibold text-stone-500">订单备注（选填）</span><textarea value={orderNote} onChange={event => setOrderNote(event.target.value)} rows={2} placeholder="例如：包装仔细一些" className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 p-3 text-[11px] outline-none focus:border-amber-400"/></label>
      <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">不同店铺会分别打包寄出，预计 2–4 天送达；订单进度会随时间自动更新。</div>
      <button onClick={() => openCharacterPicker('pay-order')} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-violet-50 px-3 py-3 text-left"><span><span className="block text-[11px] font-bold text-violet-800">{payerCharacter ? `由 ${payerCharacter.name} 帮忙代付` : '请 TA 帮忙代付'}</span><span className="mt-1 block text-[10px] text-violet-500">会把申请发到 TA 的聊天，等 TA 亲自回复</span></span><CaretRight size={15} className="text-violet-400"/></button>
      <div className="mt-4 flex items-center justify-between"><div><div className="text-[10px] text-stone-400">订单金额</div><div className="mt-1 text-[21px] font-black text-rose-600">{money(selectedSubtotal + selectedShipping)}</div></div><button onClick={placeOrder} className="rounded-full bg-stone-900 px-6 py-3.5 text-[12px] font-bold text-white">{payerCharacter ? '发送代付申请' : '确认下单'}</button></div>
    </div></div>}
    {showAddress && <AddressModal address={showCheckout ? addressDraft : state.address} onClose={() => setShowAddress(false)} onSave={next => { setAddressDraft(next); commerce.setAddress(next); notify('收货地址已保存'); }} />}
    {characterPickerAction && <CommerceCharacterPicker characters={characters} title={characterPickerAction === 'shop-together' ? '邀请 TA 一起逛商城' : characterPickerAction === 'share-product' ? '把商品分享给谁？' : characterPickerAction === 'gift-product' ? '这份礼物送给谁？' : characterPickerAction === 'share-order' ? '把订单分享给谁？' : '请谁帮忙代付？'} description={characterPickerAction === 'pay-order' ? 'TA 会收到一张代付申请卡，可以在聊天里答应或拒绝。' : undefined} onClose={() => setCharacterPickerAction(null)} onChoose={character => { void handleCharacterChoice(character); }} />}
    {toast && <div className="absolute bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-stone-900/95 px-4 py-2.5 text-[11px] font-semibold text-white shadow-xl">{toast}</div>}
  </div>;
};

const ShieldIcon: React.FC = () => <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-[11px] text-emerald-700">✓</span>;
export default NuomiShopApp;
