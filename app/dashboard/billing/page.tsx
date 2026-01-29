import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function BillingPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Billing & Usage</h1>
                <p className="text-zinc-400">Manage your subscription and credits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Current Plan */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-zinc-400">Current Plan</h3>
                            <div className="text-3xl font-bold text-white mt-2">Free Trial</div>
                        </div>
                        <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            Active
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">AI Credits</span>
                            <span className="font-bold">5 / 5</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full w-full"></div>
                        </div>
                        <p className="text-xs text-zinc-500">Credits refresh monthly.</p>
                    </div>

                    <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white">
                        Manage Payment Methods
                    </Button>
                </div>

                {/* Upgrade CTA */}
                <div className="bg-gradient-to-br from-yellow-600/20 to-zinc-900 border border-yellow-600/30 rounded-xl p-8 relative overflow-hidden">
                    <h3 className="text-2xl font-bold text-white mb-2">Pro Agent</h3>
                    <p className="text-yellow-500 font-bold text-lg mb-6">$29<span className="text-zinc-500 text-sm font-normal">/mo</span></p>

                    <ul className="space-y-3 mb-8 text-sm text-zinc-300">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Unlimited AI Profiles</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Custom Domain Support</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Advanced Lead Analytics</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Priority Support</li>
                    </ul>

                    <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold border-none">
                        Upgrade Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
