import { DB } from './db';

export type NuomiCommerceCardKind = 'product' | 'order' | 'food-order' | 'pay-request' | 'gift' | 'shopping-together' | 'food-together' | 'order-update' | 'gift-arrival' | 'gift-unbox' | 'pay-receipt';

export interface NuomiCommerceCardPayload {
  kind: NuomiCommerceCardKind;
  app: '糯米商城' | '糯米外卖';
  title: string;
  detail: string;
  content: string;
  value?: string;
  status?: string;
  orderId?: string;
  paymentRequestId?: string;
  amount?: number;
  eta?: string;
  fulfillment?: 'delivery' | 'pickup';
  items?: Array<{ name: string; quantity: number; emoji?: string; variant?: string; price?: number; storeName?: string }>;
  storeName?: string;
  action?: string;
  imageEmoji?: string;
}

export const NUOMI_COMMERCE_TRIGGER_REPLY = 'nuomi-commerce-trigger-reply';

/** Store an in-universe commerce card as a message in the selected character's own conversation. */
export async function sendNuomiCommerceCardToCharacter(
  charId: string,
  payload: NuomiCommerceCardPayload,
  deliveryId: string,
  triggerReply = true,
): Promise<number> {
  const metadata = {
    phoneCard: {
      kind: 'nuomi-commerce', app: payload.app, title: payload.title, detail: payload.detail,
      value: payload.value || '', by: '你', action: payload.action || payload.kind,
      commerce: {
        kind: payload.kind, orderId: payload.orderId, paymentRequestId: payload.paymentRequestId,
        amount: payload.amount, eta: payload.eta, status: payload.status,
        fulfillment: payload.fulfillment, items: payload.items || [], storeName: payload.storeName,
        imageEmoji: payload.imageEmoji || payload.items?.[0]?.emoji || '🛍️', action: payload.action || payload.kind,
      },
    },
  };
  const id = await DB.saveMessageOnce(`nuomi-commerce:${deliveryId}`, {
    charId,
    role: 'user',
    type: 'phone_card',
    content: payload.content,
    metadata,
  });
  if (triggerReply && typeof window !== 'undefined') {
    // App switching tears down and recreates Chat. The small delay lets the selected character's
    // conversation load before we ask it to react to the just-shared card.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(NUOMI_COMMERCE_TRIGGER_REPLY, { detail: { charId, deliveryId } }));
    }, 900);
  }
  return id;
}
