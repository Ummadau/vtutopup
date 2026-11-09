/**
 * Safe Haptic Feedback utility using the browser Vibration API (navigator.vibrate).
 * Provides crisp, native-feeling tactile feedback on mobile devices.
 */

export const isVibrationSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
};

/**
 * Triggers a vibration pattern if supported by the client device.
 * Gracefully ignores unsupported devices or restricted contexts without throwing.
 */
export const triggerVibration = (pattern: number | number[]): boolean => {
  try {
    if (isVibrationSupported()) {
      return navigator.vibrate(pattern);
    }
  } catch {
    // Graceful fallback for strict iframe permission-policy or disabled device settings
  }
  return false;
};

/**
 * Haptic pattern for successful transactions:
 * A crisp, satisfying double pulse: 35ms pulse, 60ms pause, 50ms pulse.
 */
export const hapticSuccess = (): boolean => {
  return triggerVibration([35, 60, 50]);
};

/**
 * Haptic pattern for navigation clicks & tab switches:
 * A subtle, crisp 12ms micro-pulse for mobile navigation bar & cards.
 */
export const hapticNavClick = (): boolean => {
  return triggerVibration(12);
};

/**
 * Haptic pattern for selection & toggle interactions:
 * A light 16ms tap.
 */
export const hapticLight = (): boolean => {
  return triggerVibration(16);
};

/**
 * Haptic pattern for button confirmations:
 * A medium 28ms pulse.
 */
export const hapticMedium = (): boolean => {
  return triggerVibration(28);
};

/**
 * Haptic pattern for transaction or form errors:
 * A distinct buzz: 50ms pulse, 70ms pause, 60ms pulse.
 */
export const hapticError = (): boolean => {
  return triggerVibration([50, 70, 60]);
};
