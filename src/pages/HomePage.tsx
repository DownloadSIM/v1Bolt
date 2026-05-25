import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Globe, Wifi, Zap, Shield, ChevronDown, ChevronUp, X, Loader2, MapPin, GitCompare, ShoppingCart, Check, Clock, Signal, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import PackageCard from "../components/PackageCard";
import {
  fetchPackages,
  formatPrice,
  formatDataVolume,
  formatDuration,
  getPricePerGB,
  extractCountries,
  filterPackages,
  sortPackagesDefault,
  getLocationDisplay,
  getMaxNetworkType,
  getCountryCount,
  isGlobalPlan,
  isRegionalPlan,
} from "../lib/api";
import type { EsimPackage } from "../types";
import { useCart } from "../context/CartContext";

export default function HomePage() {
  const [packages, setPackages] = useState<EsimPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("default");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [comparedCodes, setComparedCodes] = useState<string[]>([]);
  const [heroVisible, setHeroVisible] = useState(true);
  const [detailPkg, setDetailPkg] = useState<EsimPackage | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { items, addItem, removeItem } = useCart();

  useEffect(() => { loadPackages(); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (detailPkg || showCompare) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [detailPkg, showCompare]);

  async function loadPackages() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load eSIM packages. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const countries = useMemo(() => extractCountries(packages), [packages]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, countrySearch]);

  const hasSelection = selectedCountries.length > 0 || selectedRegions.length > 0;

  const filtered = useMemo(() => {
    const result = filterPackages(packages, selectedCountries, selectedRegions, "");
    const getRetailPrice = (p: EsimPackage) => p.retailPrice > 0 ? p.retailPrice : p.price;
    if (sortBy === "default") return sortPackagesDefault(result);
    const sorted = [...result];
    if (sortBy === "price-low") sorted.sort((a, b) => getRetailPrice(a) - getRetailPrice(b));
    else if (sortBy === "price-high") sorted.sort((a, b) => getRetailPrice(b) - getRetailPrice(a));
    else if (sortBy === "price-per-gb-low") sorted.sort((a, b) => getPricePerGB(a) - getPricePerGB(b));
    else if (sortBy === "price-per-gb-high") sorted.sort((a, b) => getPricePerGB(b) - getPricePerGB(a));
    else if (sortBy === "data") sorted.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    else if (sortBy === "duration") sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return sorted;
  }, [packages, selectedCountries, selectedRegions, sortBy]);

  const comparedPackages = useMemo(
    () => packages.filter((p) => comparedCodes.includes(p.packageCode)),
    [packages, comparedCodes]
  );

  function toggleCountry(code: string) {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }
  function removeCountry(code: string) {
    setSelectedCountries((prev) => prev.filter((c) => c !== code));
  }
  function toggleRegion(region: string) {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }
  function clearAll() {
    setSelectedCountries([]);
    setSelectedRegions([]);
    setCountrySearch("");
  }
  function toggleCompare(code: string) {
    setComparedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }
  function getCountryName(code: string): string {
    return countries.find((c) => c.code === code)?.name || code;
  }

  // ---- Product Detail Modal ----
  function renderDetailModal() {
    if (!detailPkg) return null;
    const pkg = detailPkg;
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
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8"
        onClick={() => setDetailPkg(null)}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setDetailPkg(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
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
                      <h2 className="text-xl font-bold text-slate-800">{pkg.name}</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        <Globe className="w-3.5 h-3.5 inline mr-1" />
                        {locationDisplay}
                      </p>
                    </div>
                  </div>

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
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">Technical Specifications</h3>
                  <div className="divide-y divide-slate-100">
                    <SpecRow label="Package Code" value={pkg.packageCode} mono />
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
                  <div>
                    <button
                      onClick={() => setCoverageOpen(!coverageOpen)}
                      className="w-full flex items-center justify-between"
                    >
                      <h3 className="text-sm font-semibold text-slate-800">
                        Coverage & Networks ({pkg.locationNetworkList.length} locations)
                      </h3>
                      {coverageOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {coverageOpen && (
                      <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
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
                                      {op.networkTypeList && Array.isArray(op.networkTypeList) && op.networkTypeList.map((t) => (
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
                <div className="bg-slate-50 rounded-2xl p-6">
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

                  <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
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
      </div>
    );
  }

  // ---- Compare Modal ----
  const [compareCoverageOpen, setCompareCoverageOpen] = useState<Record<string, boolean>>({});

  function renderCompareModal() {
    if (!showCompare || comparedPackages.length < 2) return null;

    const specRows: { label: string; getValue: (p: EsimPackage) => string }[] = [
      { label: "Price", getValue: (p) => formatPrice(p.retailPrice > 0 ? p.retailPrice : p.price) },
      { label: "Price per GB", getValue: (p) => { const pp = getPricePerGB(p); return pp > 0 ? `$${pp.toFixed(2)}` : "N/A"; } },
      { label: "Data", getValue: (p) => formatDataVolume(p.volume) },
      { label: "Duration", getValue: (p) => formatDuration(p.duration, p.durationUnit) },
      { label: "Network", getValue: (p) => getMaxNetworkType(p) },
      { label: "Speed", getValue: (p) => p.speed || "Standard" },
      { label: "Top-Up", getValue: (p) => p.supportTopUpType === 2 ? "Yes" : "No" },
      { label: "Activation", getValue: (p) => p.activeType === 1 ? "Auto" : `Type ${p.activeType}` },
      { label: "FUP Policy", getValue: (p) => p.fupPolicy || "N/A" },
      { label: "IP Export", getValue: (p) => p.ipExport || "N/A" },
      { label: "SMS", getValue: (p) => p.smsStatus === 0 ? "No" : "Yes" },
      { label: "Package Code", getValue: (p) => p.packageCode },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8"
        onClick={() => setShowCompare(false)}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowCompare(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Comparing {comparedPackages.length} Plans
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="p-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-32">
                      Specification
                    </th>
                    {comparedPackages.map((pkg) => (
                      <th key={pkg.packageCode} className="p-3 text-center relative">
                        <button
                          onClick={() => {
                            const next = comparedCodes.filter((c) => c !== pkg.packageCode);
                            setComparedCodes(next);
                            if (next.length < 2) setShowCompare(false);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="text-sm font-semibold text-slate-800 mb-1">{pkg.name}</div>
                        <div className="text-xs text-slate-400">{getLocationDisplay(pkg)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specRows.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                      <td className="p-3 text-sm font-medium text-slate-600 border-r border-slate-100">
                        {row.label}
                      </td>
                      {comparedPackages.map((pkg) => (
                        <td key={pkg.packageCode} className="p-3 text-sm text-slate-700 text-center">
                          {row.getValue(pkg)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Countries row - expandable */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 text-sm font-medium text-slate-600 border-r border-slate-100">
                      Countries
                    </td>
                    {comparedPackages.map((pkg) => {
                      const key = pkg.packageCode;
                      const isOpen = compareCoverageOpen[key] ?? false;
                      const count = getCountryCount(pkg);
                      return (
                        <td key={key} className="p-3 text-center">
                          <button
                            onClick={() => setCompareCoverageOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors"
                          >
                            {count} {count === 1 ? "country" : "countries"}
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {isOpen && pkg.locationNetworkList && (
                            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto text-left">
                              {pkg.locationNetworkList.map((loc) => (
                                <div key={loc.locationCode} className="bg-slate-50 rounded-lg p-2">
                                  <div className="text-xs font-medium text-slate-700">{loc.locationName}</div>
                                  {loc.operatorList && loc.operatorList.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {loc.operatorList.map((op, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                          <span className="text-slate-500">{op.operatorName}</span>
                                          <div className="flex gap-1">
                                            {op.networkTypeList && Array.isArray(op.networkTypeList) && op.networkTypeList.map((t) => (
                                              <span
                                                key={t}
                                                className={`px-1 py-0.5 rounded text-xs font-medium ${
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
                        </td>
                      );
                    })}
                  </tr>

                  <tr className="border-t border-slate-200">
                    <td className="p-3 text-sm font-medium text-slate-600 border-r border-slate-100">Action</td>
                    {comparedPackages.map((pkg) => {
                      const inCart = items.some((i) => i.packageCode === pkg.packageCode);
                      const retailPrice = pkg.retailPrice > 0 ? pkg.retailPrice : pkg.price;
                      return (
                        <td key={pkg.packageCode} className="p-3 text-center">
                          <button
                            onClick={() =>
                              inCart
                                ? removeItem(pkg.packageCode)
                                : addItem({
                                    packageCode: pkg.packageCode,
                                    packageName: pkg.name,
                                    country: getLocationDisplay(pkg),
                                    dataAmount: formatDataVolume(pkg.volume),
                                    validity: formatDuration(pkg.duration, pkg.durationUnit),
                                    price: retailPrice,
                                  })
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              inCart
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-sky-500 text-white hover:bg-sky-600"
                            }`}
                          >
                            {inCart ? <><Check className="w-3 h-3" /> In Cart</> : <><ShoppingCart className="w-3 h-3" /> Add</>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 text-sky-300 text-xs font-medium rounded-full mb-6">
              <Zap className="w-3 h-3" />
              Instant eSIM Delivery
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Stay Connected
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                Anywhere in the World
              </span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg">
              Get instant access to mobile data in 100+ countries. No physical SIM, no roaming fees.
              Scan, connect, go.
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-sky-400" />
                <span>100+ Countries</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <span>Instant Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                <span>Secure Payments</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Filter Bar */}
      <div className={`sticky top-0 z-40 transition-shadow duration-300 ${!heroVisible ? "shadow-lg" : ""}`}>
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col gap-3">
              {/* Row 1: Country multi-select + Sort */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1" ref={dropdownRef}>
                  <div
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    className="w-full min-h-[38px] flex items-center flex-wrap gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm cursor-pointer focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-400 transition-all"
                  >
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {selectedCountries.length === 0 ? (
                      <span className="text-slate-400">Select travel destinations...</span>
                    ) : (
                      selectedCountries.map((code) => (
                        <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md text-xs font-medium">
                          {getCountryName(code)}
                          <button onClick={(e) => { e.stopPropagation(); removeCountry(code); }} className="hover:text-sky-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                    {selectedCountries.length > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedCountries([]); }} className="ml-auto text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {countryDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-hidden">
                      <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search countries..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-48 p-1">
                        {filteredCountries.length === 0 ? (
                          <p className="text-xs text-slate-400 p-2 text-center">No countries found</p>
                        ) : (
                          filteredCountries.map((c) => (
                            <label key={c.code} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={selectedCountries.includes(c.code)}
                                onChange={() => toggleCountry(c.code)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                              />
                              <span className="text-slate-700">{c.name}</span>
                              <span className="text-slate-400 ml-auto">{c.code}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 pr-8"
                  >
                    <option value="default">Default Sort</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="price-per-gb-low">Price/GB: Low to High</option>
                    <option value="price-per-gb-high">Price/GB: High to Low</option>
                    <option value="data">Most Data</option>
                    <option value="duration">Longest Duration</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Row 2: Region checkboxes + Search + Clear */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedRegions.includes("global")} onChange={() => toggleRegion("global")} className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400" />
                    <span className="text-sm text-slate-700 font-medium">Global Plans</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedRegions.includes("regional")} onChange={() => toggleRegion("regional")} className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400" />
                    <span className="text-sm text-slate-700 font-medium">Regional Plans</span>
                  </label>
                </div>

                {hasSelection && (
                  <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                    <X className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Package Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading eSIM packages...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={loadPackages} className="px-4 py-2 bg-sky-500 text-white text-sm rounded-xl hover:bg-sky-600 transition-colors">
              Retry
            </button>
          </div>
        ) : !hasSelection ? (
          <div className="text-center py-20">
            <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Please select your travel destinations</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Choose one or more countries above, or select Global/Regional plans to browse available eSIM options.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">
              No packages match your selection. Try different filters.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500">
                Showing {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
              </p>
              {comparedCodes.length >= 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors shadow-sm"
                >
                  <GitCompare className="w-4 h-4" />
                  Compare {comparedCodes.length} Plans
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((pkg) => (
                <PackageCard
                  key={pkg.packageCode}
                  pkg={pkg}
                  showCompare
                  compared={comparedCodes.includes(pkg.packageCode)}
                  onToggleCompare={() => toggleCompare(pkg.packageCode)}
                  onViewDetail={() => { setCoverageOpen(false); setDetailPkg(pkg); }}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modals */}
      {renderDetailModal()}
      {renderCompareModal()}
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
