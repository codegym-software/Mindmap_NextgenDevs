// src/auth/cognitoDirect.ts
import {
 CognitoUserPool,
 CognitoUserAttribute,
 CognitoUser,
 AuthenticationDetails,
 type CognitoUserSession,
 type ISignUpResult,
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from './cognitoConfig';
import { clearTokens } from '../services/authStorage';

// 1. Khởi tạo User Pool (Không thay đổi)
if (!cognitoConfig.UserPoolId || !cognitoConfig.ClientId) {
 throw new Error(
  `[CognitoDirect] Lỗi cấu hình: Vui lòng kiểm tra VITE_COGNITO_USER_POOL_ID (${cognitoConfig.UserPoolId})
  và VITE_COGNito_CLIENT_ID (${cognitoConfig.ClientId}) trong file .env của bạn.`
 );
}
const poolData = {
 UserPoolId: cognitoConfig.UserPoolId,
 ClientId: cognitoConfig.ClientId,
};
const UserPool = new CognitoUserPool(poolData);

// 2. Wrapper cho hàm Đăng ký (Sign Up) (Không thay đổi)
export const signUp = (email: string, password: string): Promise<{ user: CognitoUser; username: string }> => {
 return new Promise((resolve, reject) => {
  const attributeList = [
   new CognitoUserAttribute({ Name: 'email', Value: email }),
  ];
  const username = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
   var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
   return v.toString(16);
  });
  UserPool.signUp(username, password, attributeList, [], (err: Error | undefined, result?: ISignUpResult) => {
   if (err) {
    return reject(err);
   }
   if (result) {
    resolve({ user: result.user, username: username });
   } else {
    reject(new Error("SignUp failed: No result returned"));
   }
  });
 });
};

// 3. Wrapper cho hàm Xác nhận Đăng ký (Confirm Sign Up) (Không thay đổi)
export const confirmSignUp = (username: string, code: string): Promise<string> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: username,
   Pool: UserPool,
  });
  cognitoUser.confirmRegistration(code, true, (err: Error | undefined, result?: any) => {
   if (err) {
    return reject(err);
   }
   resolve(result);
  });
 });
};

// 4. Wrapper cho hàm Gửi lại mã Xác nhận (Không thay đổi)
export const resendConfirmationCode = (username: string): Promise<string> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: username,
   Pool: UserPool,
  });
  cognitoUser.resendConfirmationCode((err: Error | undefined, result?: any) => {
   if (err) {
    return reject(err);
   }
   resolve(result);
  });
 });
};

// 5. Wrapper cho hàm Đăng nhập (Sign In) (Không thay đổi)
export const signIn = (emailOrUsername: string, password: string): Promise<CognitoUserSession> => {
 return new Promise((resolve, reject) => {
  const authenticationDetails = new AuthenticationDetails({
   Username: emailOrUsername,
   Password: password,
  });
  const cognitoUser = new CognitoUser({
   Username: emailOrUsername,
   Pool: UserPool,
  });
  cognitoUser.authenticateUser(authenticationDetails, {
   onSuccess: (session: CognitoUserSession) => {
    resolve(session);
   },
   onFailure: (err: Error) => {
    reject(err);
   },
  });
 });
};

// 6. Wrapper để lấy Session (và làm mới token nếu cần) (Không thay đổi)
export const getCurrentUserSession = (): Promise<CognitoUserSession> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = UserPool.getCurrentUser();
  if (!cognitoUser) {
   return reject(new Error("No user found. Please sign in."));
  }
  cognitoUser.getSession((err: Error | undefined, session: CognitoUserSession | null) => {
   if (err) {
    return reject(err);
   }
   if (session && session.isValid()) {
    resolve(session);
   } else {
    const refreshToken = session?.getRefreshToken();
    if (!refreshToken) {
     return reject(new Error("No refresh token available for session refresh."));
    }
    cognitoUser.refreshSession(refreshToken, (err: Error | undefined, newSession: CognitoUserSession) => {
     if (err) {
      return reject(err);
     }
     resolve(newSession);
    });
   }
  });
 });
};

// 7. Wrapper cho Quên Mật khẩu (Forgot Password) (Không thay đổi)
export const forgotPassword = (email: string): Promise<any> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: email,
   Pool: UserPool,
  });
  cognitoUser.forgotPassword({
   onSuccess: (result: any) => {
    resolve(result);
   },
   onFailure: (err: Error) => {
    reject(err);
   },
  });
 });
};

// 8. Wrapper cho Đặt lại Mật khẩu (Confirm Reset Password) (Không thay đổi)
export const confirmResetPassword = (email: string, code: string, newPassword: string): Promise<void> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: email,
   Pool: UserPool,
  });
  cognitoUser.confirmPassword(code, newPassword, {
   onSuccess: () => {
    resolve();
   },
   onFailure: (err: Error) => {
    reject(err);
   },
  });
 });
};

/**
 * [ĐÃ CẬP NHẬT] Sửa lỗi Đăng xuất
 */
export const signOut = async (): Promise<void> => {
 try {
  // 1. Xóa session Cognito cục bộ
  const cognitoUser = UserPool.getCurrentUser();
  if (cognitoUser) {
   cognitoUser.signOut();
  }

  // 2. Xóa toàn bộ state frontend
  clearFrontendAuthState();

  // 3. Xây dựng URL logout an toàn
  const logoutUri = `${window.location.origin}/dashboard`; 
  const logoutUrl = new URL(`https://${cognitoConfig.Domain}/logout`);

  // 4. [FIX] Thêm 'response_type' VÀ 'logout_uri'
  logoutUrl.searchParams.set('response_type', 'code');
  logoutUrl.searchParams.set('client_id', cognitoConfig.ClientId);
  logoutUrl.searchParams.set('logout_uri', logoutUri);

  // 5. Redirect đến Cognito
  window.location.replace(logoutUrl.toString());

 } catch (error) {
  console.error('[CognitoDirect] Sign out error:', error);
  // Fallback: Vẫn xóa local và redirect về dashboard
  clearFrontendAuthState();
  window.location.replace(`${window.location.origin}/dashboard`);
 }
};

/**
* Xóa toàn bộ state liên quan đến auth ở frontend
*/
const clearFrontendAuthState = (): void => {
 localStorage.removeItem('lastAuthTime');
 localStorage.removeItem('userPreferences');
 clearTokens();
 sessionStorage.clear();
};