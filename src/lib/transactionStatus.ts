export type FailureCategory = 'Timeout' | 'Insufficient Provider Balance' | 'Declined';

export interface FailureReasonDetails {
  category: FailureCategory;
  title: string;
  badgeLabel: string;
  badgeClass: string;
  badgeDotClass: string;
  tooltipTitle: string;
  tooltipExplanation: string;
  rawReason: string;
}

/**
 * Analyzes transaction failureReason and classifies the root cause
 * into 'Timeout' vs 'Insufficient Provider Balance' vs 'Declined'
 */
export function parseTransactionFailureReason(failureReason?: string): FailureReasonDetails {
  const rawReason = (failureReason || '').trim();
  const lower = rawReason.toLowerCase();

  // 1. Timeout detection: network drops, server timeouts, gateway hang
  const isTimeout =
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('timedout') ||
    lower.includes('etimedout') ||
    lower.includes('econnrefused') ||
    lower.includes('connection error') ||
    lower.includes('connection timed out') ||
    lower.includes('unreachable') ||
    lower.includes('host unreachable') ||
    lower.includes('communication failed') ||
    lower.includes('no communication') ||
    lower.includes('gateway timeout') ||
    lower.includes('time out') ||
    lower.includes('network error');

  if (isTimeout) {
    return {
      category: 'Timeout',
      title: 'Timeout',
      badgeLabel: 'Failed • Timeout',
      badgeClass:
        'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
      badgeDotClass: 'bg-amber-500',
      tooltipTitle: 'Timeout Failure',
      tooltipExplanation:
        'Transaction timed out while awaiting response from upstream provider gateway. Your wallet was not debited.',
      rawReason: rawReason || 'Provider connection timed out.',
    };
  }

  // 2. Insufficient Provider Balance detection: low wallet balance in upstream VTU provider
  const isInsufficientBalance =
    lower.includes('insufficient') ||
    lower.includes('balance is low') ||
    lower.includes('low balance') ||
    lower.includes('fund your gateway') ||
    lower.includes('insufficient wallet') ||
    lower.includes('api balance') ||
    lower.includes('wallet balance low') ||
    lower.includes('balance');

  if (isInsufficientBalance) {
    return {
      category: 'Insufficient Provider Balance',
      title: 'Insufficient Provider Balance',
      badgeLabel: 'Failed • Low Balance',
      badgeClass:
        'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800',
      badgeDotClass: 'bg-orange-500',
      tooltipTitle: 'Insufficient Provider Balance',
      tooltipExplanation:
        'Upstream provider gateway API account balance is low. Provider account requires wallet funding to process orders.',
      rawReason: rawReason || 'Upstream VTUNaija/API gateway balance is insufficient.',
    };
  }

  // 3. Other generic or provider rejection
  return {
    category: 'Declined',
    title: 'Declined',
    badgeLabel: 'Failed',
    badgeClass:
      'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
    badgeDotClass: 'bg-rose-500',
    tooltipTitle: 'Transaction Declined',
    tooltipExplanation:
      rawReason || 'The upstream service provider rejected or cancelled this order.',
    rawReason: rawReason || 'Provider returned a failure response.',
  };
}
