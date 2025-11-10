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
import { clearTokens } from '../services/authStorage'; // <--- IMPORT ĐÃ THÊM

// 1. Khởi tạo User Pool
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

// 2. Wrapper cho hàm Đăng ký (Sign Up)
export const signUp = (email: string, password: string): Promise<{ user: CognitoUser; username: string }> => {
 return new Promise((resolve, reject) => {
  const attributeList = [
   new CognitoUserAttribute({ Name: 'email', Value: email }),
  ];

  // TẠO UUID LÀM USERNAME
  const username = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
   var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
   return v.toString(16);
  });
 
  UserPool.signUp(username, password, attributeList, [], (err: Error | undefined, result?: ISignUpResult) => {
   if (err) {
    return reject(err);
   }
   if (result) {
    // Trả về user, người này sẽ cần được xác nhận
    // SỬA: Trả về cả 'user' VÀ 'username' (UUID)
    resolve({ user: result.user, username: username });
   } else {
    reject(new Error("SignUp failed: No result returned"));
   }
  });
 });
};

// 3. Wrapper cho hàm Xác nhận Đăng ký (Confirm Sign Up)
export const confirmSignUp = (username: string, code: string): Promise<string> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: username,
   Pool: UserPool,
  });

  // SỬA: Đổi 'Error | null' thành 'Error | undefined'
  cognitoUser.confirmRegistration(code, true, (err: Error | undefined, result?: any) => {
   if (err) {
    return reject(err);
   }
   resolve(result);
  });
 });
};

// 4. Wrapper cho hàm Gửi lại mã Xác nhận
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

// 5. Wrapper cho hàm Đăng nhập (Sign In)
export const signIn = (emailOrUsername: string, password: string): Promise<CognitoUserSession> => {
 return new Promise((resolve, reject) => {
  const authenticationDetails = new AuthenticationDetails({
   Username: emailOrUsername, // Người dùng nhập email (vì đã cấu hình alias)
   Password: password,
  });

  const cognitoUser = new CognitoUser({
   Username: emailOrUsername, // Dùng email (alias)
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

// 6. Wrapper để lấy Session (và làm mới token nếu cần)
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
    // Thử làm mới token nếu session không hợp lệ
    // Cần kiểm tra session và refreshToken tồn tại trước khi dùng
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

// 7. Wrapper cho Quên Mật khẩu (Forgot Password)
export const forgotPassword = (email: string): Promise<any> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: email, // Dùng email (alias)
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

// 8. Wrapper cho Đặt lại Mật khẩu (Confirm Reset Password)
export const confirmResetPassword = (email: string, code: string, newPassword: string): Promise<void> => {
 return new Promise((resolve, reject) => {
  const cognitoUser = new CognitoUser({
   Username: email, // Dùng email (alias)
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

export const signOut = async (): Promise<void> => {
 // 1. Bắt đầu loading (nếu dùng UI store)
 // dispatch(setAuthLoading(true));

 try {
  // 2. Xóa session Cognito cục bộ (localStorage, memory)
  const cognitoUser = UserPool.getCurrentUser();
  if (cognitoUser) {
   cognitoUser.signOut(); // Xóa token trong storage
  }

  // 3. Xóa toàn bộ state frontend (Redux, Zustand, Context, localStorage thủ công)
  clearFrontendAuthState(); // <--- HÀM NÀY SẼ ĐƯỢC CẬP NHẬT BÊN DƯỚI

  // 4. Xây dựng URL logout an toàn (Global Sign-Out)
  const logoutUri = `${window.location.origin}/dashboard`; 
  const logoutUrl = new URL(`https://${cognitoConfig.Domain}/logout`);

  logoutUrl.searchParams.set('client_id', cognitoConfig.ClientId);
  logoutUrl.searchParams.set('logout_uri', logoutUri);

  // 5. Redirect đến Cognito để hủy refresh token toàn cục
  window.location.replace(logoutUrl.toString());

  // Lưu ý: Không có code nào chạy sau dòng này
  // Vì trình duyệt đã chuyển trang

 } catch (error) {
  console.error('[CognitoDirect] Sign out error:', error);
 
  // Fallback: Vẫn xóa local và redirect về dashboard
  clearFrontendAuthState();
  window.location.replace(`${window.location.origin}/dashboard`);
 } finally {
  // dispatch(setAuthLoading(false));
 }
};

/**
* Xóa toàn bộ state liên quan đến auth ở frontend
* Gọi hàm này ở mọi nơi cần logout
*/
const clearFrontendAuthState = (): void => {
 // 1. Xóa localStorage (nếu có key riêng)
 localStorage.removeItem('lastAuthTime');
 localStorage.removeItem('userPreferences'); // ví dụ

 // SỬA Ở ĐÂY: Gọi clearTokens để xóa "mm_tokens"
 clearTokens();

 // 2. Xóa sessionStorage (nếu dùng)
 sessionStorage.clear();
};

