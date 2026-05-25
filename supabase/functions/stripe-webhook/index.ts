import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
});

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ESIM_API_BASE = "https://api.esimaccess.com/api/v1/open";
const RT_ACCESS_CODE = Deno.env.get("ESIM_ACCESS_CODE") ?? "";

async function esimRequest(endpoint: string, body: object) {
  const bodyStr = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const requestId = crypto.randomUUID();
  const signStr = timestamp + requestId + RT_ACCESS_CODE + bodyStr;

  const keyData = new TextEncoder().encode(RT_ACCESS_CODE);
  const msgData = new TextEncoder().encode(signStr);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  const hex = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("").toLowerCase();

  const response = await fetch(`${ESIM_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "RT-AccessCode": RT_ACCESS_CODE,
      "RT-Timestamp": timestamp,
      "RT-RequestID": requestId,
      "RT-Signature": hex,
    },
    body: bodyStr,
  });
  return response.json();
}

async function supabaseFetch(table: string, method: string, query: string, body?: object) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
  if (method === "POST" || method === "PATCH") headers["Prefer"] = "return=representation";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event;
    if (STRIPE_WEBHOOK_SECRET && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Only fulfill if payment is confirmed (not unpaid for async methods)
      if (session.payment_status === "unpaid") {
        return new Response(JSON.stringify({ received: true, note: "async payment pending" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await fulfillOrder(session);
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      await fulfillOrder(session);
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      // Mark order as failed
      const sessionId = session.id;
      await supabaseFetch("orders", "PATCH", `?stripe_session_id=eq.${sessionId}`, {
        status: "failed",
      });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const sessionId = session.id;
      await supabaseFetch("orders", "PATCH", `?stripe_session_id=eq.${sessionId}`, {
        status: "cancelled",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fulfillOrder(session: any) {
  const userId = session.metadata?.userId || null;
  const guestEmail = session.metadata?.guestEmail || session.metadata?.email || "";
  const packageCodes = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
  const itemDetails = session.metadata?.itemDetails ? JSON.parse(session.metadata.itemDetails) : [];
  const amountTotal = session.amount_total ?? 0;

  // Check if order already exists (idempotency)
  const existing = await supabaseFetch("orders", "GET", `?stripe_session_id=eq.${session.id}&select=id`);
  if (existing && existing.length > 0) {
    return; // Already fulfilled
  }

  // Create order in Supabase
  const orders = await supabaseFetch("orders", "POST", "", {
    user_id: userId || null,
    guest_email: guestEmail || null,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent ?? null,
    amount: amountTotal,
    currency: session.currency ?? "usd",
    status: "paid",
    email_verified: true,
  });

  const order = Array.isArray(orders) ? orders[0] : orders;
  if (!order?.id) {
    console.error("Failed to create order:", JSON.stringify(orders));
    return;
  }

  // Order eSIMs from eSIMAccess API
  const transactionId = `order_${order.id}_${Date.now()}`;
  const packageInfoList = packageCodes.map((code: string) => ({
    packageCode: code,
    count: 1,
  }));

  let esimOrderNo = null;
  try {
    const esimData = await esimRequest("/esim/order", {
      transactionId,
      packageInfoList,
    });
    if (esimData.success !== false) {
      esimOrderNo = esimData.obj?.orderNo ?? esimData.orderNo ?? null;
    }
  } catch (e) {
    console.error("eSIM order failed:", e.message);
  }

  // Update order with eSIM order number
  await supabaseFetch("orders", "PATCH", `?id=eq.${order.id}`, {
    esim_order_no: esimOrderNo,
    esim_transaction_id: transactionId,
    status: esimOrderNo ? "provisioning" : "paid",
  });

  // Create order items from the detailed metadata
  const orderItems = itemDetails.map((item: {
    packageCode: string;
    packageName: string;
    country: string;
    dataAmount: string;
    validity: string;
    price: number;
  }) => ({
    order_id: order.id,
    package_code: item.packageCode,
    package_name: item.packageName,
    country: item.country,
    data_amount: item.dataAmount,
    validity: item.validity,
    price: item.price,
  }));

  if (orderItems.length > 0) {
    await supabaseFetch("order_items", "POST", "", orderItems);
  }
}
