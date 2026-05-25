export interface LocationNetwork {
  locationCode: string;
  locationName: string;
  operatorList?: {
    operatorName: string;
    networkTypeList: string[];
  }[];
}

export interface EsimPackage {
  packageCode: string;
  slug: string;
  name: string;
  price: number;
  retailPrice: number;
  currencyCode: string;
  volume: number;
  duration: number;
  durationUnit: string;
  location: string;
  speed: string;
  supportTopUpType: number;
  activeType: number;
  fupPolicy?: string;
  ipExport?: string;
  unusedValidTime?: number;
  dataType?: number;
  smsStatus?: number;
  locationNetworkList?: LocationNetwork[];
}

export interface Order {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "provisioning" | "delivered" | "failed" | "cancelled";
  email_verified: boolean;
  esim_order_no: string | null;
  esim_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  package_code: string;
  package_name: string;
  country: string;
  data_amount: string;
  validity: string;
  price: number;
  iccid: string | null;
  qr_code: string | null;
  smdp_address: string | null;
  matching_id: string | null;
  esim_status: string | null;
  created_at: string;
}

export interface CartItem {
  packageCode: string;
  packageName: string;
  country: string;
  dataAmount: string;
  validity: string;
  price: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}
