import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if it's an admin route
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const sessionToken = request.cookies.get("authjs.session-token")?.value || 
                         request.cookies.get("__Secure-authjs.session-token")?.value ||
                         request.cookies.get("next-auth.session-token")?.value ||
                         request.cookies.get("__Secure-next-auth.session-token")?.value;
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  
  // Prevent logged-in users from seeing the login page
  if (pathname.startsWith("/admin/login")) {
    const sessionToken = request.cookies.get("authjs.session-token")?.value || 
                         request.cookies.get("__Secure-authjs.session-token")?.value ||
                         request.cookies.get("next-auth.session-token")?.value ||
                         request.cookies.get("__Secure-next-auth.session-token")?.value;
                         
    if (sessionToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
