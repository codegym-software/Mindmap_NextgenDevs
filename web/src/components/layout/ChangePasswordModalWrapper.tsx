import React, { useContext } from 'react';
import { AuthContext } from '../../app/providers/AuthProvider';
import ChangePasswordModal from '../../features/auth/ChangePasswordModal';

export function ChangePasswordModalWrapper() {
  const authCtx = useContext(AuthContext);
  
  if (!authCtx) {
    return null;
  }
  
  return (
    <ChangePasswordModal
      isOpen={authCtx.isChangePasswordOpen}
      onClose={() => authCtx.closeChangePassword()}
    />
  );
}

export default ChangePasswordModalWrapper;


