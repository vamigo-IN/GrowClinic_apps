"use client";

import { useState, useTransition } from "react";
import { updateAdminProfile } from "./actions";

interface ProfileFormProps {
  user: {
    name: string | null;
    email: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    startTransition(async () => {
      const result = await updateAdminProfile(formData);
      
      if (result.success) {
        setMessage({ type: "success", text: result.message! });
        // Clear password fields on success
        (document.getElementById("currentPassword") as HTMLInputElement).value = "";
        (document.getElementById("newPassword") as HTMLInputElement).value = "";
        (document.getElementById("confirmPassword") as HTMLInputElement).value = "";
      } else {
        setMessage({ type: "error", text: result.error! });
      }
    });
  };

  return (
    <div className="bg-[var(--a-panel)] rounded-[15px] shadow-sm border border-[var(--a-border)] overflow-hidden max-w-2xl">
      <div className="p-8 border-b border-[var(--a-border)] bg-[var(--a-bg)]/50">
        <h3 className="text-xl font-bold text-[var(--a-bright)]">Personal Information</h3>
        <p className="text-sm text-[var(--a-muted)] mt-1">Update your display name and administrative password.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-[var(--a-text)] mb-1.5">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={user.email || ""}
              disabled
              className="block w-full px-4 py-3 bg-[var(--a-bg)] border border-[var(--a-border)] rounded-xl text-[var(--a-muted)] sm:text-sm cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-[var(--a-muted)] font-medium">Email address cannot be changed. This is your primary identity marker.</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-bold text-[var(--a-text)] mb-1.5">Display Name</label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={user.name || ""}
              required
              className="block w-full px-4 py-3 border border-[var(--a-border)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-colors"
              placeholder="Dr. Smith"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--a-border)]">
          <h4 className="text-sm font-bold text-[var(--a-bright)] mb-4 uppercase tracking-wider">Security</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-bold text-[var(--a-text)] mb-1.5">Current Password <span className="text-[var(--a-muted)] font-normal">(required to set a new one)</span></label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                autoComplete="current-password"
                className="block w-full px-4 py-3 border border-[var(--a-border)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-colors"
                placeholder="Your current password"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-bold text-[var(--a-text)] mb-1.5">New Password <span className="text-[var(--a-muted)] font-normal">(Optional)</span></label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="block w-full px-4 py-3 border border-[var(--a-border)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-colors"
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--a-text)] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="block w-full px-4 py-3 border border-[var(--a-border)] rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-colors"
                placeholder="Confirm your new password"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Saving Changes...' : 'Save Profile Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
