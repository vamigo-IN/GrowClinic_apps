import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/admin/dashboard");

  const resolvedSearchParams = await searchParams;
  const hasError = resolvedSearchParams.error === "credentials";

  const inputCls =
    "w-full rounded-md border border-white/[0.08] bg-[#0e1320] px-3 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-emerald-500/40";

  return (
    <div className="min-h-screen bg-[#0a0e16] flex items-center justify-center px-4 font-sans antialiased">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">
              Grow<span className="text-emerald-400">Clinic</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/[0.06]">admin</span>
          </div>
          <p className="mt-2 font-mono text-xs text-slate-500">// sign in to continue</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-[#0c111b] p-6">
          {hasError && (
            <div className="mb-5 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 font-mono text-[12px] text-rose-400">
              auth_error: invalid email or password
            </div>
          )}

          <form
            className="space-y-4"
            action={async (formData) => {
              "use server";
              try {
                await signIn("credentials", { ...Object.fromEntries(formData), redirectTo: "/admin/dashboard" });
              } catch (error) {
                if (error instanceof AuthError) {
                  if (error.type === "CredentialsSignin") redirect("/admin/login?error=credentials");
                  redirect("/admin/login?error=default");
                }
                throw error;
              }
            }}
          >
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">email</label>
              <input name="email" type="email" required placeholder="admin@growclinic.io" className={inputCls} />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">password</label>
              <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-emerald-500 py-2.5 text-[13px] font-semibold text-[#04241a] hover:bg-emerald-400 transition-colors"
            >
              Sign in →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
