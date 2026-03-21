"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArticleEditor } from "@/components/admin/ArticleEditor";

export default function PostEditor() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  
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
                    title: data.title,
                    slug: data.slug,
                    excerpt: data.excerpt || "",
                    content: data.content,
                    featuredImage: data.featuredImage || "",
                    category: data.category || "Healthcare Trends",
                    published: data.published,
                    tags: data.tags?.map((t: any) => t.name).join(",") || ""
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

      const payload = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        featuredImage: data.featuredImage,
        category: data.category,
        published: data.published,
        tags: tagArray
      };

      const url = isNew ? "/api/posts" : `/api/posts/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
         const errData = await res.json();
         alert(`Error: ${errData.error}`);
         throw new Error("Failed to save post");
      }

      router.push("/admin/posts");
      router.refresh();
      
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading editor architecture...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
           <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{isNew ? "Create Insight" : "Edit Insight"}</h2>
           <p className="text-slate-500 font-medium text-sm mt-1">Design rich articles securely optimized for conversion.</p>
        </div>
        <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold" onClick={() => router.back()}>Cancel</Button>
      </div>

      <ArticleEditor 
        initialData={initialData}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
