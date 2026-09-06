import { useState } from "react";
import { Store, Receipt, Palette, Terminal, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { ShopSettingsPanel } from "../components/settings/ShopSettingsPanel";
import { TaxBillingSettingsPanel } from "../components/settings/TaxBillingSettingsPanel";
import { AppearanceSettingsPanel } from "../components/settings/AppearanceSettingsPanel";
import { PosSettingsPanel } from "../components/settings/PosSettingsPanel";
import { SecuritySettingsPanel } from "../components/settings/SecuritySettingsPanel";

type Category = "shop" | "tax" | "appearance" | "pos" | "security";

const categories: { value: Category; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "shop", label: "Shop", icon: <Store size={16} />, description: "Name, address, and GSTIN." },
  { value: "tax", label: "Tax & Billing", icon: <Receipt size={16} />, description: "GST and invoice preferences." },
  { value: "appearance", label: "Appearance", icon: <Palette size={16} />, description: "Theme and product display." },
  { value: "pos", label: "POS", icon: <Terminal size={16} />, description: "Receipts, printing, invoice format." },
  { value: "security", label: "Security", icon: <ShieldCheck size={16} />, description: "Session timeout and confirmations." },
];

export default function Settings() {
  const [category, setCategory] = useState<Category>("shop");
  const active = categories.find((c) => c.value === category)!;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your shop, billing, appearance, and security preferences." />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0" aria-label="Settings categories">
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              aria-current={category === c.value ? "true" : undefined}
              className={`flex items-center gap-2.5 rounded-btn px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                category === c.value ? "bg-yolk-100 text-charcoal" : "text-charcoal-muted hover:bg-charcoal/5"
              }`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </nav>

        <div className="rounded-card bg-white shadow-soft p-5">
          <h2 className="font-display font-bold text-lg text-charcoal mb-1">{active.label}</h2>
          <p className="text-sm text-charcoal-muted mb-5">{active.description}</p>

          {category === "shop" && <ShopSettingsPanel />}
          {category === "tax" && <TaxBillingSettingsPanel />}
          {category === "appearance" && <AppearanceSettingsPanel />}
          {category === "pos" && <PosSettingsPanel />}
          {category === "security" && <SecuritySettingsPanel />}
        </div>
      </div>
    </div>
  );
}
