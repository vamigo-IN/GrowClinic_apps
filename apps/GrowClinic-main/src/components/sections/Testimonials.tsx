import React from "react";
import { SectionHeading } from "../ui/SectionHeading";

export function Testimonials() {
    const videos = [
        { title: "Dr. Sharma", role: "Orthopedic Surgeon", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400&h=300" },
        { title: "Dr. Patel's Clinic", role: "Advanced Dentistry", img: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=400&h=300" },
        { title: "Vision Care Hospital", role: "Ophthalmology", img: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=400&h=300" },
    ];

    return (
        <section id="testimonials" className="py-24 bg-primary text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <SectionHeading
                    title="Don't Take Our Word For It"
                    subtitle="Hear directly from top healthcare professionals who have scaled their practices with us."
                    dark
                />

                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                    {videos.map((video, index) => (
                        <div key={index} className="rounded-[15px] overflow-hidden relative group cursor-pointer aspect-video bg-gray-800">
                            <img src={video.img} alt={video.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-300" />

                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-accent/40">
                                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg>
                                </div>
                            </div>

                            {/* Info Bar */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent pt-12 text-left">
                                <h4 className="font-bold text-lg">{video.title}</h4>
                                <p className="text-accent text-sm">{video.role}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Logos Grid */}
                <div className="mt-24">
                    <p className="text-center text-gray-400 mb-8 uppercase tracking-widest text-sm font-semibold">Trusted by 50+ Clinics & Hospitals</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-20 opacity-70 grayscale">
                        {/* Placeholder for Client Logos */}
                        {['Clinic A', 'Dental Hub', 'Care Group', 'Med Life', 'Skin Experts'].map((logo, i) => (
                            <div key={i} className="text-2xl font-bold italic text-white/50">{logo}</div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
