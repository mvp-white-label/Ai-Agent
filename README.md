# Electron + React + Next.js Desktop App with Microsoft 365 Authentication

A production-ready desktop application built with Electron, React, and Next.js featuring Microsoft 365 (Azure AD) authentication and Supabase database integration.

## Features

- 🔐 **Microsoft 365 Authentication** - Secure OAuth2 login with Azure AD
- 🛡️ **Protected Routes** - Middleware-based route protection
- 👥 **User Management** - Supabase database integration with approval system
- 🖥️ **Desktop App** - Cross-platform Electron wrapper
- ⚡ **Modern Stack** - React 18, Next.js 14, TypeScript
- 🎨 **Beautiful UI** - Tailwind CSS with responsive design

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- A Microsoft Azure AD tenant
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install

# Or with yarn
yarn install
```

### 2. Microsoft Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Your app name
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: `http://localhost:3000` (for development)
5. After creation, note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**
6. Go to **Certificates & secrets** > **New client secret**
7. Create a new secret and note it down
8. Go to **API permissions** and add:
   - Microsoft Graph > User.Read
   - Microsoft Graph > openid
   - Microsoft Graph > profile
   - Microsoft Graph > email

### 3. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to **Settings** > **API** and note down:
   - **Project URL**
   - **anon public key**
   - **service_role secret key**
3. Go to **SQL Editor** and run the SQL from `supabase-schema.sql`

### 4. Environment Configuration

1. Copy `env.example` to `.env.local`
2. Fill in your configuration values:

```env
# Microsoft Azure AD Configuration
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id_here
AZURE_CLIENT_ID=your_azure_client_id_here
AZURE_CLIENT_SECRET=your_azure_client_secret_here
NEXT_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id_here
AZURE_TENANT_ID=your_azure_tenant_id_here

# Redirect URIs
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/login

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 5. Generate NextAuth Secret

```bash
# Generate a random secret
openssl rand -base64 32
```

## Running the Application

### Development Mode

```bash
# Start Next.js development server
npm run dev

# In another terminal, start Electron
npm run electron-dev
```

### Production Build

```bash
# Build the Next.js app
npm run build

# Build Electron app
npm run build-electron
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Protected dashboard page
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page (redirects to login)
├── electron/             # Electron main process
│   └── main.js          # Main Electron file
├── lib/                  # Utility libraries
│   ├── auth.ts          # NextAuth configuration
│   ├── msalConfig.ts    # MSAL browser config
│   ├── msalNodeConfig.ts # MSAL node config
│   └── supabaseClient.ts # Supabase client
├── pages/                # API routes
│   └── api/
│       └── auth/
│           └── callback.ts # OAuth callback handler
├── middleware.ts         # Route protection middleware
└── supabase-schema.sql   # Database schema
```

## Authentication Flow

1. **User clicks "Login with Microsoft"** on `/login` page
2. **MSAL popup opens** Microsoft OAuth login
3. **User authenticates** with Microsoft 365
4. **ID token is sent** to `/api/auth/callback`
5. **Token is validated** using Microsoft Graph API
6. **User is created/updated** in Supabase database
7. **Session cookie is set** with JWT token
8. **User is redirected** to dashboard (if approved) or approval message

## User Approval System

- New users are created with `approved: false` by default
- Admin must manually approve users in Supabase database
- Unapproved users see "Waiting for admin approval" message
- Only approved users can access `/dashboard`

## Security Features

- **JWT Session Management** - Secure HTTP-only cookies
- **Token Validation** - Server-side Microsoft token verification
- **Route Protection** - Middleware-based authentication
- **CORS Protection** - Proper origin validation
- **XSS Protection** - Content Security Policy ready

## API Endpoints

### POST `/api/auth/callback`
Handles Microsoft OAuth callback and token validation.

**Request Body:**
```json
{
  "idToken": "microsoft_id_token",
  "accessToken": "microsoft_access_token"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_uuid",
    "email": "user@company.com",
    "name": "User Name",
    "approved": true
  },
  "redirectTo": "/dashboard"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting

### Common Issues

1. **"Popup window was blocked"**
   - Allow popups for localhost:3000 in your browser
   - Check browser popup blocker settings

2. **"Invalid token" errors**
   - Verify Azure AD configuration
   - Check client ID and tenant ID
   - Ensure redirect URI matches exactly

3. **"User not found" in Supabase**
   - Check Supabase connection
   - Verify service role key
   - Run the database schema SQL

4. **Electron won't start**
   - Make sure Next.js dev server is running first
   - Check for port conflicts
   - Verify Node.js version compatibility

### Development Tips

- Use browser DevTools to debug authentication flow
- Check Network tab for API call failures
- Monitor Supabase logs for database issues
- Use Electron DevTools for desktop app debugging

## Production Deployment

1. **Update redirect URIs** in Azure AD for production domain
2. **Set production environment variables**
3. **Build and package** the Electron app
4. **Configure HTTPS** for secure authentication
5. **Set up monitoring** and error tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review Azure AD and Supabase documentation
- Open an issue on GitHub



