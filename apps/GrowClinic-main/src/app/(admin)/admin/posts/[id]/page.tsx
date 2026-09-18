"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { useToast } from "@/components/ui/ToastProvider";

export default function PostEditor() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  
  useEffect(() => {
    if (!isNew) {
      fetch(`/api/posts/${params.id}`)
        .then(res => res.json())
        .then(data => {
            if (data && !data.error) {
                setInitialData({
                    id: data.id,
                    title: data.title,
                    slug: data.slug,
                    excerpt: data.excerpt || "",
                    content: data.content,
                    featuredImage: data.featuredImage || "",
                    category: data.category || "Healthcare Trends",
                    published: data.published,
                    scheduledFor: data.scheduledFor || null,
                    tags: data.tags?.map((t: any) => t.name).join(",") || "",
                    focusKeyword: data.focusKeyword || "",
                    secondaryKeywords: data.secondaryKeywords || "",
                    canonicalUrl: data.canonicalUrl || "",
                    ogTitle: data.ogTitle || "",
                    ogDescription: data.ogDescription || "",
                    ogImage: data.ogImage || "",
                    noIndex: data.noIndex || false
                });
            }
        })
        .finally(() => setLoading(false));
    }
  }, [isNew, params.id]);

  const handleSave = async (data: any) => {
    setSaving(true);
    
    try {
      const tagArray = (data.tags || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);

      // Forward everything the editor sends (SEO fields, scheduledFor, etc.),
      // only replacing the comma-string tags with an array.
      const payload = { ...data, tags: tagArray };

      const url = isNew ? "/api/posts" : `/api/posts/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
         const errData = await res.json();
         toast(`Error: ${errData.error}`, "error");
         throw new Error("Failed to save post");
      }

      toast(isNew ? "Post created successfully" : "Post updated successfully", "success");

      // On first save of a NEW post, jump to its edit page so the full preview
      // link + status are available for further tweaks; otherwise back to list.
      if (isNew) {
        const saved = await res.json();
        if (saved?.id) {
          router.push(`/admin/posts/${saved.id}`);
          router.refresh();
          return;
        }
      }

      router.push("/admin/posts");
      router.refresh();

    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--a-muted)] font-medium">Loading editor architecture...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl md:text-3xl font-semibold text-[var(--a-bright)] tracking-tight">{isNew ? "Create Insight" : "Edit Insight"}</h2>
           <p className="text-[var(--a-muted)] font-medium text-sm mt-1">Design rich articles securely optimized for conversion.</p>
        </div>
        <Button variant="outline" className="border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-hover)] rounded-xl font-bold" onClick={() => router.back()}>Cancel</Button>
      </div>

      <ArticleEditor 
        initialData={initialData}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
