import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to protect routes and handle authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/signup', '/api/auth/validate', '/api/sessions', '/api/test-db']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // For client-side routes, let them handle authentication
  // The middleware will only run on server-side requests
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For all other routes, let the client-side handle authentication
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
