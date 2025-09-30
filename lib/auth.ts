import { NextAuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import { User } from './supabaseClient'

// Custom session interface
export interface CustomSession {
  user: {
    id: string
    email: string
    name: string
    approved: boolean
  }
  accessToken?: string
  idToken?: string
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    // We'll handle Microsoft OAuth manually through our custom callback
  ],
  callbacks: {
    async jwt({ token, user, account }): Promise<JWT> {
      // Persist the OAuth access_token and id_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.userId = user?.id
        token.approved = (user as User)?.approved
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          email: token.email as string,
          name: token.name as string,
          approved: token.approved as boolean,
        },
        accessToken: token.accessToken as string,
        idToken: token.idToken as string,
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to create a session from Microsoft user data
export function createSessionFromMicrosoftUser(user: User, accessToken: string, idToken: string): CustomSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      approved: user.approved,
    },
    accessToken,
    idToken,
  }
}
