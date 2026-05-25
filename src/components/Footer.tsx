import { Wifi, Mail, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Wifi className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                eSIM<span className="text-sky-400">Store</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Stay connected worldwide with instant eSIM delivery. No physical SIM, no roaming fees.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>How eSIM Works</li>
              <li>Compatible Devices</li>
              <li>FAQ</li>
              <li>Contact Us</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Refund Policy</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">&copy; {new Date().getFullYear()} eSIMStore. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secure Payments</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>support@esimstore.com</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
