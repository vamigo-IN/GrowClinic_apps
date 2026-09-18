import React from "react";

/**
 * "Summarise this post with:" row — opens the article in the chosen AI
 * assistant with a ready-made summarise prompt. Brand marks are loaded via
 * Google's favicon service so they always render the real logos.
 */
const AIS = [
    { name: "ChatGPT", domain: "chatgpt.com", build: (q: string) => `https://chatgpt.com/?q=${q}` },
    { name: "Claude", domain: "claude.ai", build: (q: string) => `https://claude.ai/new?q=${q}` },
    { name: "Gemini", domain: "gemini.google.com", build: (q: string) => `https://gemini.google.com/app?q=${q}` },
    { name: "Grok", domain: "grok.com", build: (q: string) => `https://grok.com/?q=${q}` },
    { name: "Perplexity", domain: "perplexity.ai", build: (q: string) => `https://www.perplexity.ai/search?q=${q}` },
];

export function SummariseWithAI({ url, title }: { url: string; title: string }) {
    const prompt = encodeURIComponent(
        `Summarise this article and give me the key takeaways:\n"${title}"\n${url}`
    );

    return (
        <div className="my-10 rounded-[15px] border border-slate-200/70 bg-white p-6 sm:p-8">
            <p className="mb-5 text-center text-base font-semibold text-slate-600">Summarise this post with:</p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {AIS.map((ai) => (
                    <a
                        key={ai.name}
                        href={ai.build(prompt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Summarise with ${ai.name}`}
                        aria-label={`Summarise with ${ai.name}`}
                        className="flex h-16 w-16 items-center justify-center rounded-[15px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:h-[72px] sm:w-[72px]"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`https://www.google.com/s2/favicons?sz=128&domain=${ai.domain}`}
                            alt={ai.name}
                            width={32}
                            height={32}
                            className="h-8 w-8"
                            loading="lazy"
                        />
                    </a>
                ))}
            </div>
        </div>
    );
}
