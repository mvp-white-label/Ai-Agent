import { UserAgentApplication, Configuration, AuthenticationParameters } from '@azure/msal'

// MSAL 1.0 configuration for Microsoft OAuth
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/redirect',
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000/login',
  },
  cache: {
    cacheLocation: 'sessionStorage', // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    // Remove logger configuration to avoid MSAL 1.0 compatibility issues
  },
}

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest: AuthenticationParameters = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  prompt: 'select_account',
  // Force implicit flow - MSAL 1.0 will automatically set response_type and response_mode
  extraScopesToConsent: [],
  // No extra query parameters needed - MSAL 1.0 handles implicit flow automatically
  extraQueryParameters: {},
}

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
}
