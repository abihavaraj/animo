import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../store';
import { logoutUserWithCredentialSave } from '../store/authSlice';

export interface UseLogoutWithCredentialSave {
  logoutWithCredentialSave: () => Promise<void>;
  isLoading: boolean;
}

export const useLogoutWithCredentialSave = (): UseLogoutWithCredentialSave => {
  const dispatch = useAppDispatch();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  const logoutWithCredentialSave = async () => {
    try {
      await dispatch(logoutUserWithCredentialSave()).unwrap();
    } catch (error) {
      console.error('Logout with credential save failed:', error);
      // Even if it fails, we should still proceed with logout
      // The action will handle clearing local state
    }
  };

  return {
    logoutWithCredentialSave,
    isLoading
  };
};
