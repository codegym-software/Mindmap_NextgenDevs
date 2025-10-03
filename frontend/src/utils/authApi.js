import { cognitoConfig } from './cognitoConfig';

const API_BASE = 'http://localhost:8081/api/auth';

export const parseResponse = async (response) => {
    const text = await response.text();
    try {
        return { ok: response.ok, body: JSON.parse(text) };
    } catch {
        return { ok: response.ok, body: text || {} };
    }
};

export const checkEmail = async (email) => {
    const resp = await fetch(`${API_BASE}/checkemail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    return await parseResponse(resp);
};

export const loginUser = async (email, password) => {
    const resp = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return await parseResponse(resp);
};

export const registerUser = async (email, password) => {
    const resp = await fetch(`${API_BASE}/cognito/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    return await parseResponse(resp);
};

export const confirmSignup = async (username, code) => {
    const resp = await fetch(`${API_BASE}/cognito/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code }),
    });
    return await parseResponse(resp);
};

export const resendConfirmationCode = async (username) => {
    const resp = await fetch(`${API_BASE}/cognito/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });
    return await parseResponse(resp);
};

export const startForgotPassword = async (username) => {
    const resp = await fetch(`${API_BASE}/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    });
    return await parseResponse(resp);
};

export const confirmResetPassword = async (username, code, newPassword) => {
    const resp = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code, newPassword }),
    });
    return await parseResponse(resp);
};

export const handleGoogleCallback = async (code, onLogin, setErrors, setIsLoading) => {
    setIsLoading(true);
    try {
        const response = await fetch('https://ap-southeast-2t30owwizg.auth.ap-southeast-2.amazoncognito.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: cognitoConfig.ClientId,
                client_secret: cognitoConfig.ClientSecret || '',
                code,
                redirect_uri: cognitoConfig.RedirectUri,
            }),
        });
        const data = await response.json();
        if (response.ok) {
            if (data.id_token) {
                localStorage.setItem('cognito_token', data.id_token);
                const userData = {
                    email: data.email || 'User',
                    name: (data.email || '').split('@')[0],
                    loginTime: new Date().toISOString(),
                    token: data.id_token,
                };
                onLogin(userData);
                window.history.replaceState({}, document.title, '/');
            } else {
                setErrors({ general: 'Không tìm thấy id_token trong phản hồi' });
            }
        } else {
            setErrors({ general: `Lỗi từ server: ${data.error || 'Không xác định'} - ${data.error_description || 'Không có mô tả'}` });
        }
    } catch (err) {
        setErrors({ general: 'Lỗi khi xử lý đăng nhập Google: ' + err.message });
    } finally {
        setIsLoading(false);
    }
};

export const getGoogleLoginUrl = () => {
    return `https://ap-southeast-2t30owwizg.auth.ap-southeast-2.amazoncognito.com/oauth2/authorize?response_type=code&client_id=${cognitoConfig.ClientId}&redirect_uri=${encodeURIComponent(cognitoConfig.RedirectUri)}&scope=${encodeURIComponent(cognitoConfig.Scope || 'openid+email+profile')}&identity_provider=Google`;
};