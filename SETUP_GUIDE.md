# Quick Setup Guide

## Environment Variables Required

Copy `env.example` to `.env.local` and fill in these values:

### Microsoft Azure AD Configuration
```env
# Get from Azure Portal > App registrations > Your App
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id_here
AZURE_CLIENT_ID=your_azure_client_id_here
AZURE_CLIENT_SECRET=your_azure_client_secret_here
NEXT_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id_here
AZURE_TENANT_ID=your_azure_tenant_id_here

# Redirect URIs (for development)
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/login
```

### Supabase Configuration
```env
# Get from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### NextAuth Configuration
```env
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp env.example .env.local
# Edit .env.local with your values

# 3. Set up Supabase database
# Run the SQL from supabase-schema.sql in Supabase SQL Editor

# 4. Start development
npm run dev          # Next.js server
npm run electron-dev # Electron app (in another terminal)
```

## Azure AD Setup Checklist

- [ ] Create Azure AD app registration
- [ ] Add redirect URI: `http://localhost:3000`
- [ ] Add API permissions: User.Read, openid, profile, email
- [ ] Create client secret
- [ ] Copy Client ID, Tenant ID, and Client Secret

## Supabase Setup Checklist

- [ ] Create Supabase project
- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Copy Project URL, anon key, and service role key
- [ ] Test database connection

## Testing the App

1. Start the development server: `npm run dev`
2. Start Electron: `npm run electron-dev`
3. Click "Login with Microsoft"
4. Complete Microsoft authentication
5. Check Supabase for new user record
6. Approve user in database (set `approved = true`)
7. Refresh app to access dashboard

## File Structure

```
├── app/
│   ├── login/page.tsx          # Login page with Microsoft button
│   ├── dashboard/page.tsx      # Protected dashboard
│   ├── admin/page.tsx          # Admin panel for user approval
│   └── layout.tsx              # Root layout
├── electron/main.js            # Electron main process
├── lib/
│   ├── supabaseClient.ts       # Supabase database client
│   ├── msalConfig.ts          # Microsoft OAuth config
│   └── auth.ts                # NextAuth configuration
├── pages/api/auth/callback.ts  # OAuth callback handler
├── middleware.ts               # Route protection
└── supabase-schema.sql         # Database schema
```

## Troubleshooting

- **Popup blocked**: Allow popups for localhost:3000
- **Invalid token**: Check Azure AD configuration
- **Database error**: Verify Supabase connection and schema
- **Electron won't start**: Ensure Next.js dev server is running first



