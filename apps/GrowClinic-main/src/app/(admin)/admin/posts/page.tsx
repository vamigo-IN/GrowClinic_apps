import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deletePost } from "../actions";

export default async function AdminPosts() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { tags: true }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--a-bright)]">Blog Articles</h2>
        <Link href="/admin/posts/new">
          <Button variant="primary">Create New Post</Button>
        </Link>
      </div>

      <div className="bg-[var(--a-panel)] rounded-xl shadow-sm border border-[var(--a-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[var(--a-bg)] text-[var(--a-muted)] text-xs font-semibold uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4 w-1/3">Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--a-panel)] divide-y divide-gray-200 text-sm text-[var(--a-text)]">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-[var(--a-hover)] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[var(--a-bright)]">{post.title}</p>
                    <p className="text-xs text-[var(--a-muted)] truncate max-w-sm">/{post.slug}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--a-text)]">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                      {post.category || "Uncategorized"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {post.published ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Published
                      </span>
                    ) : post.scheduledFor && new Date(post.scheduledFor) > new Date() ? (
                      <span className="inline-flex flex-col items-start px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title={new Date(post.scheduledFor).toLocaleString()}>
                        Scheduled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--a-hover)] text-[var(--a-bright)]">
                          {tag.name}
                        </span>
                      ))}
                      {post.tags.length > 3 && <span className="text-xs text-[var(--a-muted)]">+{post.tags.length - 3}</span>}
                      {post.tags.length === 0 && <span className="text-xs text-[var(--a-muted)] italic">None</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--a-muted)]">
                    {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/posts/${post.id}`} className="text-primary hover:text-primary-light transition-colors">
                        Edit
                      </Link>
                      <DeleteButton id={post.id} onDelete={deletePost} itemName="post" />
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--a-muted)]">
                    No articles found. Create your first post!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
