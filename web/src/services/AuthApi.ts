import { cognitoConfig } from '../auth/cognitoConfig';

// Base URL for your custom authentication backend
// [GIỮ NGUYÊN] Vì các hàm cũ (loginUser, registerUser...) đang dùng nó.
const API_BASE = 'http://localhost:8081/api/auth';

/**
 * A utility function to parse the response from the fetch API.
 * It handles both JSON and text responses.
 * @param response The fetch response object.
 * @returns A promise that resolves to an object with 'ok' status and 'body'.
 */
export const parseResponse = async (response: Response) => {
  const text = await response.text();
  try {
    return { ok: response.ok, status: response.status, body: JSON.parse(text) };
  } catch {
    return { ok: response.ok, status: response.status, body: text || {} };
  }
};

/**
 * [MỚI] Làm mới (refresh) Access Token bằng Refresh Token.
 * Hàm này gọi thẳng đến endpoint /oauth2/token của Cognito
 * (sử dụng VITE_COGNITO_DOMAIN, giải quyết lỗi xung đột tên miền).
 */
export const refreshToken = async (refreshToken: string) => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: cognitoConfig.ClientId,
    refresh_token: refreshToken,
  });

  const res = await fetch(`https://${cognitoConfig.Domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errorBody = await res.json();
    console.error("Token refresh failed:", errorBody);
    throw new Error(`token_refresh_failed: ${errorBody.error_description || res.status}`);
  }

  // Trả về token mới (Access Token và ID Token)
  // Cognito KHÔNG trả về Refresh Token mới trong luồng này
  return res.json() as Promise<{
    access_token: string;
    id_token: string;
    expires_in?: number;
  }>;
};

/**
 * Checks if an email already exists in the system.
 * @param email The email to check.
 * @returns A promise with the result of the check.
 */
export const checkEmail = async (email: string) => {
  const resp = await fetch(`${API_BASE}/checkemail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return await parseResponse(resp);
};

/**
 * Logs in a user with email and password.
 * @param email The user's email.
 * @param password The user's password.
 * @returns A promise with the login result, including tokens.
 */
export const loginUser = async (email: string, password: string) => {
  const resp = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await parseResponse(resp);
};

/**
 * Registers a new user.
 * @param email The new user's email.
 * @param password The new user's password.
 * @returns A promise with the registration result.
 */
export const registerUser = async (email: string, password: string) => {
  const resp = await fetch(`${API_BASE}/cognito/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await parseResponse(resp);
};

/**
 * Confirms a user's registration with a confirmation code.
 * @param username The username (email) to confirm.
 * @param code The confirmation code sent to the user.
 * @returns A promise with the confirmation result.
 */
export const confirmSignup = async (username: string, code: string) => {
  const resp = await fetch(`${API_BASE}/cognito/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, code }),
  });
  return await parseResponse(resp);
};

/**
 * Resends the confirmation code to a user.
 * @param username The username (email) to resend the code to.
 * @returns A promise with the result of the resend operation.
 */
export const resendConfirmationCode = async (username: string) => {
  const resp = await fetch(`${API_BASE}/cognito/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return await parseResponse(resp);
};


/**
 * Initiates the forgot password flow for a user.
 * @param username The user's email.
 * @returns A promise with the result.
 */
export const startForgotPassword = async (username: string) => {
    const resp = await fetch(`${API_BASE}/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });
    return await parseResponse(resp);
};

/**
 * Confirms the password reset with a code and new password.
 * @param username The user's email.
 * @param code The reset code sent to the user.
 * @param newPassword The new password.
 * @returns A promise with the result of the reset operation.
 */
export const confirmResetPassword = async (username: string, code: string, newPassword: string) => {
    const resp = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code, newPassword }),
    });
    return await parseResponse(resp);
};


/**
 * Generates the URL for Google login via Cognito Hosted UI.
 * (Hàm này vẫn chính xác)
 */
export const getGoogleLoginUrl = () => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cognitoConfig.ClientId,
    redirect_uri: cognitoConfig.RedirectUri,
    scope: cognitoConfig.Scope,
    identity_provider: 'Google',
  });
  return `https://${cognitoConfig.Domain}/oauth2/authorize?${params.toString()}`;
};