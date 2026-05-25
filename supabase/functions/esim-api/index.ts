import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ESIM_API_BASE = "https://api.esimaccess.com/api/v1/open";
const RT_ACCESS_CODE = Deno.env.get("ESIM_ACCESS_CODE") ?? "";

function generateHeaders(body: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const requestId = crypto.randomUUID();
  const signStr = timestamp + requestId + RT_ACCESS_CODE + body;

  const key = new TextEncoder().encode(RT_ACCESS_CODE);
  const msg = new TextEncoder().encode(signStr);

  // HMAC-SHA256 using Web Crypto API
  const hmacKey = { name: "HMAC", hash: "SHA-256" } as HmacKeyGenParams;

  // We need to compute this synchronously-ish, so we'll use a different approach
  // Since Deno supports crypto.subtle, we'll compute it inline
  // But since generateHeaders is sync and crypto.subtle is async, we'll restructure below
  return {
    "Content-Type": "application/json",
    "RT-AccessCode": RT_ACCESS_CODE,
    "RT-Timestamp": timestamp,
    "RT-RequestID": requestId,
    // RT-Signature will be set after async computation
  };
}

async function generateAuthHeaders(body: string): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const requestId = crypto.randomUUID();
  const signStr = timestamp + requestId + RT_ACCESS_CODE + body;

  const keyData = new TextEncoder().encode(RT_ACCESS_CODE);
  const msgData = new TextEncoder().encode(signStr);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toLowerCase();

  return {
    "Content-Type": "application/json",
    "RT-AccessCode": RT_ACCESS_CODE,
    "RT-Timestamp": timestamp,
    "RT-RequestID": requestId,
    "RT-Signature": hex,
  };
}

async function esimRequest(endpoint: string, body: object) {
  const bodyStr = JSON.stringify(body);
  const headers = await generateAuthHeaders(bodyStr);
  const response = await fetch(`${ESIM_API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: bodyStr,
  });
  return response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname
      .replace("/esim-api", "")
      .replace("/functions/v1/esim-api", "");
    const method = req.method;

    // Route: GET /packages - List available eSIM packages
    if (path === "/packages" && method === "GET") {
      const type = url.searchParams.get("type") ?? "";
      const locationCode = url.searchParams.get("locationCode") ?? "";
      const slug = url.searchParams.get("slug") ?? "";
      const packageCode = url.searchParams.get("packageCode") ?? "";
      const iccid = url.searchParams.get("iccid") ?? "";

      const data = await esimRequest("/package/list", {
        type,
        locationCode,
        slug,
        packageCode,
        iccid,
      });

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /order - Place an eSIM order
    if (path === "/order" && method === "POST") {
      const requestBody = await req.json();
      const data = await esimRequest("/esim/order", requestBody);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /query - Query eSIM details
    if (path === "/query" && method === "POST") {
      const requestBody = await req.json();
      const data = await esimRequest("/esim/query", requestBody);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /topup - Top up an eSIM
    if (path === "/topup" && method === "POST") {
      const requestBody = await req.json();
      const data = await esimRequest("/esim/topup", requestBody);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /cancel - Cancel an eSIM
    if (path === "/cancel" && method === "POST") {
      const requestBody = await req.json();
      const data = await esimRequest("/esim/cancel", requestBody);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /usage - Query data usage
    if (path === "/usage" && method === "POST") {
      const requestBody = await req.json();
      const data = await esimRequest("/esim/usage/query", requestBody);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /balance - Check account balance
    if (path === "/balance" && method === "GET") {
      const data = await esimRequest("/balance/query", {});
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
