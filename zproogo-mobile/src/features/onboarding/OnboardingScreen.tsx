import React from 'react';
import OnboardingAuth, { AuthResult } from '../../components/onboarding';
import { usePrefs } from '../../store/prefs';
import { useSecureScreen } from '../../security/useSecureScreen';

/**
 * First screen after installing the app (RootNavigator shows it while prefs.onboarded is false).
 * Image slider + login / create account in one component; replaces the old 3 onboarding pages.
 *
 *   Skip              -> guest mode  -> Location screen (first time) -> Home
 *   Logged in (OTP)   -> Welcome     -> Location screen (first time) -> Home
 *   Logged in (Google, mobile number still missing) -> LinkMobile -> Welcome -> ...
 */
export function OnboardingScreen({ navigation }: any) {
  useSecureScreen(); // OTP is typed here: block screenshots / screen recording, same as the login sheet
  const nextAfterOnboarding = () => (usePrefs.getState().locationAsked ? 'Main' : 'Location');

  const onSkip = () => {
    usePrefs.getState().set({ onboarded: true });
    navigation.replace(nextAfterOnboarding());
  };

  const onAuthSuccess = (r: AuthResult) => {
    usePrefs.getState().set({ onboarded: true });
    if (r.needsMobile) navigation.replace('LinkMobile', { fromOnboarding: true });
    else navigation.replace('Welcome', { merged: r.merged, fromOnboarding: true });
  };

  return <OnboardingAuth onSkip={onSkip} onAuthSuccess={onAuthSuccess} />;
}
