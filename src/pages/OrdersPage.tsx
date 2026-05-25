import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { formatPrice, sendVerificationCode, verifyCode, fetchGuestOrders } from "../lib/api";
import type { Order } from "../types";
import { useNavigate } from "react-router-dom";
import { Wifi, Loader2, QrCode, Copy, Clock, CheckCircle, AlertCircle, Mail, ShieldCheck, Search } from "lucide-react";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Guest lookup state
  const [guestMode, setGuestMode] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCode, setGuestCode] = useState("");
  const [guestVerified, setGuestVerified] = useState(false);
  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (!authLoading && user) {
      loadOrders();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  async function loadOrders() {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  function startResendTimer() {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendGuestCode() {
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setGuestError("Please enter a valid email address");
      return;
    }
    setGuestLoading(true);
    setGuestError("");
    try {
      const data = await sendVerificationCode(guestEmail);
      if (data.error) { setGuestError(data.error); return; }
      setCodeSent(true);
      startResendTimer();
    } catch {
      setGuestError("Failed to send code");
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleVerifyGuestCode() {
    if (!guestCode || guestCode.length !== 4) {
      setGuestError("Please enter the 4-digit code");
      return;
    }
    setGuestLoading(true);
    setGuestError("");
    try {
      const data = await verifyCode(guestEmail, guestCode);
      if (!data.success || !data.verified) {
        setGuestError(data.error || "Invalid code");
        return;
      }
      setGuestVerified(true);
      // Fetch guest orders
      const orders = await fetchGuestOrders(guestEmail);
      setGuestOrders(Array.isArray(orders) ? orders : []);
    } catch {
      setGuestError("Verification failed");
    } finally {
      setGuestLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-slate-100 text-slate-600",
      paid: "bg-sky-100 text-sky-700",
      provisioning: "bg-amber-100 text-amber-700",
      delivered: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700",
      cancelled: "bg-slate-100 text-slate-500",
    };
    const icons: Record<string, typeof Clock> = {
      pending: Clock, paid: CheckCircle, provisioning: Loader2,
      delivered: CheckCircle, failed: AlertCircle, cancelled: AlertCircle,
    };
    const Icon = icons[status] || Clock;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${styles[status] || styles.pending}`}>
        <Icon className={`w-3 h-3 ${status === "provisioning" ? "animate-spin" : ""}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function renderOrderList(orderList: Order[]) {
    return (
      <div className="space-y-6">
        {orderList.length === 0 ? (
          <div className="text-center py-16">
            <Wifi className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">No eSIMs found</h2>
            <p className="text-sm text-slate-500 mb-6">Purchase your first eSIM to get started.</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors"
            >
              Browse Plans
            </button>
          </div>
        ) : (
          orderList.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-mono mb-1">Order {order.id.slice(0, 8)}...</p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(order.status)}
                  <span className="text-sm font-bold text-slate-800">{formatPrice(order.amount)}</span>
                </div>
              </div>
              {order.order_items && order.order_items.length > 0 && (
                <div className="divide-y divide-slate-50">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Wifi className="w-5 h-5 text-sky-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-slate-800">{item.package_name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.country} &middot; {item.data_amount} &middot; {item.validity}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{formatPrice(item.price)}</span>
                      </div>
                      {item.iccid && (
                        <div className="ml-13 pl-13 space-y-2">
                          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                            <code className="text-xs text-slate-700 font-mono flex-1">{item.iccid}</code>
                            <button onClick={() => copyToClipboard(item.iccid!)} className="p-1 rounded hover:bg-slate-200 transition-colors">
                              <Copy className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                          {item.qr_code && (
                            <a href={item.qr_code} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700">
                              <QrCode className="w-3.5 h-3.5" /> View QR Code
                            </a>
                          )}
                          {item.smdp_address && (
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                              <span className="text-xs text-slate-500">SM-DP+:</span>
                              <code className="text-xs text-slate-700 font-mono flex-1 break-all">{item.smdp_address}</code>
                              <button onClick={() => copyToClipboard(item.smdp_address!)} className="p-1 rounded hover:bg-slate-200 transition-colors flex-shrink-0">
                                <Copy className="w-3 h-3 text-slate-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {!item.iccid && order.status === "provisioning" && (
                        <div className="ml-13 pl-13 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-2.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs font-medium">Provisioning in progress...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-800">My eSIMs</h1>
          {!user && !guestVerified && (
            <button
              onClick={() => setGuestMode(!guestMode)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors"
            >
              <Search className="w-4 h-4" />
              {guestMode ? "Hide Lookup" : "Find My Orders"}
            </button>
          )}
        </div>

        {/* Guest Order Lookup */}
        {guestMode && !guestVerified && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-sky-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Find your orders</h2>
              <p className="text-sm text-slate-500 mt-1">Enter the email you used during checkout to look up your eSIMs.</p>
            </div>

            {!codeSent ? (
              <div className="space-y-4">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                />
                {guestError && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{guestError}</p>}
                <button
                  onClick={handleSendGuestCode}
                  disabled={guestLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all"
                >
                  {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Verification Code"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">We sent a 4-digit code to <span className="font-medium">{guestEmail}</span></p>
                </div>
                <input
                  type="text"
                  value={guestCode}
                  onChange={(e) => setGuestCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                />
                {guestError && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{guestError}</p>}
                <button
                  onClick={handleVerifyGuestCode}
                  disabled={guestLoading || guestCode.length !== 4}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all"
                >
                  {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & View Orders"}
                </button>
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-slate-400">Resend in {resendTimer}s</p>
                  ) : (
                    <button onClick={handleSendGuestCode} className="text-xs text-sky-600 hover:text-sky-700 font-medium">Resend code</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Authenticated user orders */}
        {user && renderOrderList(orders)}

        {/* Guest orders after verification */}
        {!user && guestVerified && renderOrderList(guestOrders)}

        {/* No user, no guest mode */}
        {!user && !guestMode && !guestVerified && (
          <div className="text-center py-16">
            <Wifi className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">View your eSIMs</h2>
            <p className="text-sm text-slate-500 mb-6">Sign in or look up your orders by email.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/auth")}
                className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setGuestMode(true)}
                className="px-6 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Find My Orders
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
