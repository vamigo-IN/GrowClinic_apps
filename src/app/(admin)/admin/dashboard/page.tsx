import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const totalLeads = await prisma.lead.count();
  const totalPosts = await prisma.post.count();
  const publishedPosts = await prisma.post.count({ where: { published: true } });
  
  const recentLeads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <span className="text-gray-500 text-sm font-medium">Total Leads</span>
          <span className="text-4xl font-bold text-gray-900 mt-2">{totalLeads}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <span className="text-gray-500 text-sm font-medium">Total Posts</span>
          <span className="text-4xl font-bold text-gray-900 mt-2">{totalPosts}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <span className="text-gray-500 text-sm font-medium">Published Posts</span>
          <span className="text-4xl font-bold text-primary mt-2">{publishedPosts}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Recent Leads</h3>
          <a href="/admin/leads" className="text-sm text-primary hover:underline font-medium">View All</a>
        </div>
        {recentLeads.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900">{lead.name}</p>
                  <p className="text-sm text-gray-500">{lead.email} {lead.phone && `• ${lead.phone}`}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium mb-1">
                    {lead.source || "Direct"}
                  </span>
                  <p className="text-xs text-gray-400">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No leads collected yet.
          </div>
        )}
      </div>
    </div>
  );
}
