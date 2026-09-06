import { useEffect, useState } from "react";
import { UserRound, ShieldCheck, LogOut } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Input, Button } from "../components/ui";
import * as profileApi from "../api/profile";
import type { AdminProfile } from "../types";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    profileApi.fetchAdminProfile().then((p) => {
      setProfile(p);
      setName(p.name);
      setEmail(p.email);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await profileApi.updateAdminProfile({ name, email });
      setProfile(updated);
      showToast("Profile updated.");
    } catch (err: any) {
      showToast(err?.message || "Couldn't update profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate("/admin/login", { replace: true });
  }

  if (loading || !profile) {
    return (
      <div>
        <PageHeader title="Admin Profile" subtitle="Your account details and session." />
        <div className="rounded-card bg-white shadow-soft p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 bg-charcoal/5 rounded-btn animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin Profile" subtitle="Your account details and session." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="rounded-card bg-white shadow-soft p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-yolk-100 flex items-center justify-center text-yolk-700 overflow-hidden shrink-0">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserRound size={28} />}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-charcoal">{profile.name}</h2>
              <p className="text-sm text-charcoal-muted capitalize">{profile.role}</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="pt-1"><Button onClick={handleSave} isLoading={saving}>Save Changes</Button></div>
          </div>
        </div>

        <div className="rounded-card bg-white shadow-soft p-6 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={17} className="text-olive" />
            <h3 className="font-display font-bold text-charcoal">Security</h3>
          </div>
          <dl className="space-y-3 mb-6">
            <div>
              <dt className="text-xs text-charcoal-muted uppercase tracking-wide mb-1">Last Login</dt>
              <dd className="text-sm text-charcoal">{new Date(profile.lastLogin).toLocaleString("en-IN")}</dd>
            </div>
          </dl>
          <Button variant="secondary" onClick={handleLogout} isLoading={loggingOut} className="w-full justify-center">
            <LogOut size={15} /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
