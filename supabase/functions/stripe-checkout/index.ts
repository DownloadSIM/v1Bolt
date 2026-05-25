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

const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { items, userId, email, guestEmail } = await req.json();

    // Support both authenticated and guest checkout
    const customerEmail = email || guestEmail;
    if (!items || !items.length) {
      return new Response(
        JSON.stringify({ error: "Missing required field: items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId && !guestEmail) {
      return new Response(
        JSON.stringify({ error: "Either userId or guestEmail is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lineItems = items.map((item: {
      packageName: string;
      country: string;
      dataAmount: string;
      validity: string;
      price: number;
    }) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.packageName,
          description: `${item.country} | ${item.dataAmount} | ${item.validity}`,
        },
        unit_amount: item.price,
      },
      quantity: 1,
    }));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${APP_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/order/cancel`,
      metadata: {
        userId: userId || "",
        guestEmail: guestEmail || "",
        email: customerEmail || "",
        items: JSON.stringify(items.map((i: { packageCode: string }) => i.packageCode)),
        itemDetails: JSON.stringify(items.map((i: {
          packageCode: string;
          packageName: string;
          country: string;
          dataAmount: string;
          validity: string;
          price: number;
        }) => ({
          packageCode: i.packageCode,
          packageName: i.packageName,
          country: i.country,
          dataAmount: i.dataAmount,
          validity: i.validity,
          price: i.price,
        }))),
      },
    };

    // Pre-fill customer email on checkout page
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
