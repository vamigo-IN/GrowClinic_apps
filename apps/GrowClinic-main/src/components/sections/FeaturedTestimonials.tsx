"use client";

import React, { useState } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import { Star, Quote, ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import { SectionHeading } from "../ui/SectionHeading";

// Wrapper so each avatar tracks its own broken-state independently
function Avatar({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  const [broken, setBroken] = useState(false);
  if (avatarUrl && !broken) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span className="text-xl uppercase">{name.charAt(0)}</span>;
}

export function FeaturedTestimonials({ testimonials }: { testimonials: any[] }) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-32 bg-white relative overflow-hidden">
      {/* Background flair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <SectionHeading
            title="Strategic Proof of"
            highlight="Excellence"
            subtitle="Explore how we've engineered growth for ambitious medical practices."
            centered={false}
            className="mb-0"
          />
          <Link href="/testimonials">
            <Button variant="outline" className="rounded-full px-8 border-slate-200 hover:border-primary/30 transition-all font-black uppercase text-xs tracking-widest gap-2">
              All Success Stories
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {testimonials.map((testimonial, i) => (
            <m.div 
              key={testimonial.id} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group bg-white p-10 rounded-[15px] shadow-3xl border border-slate-50 flex flex-col justify-between transition-all duration-500 hover:shadow-primary/10 hover:-translate-y-3 relative overflow-hidden"
            >
              <Quote className="absolute top-8 right-10 w-16 h-16 text-primary/5 group-hover:text-primary/10 transition-colors pointer-events-none" />

              <div className="relative z-10">
                <div className="flex text-yellow-400 mb-8 gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <p className="text-slate-600 text-lg leading-relaxed mb-10 font-medium line-clamp-4 group-hover:text-slate-900 transition-colors">
                  "{testimonial.content}"
                </p>
              </div>
              
              <div className="flex items-center gap-5 border-t border-slate-50 pt-8 mt-auto">
                <div className="w-14 h-14 rounded-[15px] bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden border-2 border-white shadow-md ring-4 ring-primary/5 transition-all group-hover:scale-110">
                  <Avatar avatarUrl={testimonial.avatarUrl} name={testimonial.name} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight uppercase">{testimonial.name}</h4>
                  <p className="text-[10px] font-black text-primary/60 tracking-widest mt-1 uppercase">
                    {testimonial.role || "Client"}{testimonial.company ? ` • ${testimonial.company}` : ""}
                  </p>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  );
}
