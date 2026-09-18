"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "./ImageUpload";
import { useToast } from "@/components/ui/ToastProvider";

interface ClientEditorProps {
  id?: string;
  initialData?: any;
}

export function ClientEditor({ id, initialData }: ClientEditorProps) {
  const router = useRouter();
  const isNew = !id || id === "new";
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    logoUrl: initialData?.logoUrl || "",
    website: initialData?.website || "",
    order: initialData?.order ?? 0,
    published: initialData?.published ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast("Client name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/clientlogos" : `/api/clientlogos/${id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(`Error: ${data.error}`, "error");
        return;
      }
      toast(isNew ? "Client added successfully" : "Client updated successfully", "success");
      router.push("/admin/clients");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${formData.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientlogos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast("Client deleted", "success");
      router.push("/admin/clients");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast("Error deleting client", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-[var(--a-panel)] rounded-xl shadow-sm border border-[var(--a-border)] overflow-hidden">
      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left — main fields */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--a-bright)] mb-2">
                Clinic / Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-[var(--a-border)] rounded-lg bg-[var(--a-bg)] text-[var(--a-text)] focus:ring-primary focus:border-primary outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Smile Dental Clinic"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--a-bright)] mb-2">Website (optional)</label>
              <input
                type="url"
                className="w-full px-4 py-3 border border-[var(--a-border)] rounded-lg bg-[var(--a-bg)] text-[var(--a-text)] focus:ring-primary focus:border-primary outline-none"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://smiledental.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--a-bright)] mb-2">
                Display Order
              </label>
              <input
                type="number"
                min={0}
                className="w-32 px-4 py-3 border border-[var(--a-border)] rounded-lg bg-[var(--a-bg)] text-[var(--a-text)] focus:ring-primary focus:border-primary outline-none"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
              />
              <p className="text-xs text-[var(--a-muted)] mt-1.5">Lower numbers appear first in the marquee.</p>
            </div>
          </div>

          {/* Right — logo upload + publish */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[var(--a-bg)] p-6 rounded-xl border border-[var(--a-border)] space-y-6">
              <h3 className="font-semibold text-[var(--a-bright)] border-b border-[var(--a-border)] pb-2 text-sm uppercase tracking-wider">
                Client Logo
              </h3>

              <ImageUpload
                label="Logo Image"
                value={formData.logoUrl}
                onChange={(url) => setFormData({ ...formData, logoUrl: url })}
              />
              <p className="text-xs text-[var(--a-muted)]">
                PNG or SVG with transparent background works best. Roughly 200–400 px wide.
              </p>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  />
                  <span className="text-[var(--a-text)] font-semibold text-sm">Published (visible on site)</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Button type="submit" variant="primary" className="w-full py-4 shadow-xl" disabled={saving || deleting}>
                {saving ? "Saving..." : isNew ? "Add Client" : "Update Client"}
              </Button>

              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="w-full text-red-500 text-sm font-semibold hover:text-red-600 transition-colors py-2"
                >
                  {deleting ? "Deleting..." : "Delete Client"}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
