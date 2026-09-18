"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "./ImageUpload";
import { useToast } from "@/components/ui/ToastProvider";
import { CASE_STUDY_CATEGORIES } from "@/lib/case-study-categories";

interface CaseStudyEditorProps {
    id?: string;
    initialData?: any;
}

export function CaseStudyEditor({ id, initialData }: CaseStudyEditorProps) {
    const router = useRouter();
    const isNew = id === "new";
    const { toast } = useToast();
    
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        slug: initialData?.slug || "",
        clientName: initialData?.clientName || "",
        location: initialData?.location || "",
        specialty: initialData?.specialty || "",
        challenge: initialData?.challenge || "",
        solution: initialData?.solution || "",
        results: initialData?.results || "",
        metrics: initialData?.metrics || "",
        clientQuote: initialData?.clientQuote || "",
        clientQuoteAuthor: initialData?.clientQuoteAuthor || "",
        imageUrl: initialData?.imageUrl || "",
        metaDescription: initialData?.metaDescription || "",
        focusKeyword: initialData?.focusKeyword || "",
        published: initialData?.published || false,
    });

    // Services are multi-select — a client usually buys several.
    const [services, setServices] = useState<string[]>(
        initialData?.services ? String(initialData.services).split(",").map((s: string) => s.trim()).filter(Boolean)
            : (initialData?.category ? [initialData.category] : [])
    );
    const toggleService = (key: string) =>
        setServices((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

    const handleSlugAutogenerate = () => {
        if (!formData.title) return;
        const generatedSlug = formData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
        setFormData({ ...formData, slug: generatedSlug });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const url = isNew ? "/api/casestudies" : `/api/casestudies/${id}`;
            const method = isNew ? "POST" : "PATCH";

            const payload = {
                ...formData,
                services: services.join(","),
                category: services[0] || "", // keep legacy single field in sync
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                toast(`Error: ${data.error}`, "error");
                throw new Error("Failed to save case study");
            }

            toast(isNew ? "Case study created successfully" : "Case study updated successfully", "success");
            router.push("/admin/casestudies");
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* How-to guideline — keeps every case study consistent, data-driven and SEO/AEO-friendly */}
            <details className="group border-b border-gray-100 bg-blue-50/60">
                <summary className="cursor-pointer list-none px-8 py-4 flex items-center justify-between text-sm font-bold text-blue-900">
                    <span>📘 How to write a great case study (read me)</span>
                    <span className="text-blue-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-8 pb-6 text-sm text-blue-900/80 space-y-3 leading-relaxed">
                    <p><b>Goal:</b> a data-driven, skimmable story that ranks on Google and gets quoted by AI answer engines. Fill every field.</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><b>Title</b> — outcome + client, keyword-rich. e.g. <i>&quot;Generating 2,356 Patient Conversations for Skin Day Clinic via Meta Ads&quot;</i>.</li>
                        <li><b>Services delivered</b> — tick <i>every</i> service you ran for this client (Meta Ads, Social, Graphics, AI Automation…). The study shows under each section and displays the full stack — proving you do more than one thing.</li>
                        <li><b>Client Quote</b> — a short, specific testimonial + who said it. This is the single most persuasive element; add it whenever you can.</li>
                        <li><b>Specialty &amp; Location</b> — e.g. <i>Dermatology</i>, <i>Mumbai</i>. Powers local SEO and topical relevance.</li>
                        <li><b>Headline Metrics</b> — the numbers shown as big stat cards. One per line as <code>Value | Label</code>. e.g.<br /><code>2,356 | Conversations started</code><br /><code>₹32.57 | Cost per conversation</code><br /><code>2.94M | Impressions</code></li>
                        <li><b>Challenge → Solution → Results</b> — write in plain, specific sentences. Lead the Results with concrete numbers; AI engines quote these.</li>
                        <li><b>Featured Image</b> — a real performance screenshot or clean mockup. This is the big image on the page — use a sharp, high-res one.</li>
                        <li><b>Meta Description</b> — 140–160 chars, the one-line answer for Google &amp; AI. Include the metric + client + service.</li>
                        <li><b>Focus Keyword</b> — the main phrase you want to rank for, e.g. <i>dermatology clinic meta ads case study</i>.</li>
                    </ul>
                </div>
            </details>
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Case Study Title</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-lg"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Increasing Patient Leads by 200%"
                            />
                        </div>

                        {/* Challenge */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">The Challenge</label>
                            <textarea
                                required
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                                value={formData.challenge}
                                onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
                                placeholder="Describe the initial problem..."
                            ></textarea>
                        </div>
                        
                        {/* Solution */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">The Solution</label>
                            <textarea
                                required
                                rows={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                                value={formData.solution}
                                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                                placeholder="How did you solve the problem?"
                            ></textarea>
                        </div>

                        {/* Results */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">The Results</label>
                            <textarea
                                required
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                                value={formData.results}
                                onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                                placeholder="What were the outcomes? Lead with concrete numbers."
                            ></textarea>
                        </div>

                        {/* Headline Metrics */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Headline Metrics <span className="text-gray-400 font-normal">— shown as big stat cards</span></label>
                            <textarea
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm font-mono"
                                value={formData.metrics}
                                onChange={(e) => setFormData({ ...formData, metrics: e.target.value })}
                                placeholder={"One per line as  Value | Label\n2,356 | Conversations started\n₹32.57 | Cost per conversation\n2.94M | Impressions"}
                            ></textarea>
                            <p className="text-[11px] text-gray-400 mt-1">Format: <code>Value | Label</code> — one metric per line (up to 6).</p>
                        </div>

                        {/* Client quote — social proof */}
                        <div className="rounded-lg border border-gray-200 p-5 space-y-4 bg-emerald-50/40">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Client Quote <span className="text-gray-400 font-normal normal-case">— powerful social proof</span></h3>
                            <textarea
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                value={formData.clientQuote}
                                onChange={(e) => setFormData({ ...formData, clientQuote: e.target.value })}
                                placeholder="A short, specific quote from the client about the results / working with you."
                            ></textarea>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                value={formData.clientQuoteAuthor}
                                onChange={(e) => setFormData({ ...formData, clientQuoteAuthor: e.target.value })}
                                placeholder="Attribution — e.g. Dr. Ankit Potdar, Founder"
                            />
                        </div>

                        {/* SEO / AEO */}
                        <div className="rounded-lg border border-gray-200 p-5 space-y-4 bg-gray-50/60">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">SEO &amp; AI Answer Optimization</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Meta Description</label>
                                <textarea
                                    rows={2}
                                    maxLength={200}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={formData.metaDescription}
                                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                    placeholder="140–160 chars. The one-line answer: metric + client + service + city."
                                ></textarea>
                                <p className={`text-[11px] mt-1 ${formData.metaDescription.length > 160 ? "text-red-500" : "text-gray-400"}`}>{formData.metaDescription.length}/160 characters</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Focus Keyword</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={formData.focusKeyword}
                                    onChange={(e) => setFormData({ ...formData, focusKeyword: e.target.value })}
                                    placeholder="e.g. dermatology clinic meta ads case study"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                            <h3 className="font-semibold text-gray-900 mb-2 border-b pb-2 text-sm uppercase tracking-wider">Info</h3>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Client Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    placeholder="e.g. Smile Dental"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Services delivered</label>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {CASE_STUDY_CATEGORIES.map((c) => (
                                        <label key={c.key} className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                checked={services.includes(c.key)}
                                                onChange={() => toggleService(c.key)}
                                            />
                                            <span className="text-gray-800">{c.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">Tick every service you delivered — the study appears under each on the site and shows the full stack.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Specialty</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        value={formData.specialty}
                                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                        placeholder="e.g. Dermatology"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g. Mumbai"
                                    />
                                </div>
                            </div>

                            <ImageUpload
                                label="Featured Image"
                                value={formData.imageUrl}
                                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                            />

                            <div className="pt-4">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Slug</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleSlugAutogenerate}
                                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-bold transition"
                                    >
                                        AUTO
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                        checked={formData.published}
                                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                                    />
                                    <span className="text-gray-900 font-semibold text-sm">Publish Case Study</span>
                                </label>
                            </div>
                        </div>

                        <Button type="submit" variant="primary" className="w-full py-4 shadow-xl" disabled={saving}>
                            {saving ? "Saving..." : (isNew ? "Create Case Study" : "Update Case Study")}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
