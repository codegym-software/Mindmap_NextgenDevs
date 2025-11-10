// src/services/cognitoConfig.ts
export const cognitoConfig = {
    Domain: import.meta.env.VITE_COGNITO_DOMAIN as string,
    ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
    RedirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI as string,
    Scope: 'openid email profile',
    UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
};
