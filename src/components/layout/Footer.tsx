"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/Button";
import { Facebook, Twitter, Linkedin, Instagram, Phone, Mail, ArrowRight, MapPin } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-50 border-t border-slate-100 text-slate-900 pt-32 pb-12 relative overflow-hidden">
            {/* Background flair */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-32 opacity-50"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 mb-24">
                    {/* Brand Col */}
                    <div className="col-span-1 border-r border-slate-100 pr-12 hidden lg:block">
                        <div className="h-full flex flex-col justify-between">
                            <div>
                                <Image
                                    src="/images/logo.png"
                                    alt="GrowClinic Logo"
                                    width={160}
                                    height={45}
                                    className="mb-8 h-9 w-auto"
                                />
                                <p className="text-slate-600 leading-relaxed mb-6 font-medium">
                                    India's #1 ranked healthcare engineering agency. Scaling elite medical practices through scientific patient acquisition systems.
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-105 duration-500">
                                <p className="text-primary font-black italic text-lg leading-tight uppercase tracking-tight">"Don't Just Go Digital. Grow Digital."</p>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-1 lg:hidden">
                        <Link href="/" className="inline-block mb-8">
                            <Image
                                src="/images/logo.png"
                                alt="GrowClinic Logo"
                                width={160}
                                height={45}
                                className="h-9 w-auto"
                            />
                        </Link>
                        <p className="text-slate-500 leading-relaxed mb-8 font-medium">
                            India's #1 ranked healthcare engineering agency. Scaling elite medical practices through scientific patient acquisition systems.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="col-span-1">
                        <h4 className="text-xs font-black mb-10 text-slate-400 uppercase tracking-[0.3em] relative">
                            Strategic Links
                            <span className="absolute -bottom-3 left-0 w-8 h-1 bg-primary rounded-full"></span>
                        </h4>
                        <ul className="space-y-4">
                            {[
                                { name: 'Home', href: '/' },
                                { name: 'Growth Systems', href: '/#services' },
                                { name: 'Performance Results', href: '/#results' },
                                { name: 'Success Stories', href: '/testimonials' },
                                { name: 'Specialty Audits', href: '/#audit' },
                                { name: 'Knowledge Base', href: '/faq' }
                            ].map((item) => (
                                <li key={item.name}>
                                    <Link href={item.href} className="text-slate-600 hover:text-primary flex items-center gap-2 transition-all font-bold hover:translate-x-1 group">
                                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Us */}
                    <div className="col-span-1">
                        <h4 className="text-xs font-black mb-10 text-slate-400 uppercase tracking-[0.3em] relative">
                            Headquarters
                            <span className="absolute -bottom-3 left-0 w-8 h-1 bg-primary rounded-full"></span>
                        </h4>
                        <ul className="space-y-6">
                            <li>
                                <a
                                    href="https://maps.google.com/?q=GrowClinic+Noida"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-all group-hover:bg-primary group-hover:text-white">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="text-slate-900 font-black tracking-tight">Noida, Uttar Pradesh, India</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href="tel:+919718304212"
                                    className="flex items-center gap-4 group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-all group-hover:bg-primary group-hover:text-white">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <span className="text-slate-900 font-black tracking-tight">+91 97183 04212</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href="mailto:hi@growclinic.io"
                                    className="flex items-center gap-4 group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-all group-hover:bg-primary group-hover:text-white">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <span className="text-slate-900 font-black tracking-tight">hi@growclinic.io</span>
                                </a>
                            </li>
                        </ul>

                        <div className="mt-12">
                            <div className="flex gap-4">
                                {[
                                    { icon: Facebook, href: '#' },
                                    { icon: Twitter, href: '#' },
                                    { icon: Linkedin, href: 'https://www.linkedin.com/showcase/growclinic-io' },
                                    { icon: Instagram, href: 'https://www.instagram.com/growclinic.io' }
                                ].map((social, i) => (
                                    <a key={i} href={social.href} className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all hover:-translate-y-2 shadow-sm border border-slate-50">
                                        <social.icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-100 pt-10 flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <p>Copyright © {currentYear} GrowClinic Pvt. Ltd. | All Rights Reserved</p>
                    <div className="flex gap-8 mt-6 md:mt-0">
                        <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-primary transition-colors">Term of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
