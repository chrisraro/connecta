"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Save, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSetting, useUpdateSetting, usePlanPricing } from "@/hooks/useSettings";
import { PLAN_LIMITS, type PlanPricing } from "@/lib/plans";
import type { ShopSettings } from "@/lib/shopSettings";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/errors";

export default function AdminSettingsPage() {
  const { isLoaded } = useAuth();

  // ---- Shop settings (tax / shipping) ----
  const { data: shopSettings } = useSetting<ShopSettings>("shop");
  const updateSetting = useUpdateSetting().mutateAsync;
  const updateShopSettings = (value: ShopSettings) =>
    updateSetting({ key: "shop", value, isPublic: true });
  const [shopSaving, setShopSaving] = useState(false);
  const [shopSavedAt, setShopSavedAt] = useState<number | null>(null);
  const [shopForm, setShopForm] = useState({
    taxRatePercent: 0,
    shippingFlatRatePesos: 500,
    freeShippingThresholdPesos: 2500,
  });

  // Hydrate the form once settings load (centavos -> pesos for the UI).
  useEffect(() => {
    if (shopSettings) {
      setShopForm({
        taxRatePercent: shopSettings.taxRatePercent,
        shippingFlatRatePesos: shopSettings.shippingFlatRateCentavos / 100,
        freeShippingThresholdPesos: shopSettings.freeShippingThresholdCentavos / 100,
      });
    }
  }, [shopSettings]);

  // ---- Plan pricing (Lead tools / Teams standard monthly price in ₱) ----
  // This overrides the STANDARD price only -- the prelaunch price and both
  // yearly prices are fixed in lib/pricing.ts (see lib/plans.ts PlanPricing).
  const { data: planPricing } = usePlanPricing();
  const updatePlanPricing = (value: PlanPricing) =>
    updateSetting({ key: "planPricing", value, isPublic: true });
  const [planSaving, setPlanSaving] = useState(false);
  const [planSavedAt, setPlanSavedAt] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState({ leadToolsPesos: 79, teamsPesos: 299 });

  useEffect(() => {
    if (planPricing) {
      setPlanForm({
        leadToolsPesos: planPricing.lead_tools / 100,
        teamsPesos: planPricing.teams / 100,
      });
    }
  }, [planPricing]);

  const handleSavePlanPricing = async () => {
    setPlanSaving(true);
    try {
      await updatePlanPricing({
        lead_tools: Math.round(planForm.leadToolsPesos * 100),
        teams: Math.round(planForm.teamsPesos * 100),
      });
      setPlanSavedAt(Date.now());
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setPlanSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  const handleSaveShopSettings = async () => {
    setShopSaving(true);
    try {
      await updateShopSettings({
        taxRatePercent: shopForm.taxRatePercent,
        shippingFlatRateCentavos: Math.round(shopForm.shippingFlatRatePesos * 100),
        freeShippingThresholdCentavos: Math.round(shopForm.freeShippingThresholdPesos * 100),
        currency: "PHP",
      });
      setShopSavedAt(Date.now());
    } catch (error) {
      console.error("Failed to save shop settings:", error);
      toast.error(toUserMessage(error));
    } finally {
      setShopSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system preferences and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">Shop settings</CardTitle>
              <CardDescription className="text-muted-foreground">
                Tax and shipping rates applied at checkout (PHP). Used by the storefront and order
                totals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {shopSettings === undefined ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-primary w-6 h-6" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tax rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={shopForm.taxRatePercent}
                    onChange={(e) =>
                      setShopForm({ ...shopForm, taxRatePercent: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">0 = no tax</p>
                </div>
                <div className="space-y-2">
                  <Label>Flat shipping (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shopForm.shippingFlatRatePesos}
                    onChange={(e) =>
                      setShopForm({
                        ...shopForm,
                        shippingFlatRatePesos: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Charged below the free-shipping threshold
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Free shipping over (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shopForm.freeShippingThresholdPesos}
                    onChange={(e) =>
                      setShopForm({
                        ...shopForm,
                        freeShippingThresholdPesos: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Orders at/above this ship free</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={handleSaveShopSettings} disabled={shopSaving}>
                  {shopSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save shop settings
                    </>
                  )}
                </Button>
                {shopSavedAt && !shopSaving && (
                  <span className="text-xs text-primary">Saved</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">Plan pricing</CardTitle>
              <CardDescription className="text-muted-foreground">
                Standard monthly (30-day) subscription price in PHP, shown struck through beside
                the prelaunch price. Prelaunch and yearly prices are fixed in lib/pricing.ts.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {planPricing === undefined ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-primary w-6 h-6" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{PLAN_LIMITS.lead_tools.name} — standard monthly (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={planForm.leadToolsPesos}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, leadToolsPesos: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{PLAN_LIMITS.teams.name} — standard monthly (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={planForm.teamsPesos}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, teamsPesos: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={handleSavePlanPricing} disabled={planSaving}>
                  {planSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save plan pricing
                    </>
                  )}
                </Button>
                {planSavedAt && !planSaving && <span className="text-xs text-primary">Saved</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/*
        The Email, Notifications, Security, Data Management and Danger Zone
        cards that used to sit here were decoration: SMTP fields the app never
        read (mail goes through Resend), switches bound to no state, and
        disabled buttons. A switch labelled "Two-Factor Authentication" that
        flips and saves nothing tells an admin a protection is on when it is
        not. This card says where each of those things actually lives.
      */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <CardTitle className="text-lg">Configured outside this console</CardTitle>
              <CardDescription className="text-muted-foreground">
                These are deployment settings, not database settings, so they are changed where they
                live.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">Lead emails</dt>
              <dd className="text-muted-foreground mt-1">
                Resend, via <code>RESEND_API_KEY</code> and <code>RESEND_FROM_EMAIL</code> in the
                Vercel environment.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Sign-in, sessions, 2FA</dt>
              <dd className="text-muted-foreground mt-1">
                Supabase dashboard → Authentication (providers, email confirmation, MFA, session
                limits).
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Backups and exports</dt>
              <dd className="text-muted-foreground mt-1">
                Supabase dashboard → Database → Backups. Owners export their own leads from the
                dashboard.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Deployment health</dt>
              <dd className="text-muted-foreground mt-1">
                <a className="underline" href="/api/health" target="_blank" rel="noreferrer">
                  /api/health
                </a>{" "}
                reports database reachability and which keys are configured.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
