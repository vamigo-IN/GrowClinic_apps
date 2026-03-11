import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
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
          <form
            className="space-y-6"
            action={async (formData) => {
              "use server";
              await signIn("credentials", formData);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
