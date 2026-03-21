import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/auth";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // If the user is already logged in, redirect them firmly to the dashboard.
  const session = await auth();
  if (session?.user) {
    redirect("/admin/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const hasError = resolvedSearchParams.error === "credentials";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Grow<span className="text-primary">Clinic</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600">Admin Portal Login</p>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200 border border-gray-100 sm:rounded-2xl sm:px-10">
          
          {hasError && (
            <div className="mb-6 p-4 rounded-xl text-sm font-medium bg-red-50 text-red-800 border border-red-200 text-center animate-in fade-in slide-in-from-top-1 duration-300">
              Invalid email or password. Please try again.
            </div>
          )}

          <form
            className="space-y-6"
            action={async (formData) => {
              "use server";
              try {
                await signIn("credentials", { 
                  ...Object.fromEntries(formData),
                  redirectTo: "/admin/dashboard" 
                });
              } catch (error) {
                if (error instanceof AuthError) {
                  if (error.type === "CredentialsSignin") {
                    redirect("/admin/login?error=credentials");
                  }
                  redirect("/admin/login?error=default");
                }
                // We MUST throw the error if it's not an AuthError, because NextAuth uses Next.js `redirect()` which relies on throwing a special Next.js error under the hood to successfully navigate on success.
                throw error;
              }
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                  placeholder="admin@growclinic.io"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div>
              <Button type="submit" variant="primary" className="w-full flex justify-center py-2.5">
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
