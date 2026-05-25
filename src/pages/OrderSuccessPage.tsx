import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchOrderStatus, formatPrice } from "../lib/api";
import type { Order } from "../types";
import { CheckCircle, Loader2, Wifi, Copy } from "lucide-react";

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found");
      setLoading(false);
      return;
    }
    pollOrder();
  }, [sessionId]);

  async function pollOrder() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const data = await fetchOrderStatus(sessionId!);
        if (data.id) {
          setOrder(data);
          setLoading(false);
          if (data.status === "delivered" || data.status === "provisioning") return;
        }
      } catch {
        // Continue polling
      }
      attempts++;
      await new Promise((r) => setTimeout(r, 3000));
    }
    setLoading(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-1">Processing your order</h2>
          <p className="text-sm text-slate-500">We're provisioning your eSIM. This may take a moment...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-4">{error || "Order not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-sky-500 text-white text-sm rounded-xl hover:bg-sky-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful</h1>
          <p className="text-slate-500 text-sm">
            {order.status === "delivered"
              ? "Your eSIMs are ready to install!"
              : order.status === "provisioning"
              ? "Your eSIMs are being provisioned. Check back shortly."
              : "Your order is being processed."}
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Order Summary</h2>
          </div>
          <div className="p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Order ID</span>
              <span className="text-slate-800 font-mono text-xs">{order.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Amount</span>
              <span className="text-slate-800 font-semibold">{formatPrice(order.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <span className={`font-medium ${
                order.status === "delivered" ? "text-emerald-600" :
                order.status === "provisioning" ? "text-amber-600" :
                "text-slate-600"
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* eSIM Details */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Your eSIMs</h2>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Wifi className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{item.package_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.country} &middot; {item.data_amount} &middot; {item.validity}
                      </p>
                    </div>
                  </div>

                  {item.iccid && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                          ICCID
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-slate-800 font-mono flex-1">{item.iccid}</code>
                          <button
                            onClick={() => copyToClipboard(item.iccid!)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      {item.qr_code && (
                        <div className="bg-slate-50 rounded-xl p-4">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 block">
                            QR Code
                          </label>
                          <div className="flex flex-col items-center">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-3">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(item.qr_code)}`}
                                alt="eSIM QR Code"
                                className="w-48 h-48"
                              />
                            </div>
                            <p className="text-xs text-slate-400 text-center">
                              Scan this QR code on your device to install the eSIM
                            </p>
                          </div>
                        </div>
                      )}

                      {item.smdp_address && (
                        <div className="bg-slate-50 rounded-xl p-4">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                            SM-DP+ Address
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-slate-800 font-mono flex-1 break-all">{item.smdp_address}</code>
                            <button
                              onClick={() => copyToClipboard(item.smdp_address!)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      )}

                      {item.matching_id && (
                        <div className="bg-slate-50 rounded-xl p-4">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                            Activation Code
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-slate-800 font-mono flex-1 break-all">{item.matching_id}</code>
                            <button
                              onClick={() => copyToClipboard(item.matching_id!)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!item.iccid && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs font-medium">Provisioning in progress...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/orders")}
            className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors"
          >
            View My eSIMs
          </button>
        </div>
      </div>
    </div>
  );
}
