import { prisma } from "@/lib/prisma";

export default async function AuditAdminPage() {
    const audits = await prisma.clinicAudit.findMany({
        orderBy: { createdAt: "desc" }
    }) as any[];

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 border-b-4 border-primary pb-2">Clinic Growth Audits</h2>
                <div className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold">
                    {audits.length} Total Requests
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Clinic / Doctor</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Location</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Diagnostic Data</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Submitted</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {audits.map((audit) => (
                            <tr key={audit.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{audit.clinicName}</div>
                                    <div className="text-sm text-gray-500">{audit.fullName} • {audit.specialization}</div>
                                    <div className="text-xs text-primary font-medium mt-1">{audit.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-700">{audit.city}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase font-black">SEO</div>
                                            <div className="font-black text-primary">{audit.seoScore}%</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase font-black">Rank</div>
                                            <div className="font-black text-slate-900">#{audit.competitorRank}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] text-gray-400 uppercase font-black">Leads</div>
                                            <div className="font-black text-green-600">+{audit.estimatedLeads}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-500">{formatDate(new Date(audit.createdAt))}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        audit.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                                    }`}>
                                        {audit.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {audits.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                    No audit requests found. Start marketing to get some!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
