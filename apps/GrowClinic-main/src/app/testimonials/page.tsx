// ISR: render once, then re-render at most every 5 min. Public content
// mutations call revalidatePath (see src/lib/revalidate.ts) to update sooner.
export const revalidate = 300;
import React from "react";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Star, MessageSquareQuote, Sparkles } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategic Proof of Excellence | Testimonials",
  description: "Explore the real-world impact GrowClinic has delivered for ambitious medical practices. Real results, real growth, real stories.",
};

export default async function TestimonialsPage() {
  // Degrade gracefully if the DB is briefly unreachable — a 5xx on a public
  // page can trip the host health check and restart the app.
  let testimonials: any[] = [];
  try {
    // @ts-ignore - Prisma property might be stale in editor
    testimonials = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("TestimonialsPage: DB unavailable, rendering empty list.", e);
  }

  return (
    <main className="min-h-screen bg-slate-50 pt-32 pb-20 overflow-hidden relative">


      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-24">
          <SectionHeading
            title="Strategic Proof of"
            highlight="Excellence"
            subtitle="Explore the real-world impact we've delivered for ambitious medical practices across the country."
            centered
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {testimonials.map((testimonial: any) => (
            <div
              key={testimonial.id}
              className="group bg-white p-10 rounded-[15px] shadow-3xl border border-white flex flex-col justify-between transition-all duration-700 hover:shadow-primary/10 hover:-translate-y-3 relative overflow-hidden"
            >
              {/* Card Decor */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>

              <div className="relative z-10">
                <div className="flex text-yellow-400 mb-8 gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>

                <div className="relative mb-10">
                  <MessageSquareQuote className="absolute -top-4 -left-6 w-12 h-12 text-primary/5 group-hover:text-primary/10 transition-colors" />
                  <p className="text-slate-600 text-lg leading-relaxed font-medium relative z-10">
                    "{testimonial.content}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5 border-t border-slate-50 pt-8 mt-auto relative z-10">
                <div className="w-14 h-14 rounded-[15px] bg-primary/10 flex items-center justify-center text-primary font-black overflow-hidden border-2 border-white shadow-md ring-4 ring-primary/5 transition-all group-hover:scale-110 duration-500">
                  {testimonial.avatarUrl ? (
                    <img src={testimonial.avatarUrl} alt={testimonial.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl uppercase">{testimonial.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight uppercase">{testimonial.name}</h4>
                  <p className="text-xs font-black text-primary/60 tracking-widest mt-1 uppercase">
                    {testimonial.role || "Clinical Director"}{testimonial.company ? ` • ${testimonial.company}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {testimonials.length === 0 && (
          <div className="text-center py-32 bg-white rounded-[15px] shadow-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Sparkles className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 text-xl font-medium italic">Our success stories are currently being documented. Check back shortly.</p>
          </div>
        )}

        <div className="mt-32 text-center">
          <div className="inline-flex flex-col items-center">
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs mb-8">Ready to be our next success story?</p>
            <a
              href="https://audit.growclinic.io"
              className="bg-primary-gradient text-white px-12 py-5 rounded-full font-black uppercase text-xs tracking-[0.2em] shadow-glow hover:scale-105 transition-all active:scale-95"
            >
              Audit Your Clinic
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
