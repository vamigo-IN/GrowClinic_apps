"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Calendar, Clock, ArrowRight } from "lucide-react";

export interface BlogItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  category: string;
  date: string;
  readingTime: number;
}

export function BlogExplorer({ posts, categories }: { posts: BlogItem[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (q === "" || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)),
    );
  }, [posts, query, cat]);

  return (
    <div>
      {/* Search */}
      <div className="relative mx-auto mb-8 max-w-3xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${posts.length} article${posts.length === 1 ? "" : "s"}…`}
          className="w-full rounded-[15px] border border-slate-200 bg-white py-4 pl-14 pr-5 text-slate-700 placeholder-slate-400 shadow-sm outline-none transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5"
        />
      </div>

      {/* Category pills */}
      <div className="mb-14 flex flex-wrap justify-center gap-2">
        <Pill active={cat === "all"} onClick={() => setCat("all")}>
          All
        </Pill>
        {categories.map((c) => (
          <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Pill>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-[15px] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white py-24 text-center">
          <h3 className="mb-2 text-xl font-black text-slate-400">No articles found</h3>
          <p className="text-sm font-medium text-slate-400">
            {query ? "Try a different search or category." : "Check back soon — we are preparing valuable content."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="group relative overflow-hidden rounded-[15px] border border-slate-100 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl"
            >
              <Link href={`/blog/${post.slug}`} className="absolute inset-0 z-[1]">
                <span className="sr-only">Read {post.title}</span>
              </Link>

              <div className="relative h-52 overflow-hidden bg-slate-50">
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary shadow-sm backdrop-blur-sm">
                  {post.category}
                </span>
              </div>

              <div className="p-6">
                <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                  <span className="text-slate-200">•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {post.readingTime} min
                  </span>
                </div>
                <h2 className="mb-3 line-clamp-2 text-lg font-black leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mb-5 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">{post.excerpt}</p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-primary">
                  Read article
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
        active
          ? "bg-primary text-white shadow-md shadow-primary/20"
          : "border border-slate-200 bg-white text-slate-500 hover:border-primary/30 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
