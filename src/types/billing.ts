export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  sort_order: number;
  active: boolean;
  features: string[];
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  started_at: string;
  ends_at: string | null;
  auto_renew: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  name: string | null;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface SubscriptionOrder {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_name: string | null;
  amount: number | null;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referee_id: string | null;
  code: string | null;
  reward_status: string;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
}