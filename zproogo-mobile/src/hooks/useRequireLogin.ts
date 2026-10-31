import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../store/auth';

/**
 * Guest-first rule: browsing is free; the login gate opens only when needed
 * (Proceed to Book, My Trips, Wallet, Account). After login the pending action resumes exactly where the user was.
 */
export function useRequireLogin() {
  const nav = useNavigation<any>();
  const user = useAuth((s) => s.user);
  return (then: () => void) => {
    if (user) return then();
    useAuth.getState().setPending(then);
    nav.navigate('LoginGate');
  };
}
