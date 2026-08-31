import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 mt-1">System configuration (Super Admin only)</p>
      </div>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">Application</span><span>UNSTOPPABLE TEAM</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Timezone</span><span>Africa/Lagos</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Default Currency</span><span>USD</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Sensitive credentials (passwords, OTP codes, 2FA secrets) are never stored in this system.
            All data is protected by Row Level Security and role-based permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
