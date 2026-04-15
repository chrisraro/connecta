import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function BillingPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Billing & Usage</h1>
                <p className="text-muted-foreground">Manage your subscription and credits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Current Plan */}
                <div className="bg-card border border-border rounded-xl p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-muted-foreground">Current Plan</h3>
                            <div className="text-3xl font-bold text-foreground mt-2">Free Trial</div>
                        </div>
                        <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            Active
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">AI Credits</span>
                            <span className="font-bold">5 / 5</span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full w-full"></div>
                        </div>
                        <p className="text-xs text-muted-foreground">Credits refresh monthly.</p>
                    </div>

                    <Button variant="outline" className="w-full border-border hover:bg-muted">
                        Manage Payment Methods
                    </Button>
                </div>

                {/* Upgrade CTA */}
                <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-xl p-8 relative overflow-hidden">
                    <h3 className="text-2xl font-bold text-foreground mb-2">Pro Agent</h3>
                    <p className="text-primary font-bold text-lg mb-6">$29<span className="text-muted-foreground text-sm font-normal">/mo</span></p>

                    <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited AI Profiles</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Custom Domain Support</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Advanced Lead Analytics</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Priority Support</li>
                    </ul>

                    <Button className="w-full bg-primary text-primary-foreground font-bold border-none">
                        Upgrade Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
