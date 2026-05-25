import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const guestEmail = url.searchParams.get("email");

    // Route: GET by session_id (post-checkout)
    if (sessionId) {
      const orders = await supabaseFetch("orders", "GET", `?stripe_session_id=eq.${sessionId}&select=*,order_items(*)`);

      if (!orders.length) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const order = orders[0];
      await updateEsimDetails(order);
      return new Response(JSON.stringify(order), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET by guest email (guest order lookup)
    if (guestEmail) {
      const orders = await supabaseFetch("orders", "GET", `?guest_email=eq.${encodeURIComponent(guestEmail)}&select=*,order_items(*)&order=created_at.desc`);

      // Update eSIM details for each order
      for (const order of orders) {
        await updateEsimDetails(order);
      }

      return new Response(JSON.stringify(orders), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Missing session_id or email parameter" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateEsimDetails(order: any) {
  if (!order.esim_order_no || !order.order_items?.length) return;

  const needsUpdate = order.order_items.some((item: any) => !item.iccid);
  if (!needsUpdate) return;

  try {
    const esimData = await esimRequest("/esim/query", { orderNo: order.esim_order_no });

    if (esimData.success !== false && esimData.obj?.esimList?.length) {
      for (const esim of esimData.obj.esimList) {
        const matchingItem = order.order_items.find(
          (item: any) => item.package_code === esim.packageList?.[0]?.packageCode
        );
        if (matchingItem && esim.iccid) {
          await supabaseFetch("order_items", "PATCH", `?id=eq.${matchingItem.id}`, {
            iccid: esim.iccid ?? null,
            qr_code: esim.qrCodeUrl ?? esim.qrCode ?? null,
            smdp_address: esim.smdpAddress ?? null,
            matching_id: esim.matchingId ?? esim.ac ?? null,
            esim_status: esim.esimStatus ?? null,
          });
          matchingItem.iccid = esim.iccid;
          matchingItem.qr_code = esim.qrCodeUrl ?? esim.qrCode;
          matchingItem.smdp_address = esim.smdpAddress;
          matchingItem.matching_id = esim.matchingId ?? esim.ac;
          matchingItem.esim_status = esim.esimStatus;
        }
      }

      const allProvisioned = order.order_items.every((item: any) => item.iccid);
      if (allProvisioned) {
        await supabaseFetch("orders", "PATCH", `?id=eq.${order.id}`, { status: "delivered" });
        order.status = "delivered";
      }
    }
  } catch (e) {
    console.error("eSIM query failed:", e.message);
  }
}
