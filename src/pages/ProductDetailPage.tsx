import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchPackages,
  formatPrice,
  formatDataVolume,
  formatDuration,
  getLocationDisplay,
  getMaxNetworkType,
  getPricePerGB,
  getCountryCount,
  isGlobalPlan,
  isRegionalPlan,
} from "../lib/api";
import { useCart } from "../context/CartContext";
import type { EsimPackage } from "../types";
import {
  Wifi, Globe, Clock, ShoppingCart, Check, ArrowLeft,
  ChevronDown, ChevronUp, Loader2, Zap, Signal,
  RefreshCw, Shield
} from "lucide-react";

export default function ProductDetailPage() {
  const { packageCode } = useParams<{ packageCode: string }>();
  const navigate = useNavigate();
  const { items, addItem, removeItem } = useCart();
  const [pkg, setPkg] = useState<EsimPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverageOpen, setCoverageOpen] = useState(false);

  useEffect(() => {
    if (!packageCode) return;
    loadPackage();
  }, [packageCode]);

  async function loadPackage() {
    setLoading(true);
    try {
      const all = await fetchPackages();
      const found = (all as EsimPackage[]).find((p) => p.packageCode === packageCode);
      if (found) setPkg(found);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Product not found</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-sky-500 text-white text-sm rounded-xl hover:bg-sky-600">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const inCart = items.some((i) => i.packageCode === pkg.packageCode);
  const retailPrice = pkg.retailPrice > 0 ? pkg.retailPrice : pkg.price;
  const dataStr = formatDataVolume(pkg.volume);
  const durationStr = formatDuration(pkg.duration, pkg.durationUnit);
  const locationDisplay = getLocationDisplay(pkg);
  const networkType = getMaxNetworkType(pkg);
  const pricePerGB = getPricePerGB(pkg);
  const countryCount = getCountryCount(pkg);
  const isGlobal = isGlobalPlan(pkg);
  const isRegional = isRegionalPlan(pkg);
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-6 h-6 text-sky-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isGlobal && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Global</span>}
                    {isRegional && !isGlobal && <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Regional</span>}
                    {networkType && <span className="text-xs font-medium text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded">{networkType}</span>}
                  </div>
                  <h1 className="text-xl font-bold text-slate-800">{pkg.name}</h1>
                  <p className="text-sm text-slate-500 mt-1">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />
                    {locationDisplay}
                  </p>
                </div>
              </div>

              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Wifi className="w-5 h-5 text-sky-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{dataStr}</p>
                  <p className="text-xs text-slate-500">Data</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-sky-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{durationStr}</p>
                  <p className="text-xs text-slate-500">Validity</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Signal className="w-5 h-5 text-sky-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{networkType}</p>
                  <p className="text-xs text-slate-500">Network</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Globe className="w-5 h-5 text-sky-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-slate-800">{countryCount}</p>
                  <p className="text-xs text-slate-500">Countries</p>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">Technical Specifications</h2>
              <div className="divide-y divide-slate-100">
                <SpecRow label="Package Code" value={pkg.packageCode} mono />
                <SpecRow label="Slug" value={pkg.slug} mono />
                <SpecRow label="Speed" value={pkg.speed || "Standard"} />
                <SpecRow label="FUP Policy" value={pkg.fupPolicy || "N/A"} />
                <SpecRow label="IP Export" value={pkg.ipExport || "N/A"} />
                <SpecRow label="Data Type" value={pkg.dataType === 0 ? "Standard" : pkg.dataType?.toString() || "N/A"} />
                <SpecRow label="SMS Status" value={pkg.smsStatus === 0 ? "Not supported" : "Supported"} />
                <SpecRow label="Support Top-Up" value={pkg.supportTopUpType === 2 ? "Yes" : "No"} />
                <SpecRow label="Activation Type" value={pkg.activeType === 1 ? "Auto" : `Type ${pkg.activeType}`} />
                <SpecRow label="Unused Valid Time" value={pkg.unusedValidTime ? `${pkg.unusedValidTime} days` : "N/A"} />
                <SpecRow label="Price per GB" value={pricePerGB > 0 ? `$${pricePerGB.toFixed(2)}/GB` : "N/A"} />
              </div>
            </div>

            {/* Coverage & Networks */}
            {pkg.locationNetworkList && pkg.locationNetworkList.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <button
                  onClick={() => setCoverageOpen(!coverageOpen)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-sm font-semibold text-slate-800">
                    Coverage & Networks ({pkg.locationNetworkList.length} locations)
                  </h2>
                  {coverageOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {coverageOpen && (
                  <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                    {pkg.locationNetworkList.map((loc) => (
                      <div key={loc.locationCode} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{loc.locationName}</span>
                          <span className="text-xs text-slate-400 font-mono">{loc.locationCode}</span>
                        </div>
                        {loc.operatorList && loc.operatorList.length > 0 && (
                          <div className="space-y-1">
                            {loc.operatorList.map((op, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">{op.operatorName}</span>
                                <div className="flex gap-1">
                                  {op.networkTypeList.map((t) => (
                                    <span
                                      key={t}
                                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                        t === "5G"
                                          ? "bg-emerald-50 text-emerald-600"
                                          : t === "LTE" || t === "4G"
                                          ? "bg-sky-50 text-sky-600"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: Price + Buy */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
              <p className="text-3xl font-bold text-slate-800 mb-1">{formatPrice(retailPrice)}</p>
              {pricePerGB > 0 && (
                <p className="text-sm text-slate-400 mb-4">${pricePerGB.toFixed(2)} per GB</p>
              )}

              <button
                onClick={() =>
                  inCart
                    ? removeItem(pkg.packageCode)
                    : addItem({
                        packageCode: pkg.packageCode,
                        packageName: pkg.name,
                        country: locationDisplay,
                        dataAmount: dataStr,
                        validity: durationStr,
                        price: retailPrice,
                      })
                }
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-3 ${
                  inCart
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                    : "bg-sky-500 text-white hover:bg-sky-600 shadow-sm"
                }`}
              >
                {inCart ? (
                  <><Check className="w-4 h-4" /> Added to Cart</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
                )}
              </button>

              <Link
                to="/cart"
                className="block w-full text-center px-4 py-2.5 text-sm font-medium text-sky-600 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors"
              >
                View Cart
              </Link>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Zap className="w-3.5 h-3.5 text-sky-500" />
                  <span>Instant delivery via email</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  <span>Secure Stripe checkout</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 text-sky-500" />
                  <span>Top-up available: {pkg.supportTopUpType === 2 ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm text-slate-800 ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
