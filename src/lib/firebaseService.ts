import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { firestoreDb, auth } from './firebase.ts';
import { User, Transaction, TransactionStatus, ManualFundingRequest, ManualFundingConfig } from '../types/index.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==================== USER CRUD OPERATIONS ====================

/**
 * Retrieve user document by ID
 */
export async function getUser(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(firestoreDb, 'users', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as User;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Create or overwrite user document in Firestore
 */
export async function setUser(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const docRef = doc(firestoreDb, 'users', user.id);
    await setDoc(docRef, {
      ...user,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update partial user fields in Firestore
 */
export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(firestoreDb, 'users', userId);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete user document in Firestore
 */
export async function deleteUser(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(firestoreDb, 'users', userId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==================== WALLET BALANCE CRUD ====================

/**
 * Get current wallet balance for a user
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const user = await getUser(userId);
  return user?.walletBalance ?? 0;
}

/**
 * Update wallet balance directly in Firestore
 */
export async function updateWalletBalance(userId: string, newBalance: number): Promise<void> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(firestoreDb, 'users', userId);
    await setDoc(docRef, {
      walletBalance: newBalance,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Credit user wallet balance atomically in Firestore using runTransaction
 */
export async function creditWalletBalance(userId: string, amount: number): Promise<number> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(firestoreDb, 'users', userId);
    let balanceAfter = 0;

    await runTransaction(firestoreDb, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User document ${userId} not found in Firestore.`);
      }
      const currentData = userSnap.data() as User;
      const balanceBefore = currentData.walletBalance ?? 0;
      balanceAfter = balanceBefore + amount;

      transaction.update(userRef, {
        walletBalance: balanceAfter,
        updatedAt: new Date().toISOString(),
      });
    });

    return balanceAfter;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Debit user wallet balance atomically in Firestore using runTransaction
 */
export async function debitWalletBalance(userId: string, amount: number): Promise<number> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(firestoreDb, 'users', userId);
    let balanceAfter = 0;

    await runTransaction(firestoreDb, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User document ${userId} not found in Firestore.`);
      }
      const currentData = userSnap.data() as User;
      const balanceBefore = currentData.walletBalance ?? 0;
      if (balanceBefore < amount) {
        throw new Error(`Insufficient wallet balance. Balance is ₦${balanceBefore.toLocaleString()}, required ₦${amount.toLocaleString()}.`);
      }
      balanceAfter = balanceBefore - amount;
      const currentCount = currentData.totalTransactionsCount ?? 0;

      transaction.update(userRef, {
        walletBalance: balanceAfter,
        totalTransactionsCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
      });
    });

    return balanceAfter;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==================== TRANSACTION CRUD ====================

/**
 * Create a transaction document in Firestore
 */
export async function createTransaction(tx: Transaction): Promise<Transaction> {
  const path = `transactions/${tx.id}`;
  try {
    const docRef = doc(firestoreDb, 'transactions', tx.id);
    await setDoc(docRef, {
      ...tx,
      createdAt: tx.date || new Date().toISOString(),
    });
    return tx;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Get a single transaction document by ID
 */
export async function getTransaction(txId: string): Promise<Transaction | null> {
  const path = `transactions/${txId}`;
  try {
    const docRef = doc(firestoreDb, 'transactions', txId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Transaction;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Get recent transactions for a specific user
 */
export async function getUserTransactions(userId: string, limitCount = 50): Promise<Transaction[]> {
  const path = 'transactions';
  try {
    const q = query(
      collection(firestoreDb, path),
      where('userId', '==', userId),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data() as Transaction);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Update transaction status (e.g. successful, reversed, failed)
 */
export async function updateTransactionStatus(
  txId: string,
  status: TransactionStatus,
  failureReason?: string
): Promise<void> {
  const path = `transactions/${txId}`;
  try {
    const docRef = doc(firestoreDb, 'transactions', txId);
    await updateDoc(docRef, {
      status,
      ...(failureReason ? { failureReason } : {}),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==================== REAL-TIME onSnapshot LISTENERS ====================

/**
 * Real-time listener for user profile and wallet balance changes
 */
export function subscribeToUser(
  userId: string,
  onUpdate: (user: User | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}`;
  const docRef = doc(firestoreDb, 'users', userId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as User);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn('User snapshot note:', error.message);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for user transactions list
 */
export function subscribeToTransactions(
  userId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'transactions';
  const q = query(
    collection(firestoreDb, path),
    where('userId', '==', userId),
    limit(40)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as Transaction);
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(list);
    },
    (error) => {
      console.warn('Transactions snapshot note:', error.message);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for all transactions (for Admin)
 */
export function subscribeToAllTransactions(
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'transactions';
  const colRef = collection(firestoreDb, path);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as Transaction);
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(list);
    },
    (error) => {
      console.warn('All transactions snapshot note:', error.message);
      if (onError) onError(error);
    }
  );
}

// Aliases for unified syncing
export const syncTransactionToFirestore = createTransaction;
export const syncUserToFirestore = setUser;

/**
 * Bootstrap/Seed Firestore if documents do not exist yet
 */
export async function initializeFirestoreSeeds(defaultUser: User, defaultTxs: Transaction[]): Promise<void> {
  try {
    const existingUser = await getUser(defaultUser.id);
    if (!existingUser) {
      await setUser(defaultUser);
      console.log('Seeded default user into Firestore:', defaultUser.id);
    }

    // Seed default transactions if not yet present
    for (const tx of defaultTxs) {
      const existingTx = await getTransaction(tx.id);
      if (!existingTx) {
        await createTransaction(tx);
      }
    }
  } catch (err) {
    console.warn('Firestore initial seeding note:', err);
  }
}

// ==================== MANUAL FUNDING FIRESTORE OPERATIONS ====================

export async function saveManualFundingRequestInFirestore(req: ManualFundingRequest): Promise<void> {
  const path = `manual_funding_requests/${req.id}`;
  try {
    const docRef = doc(firestoreDb, 'manual_funding_requests', req.id);
    await setDoc(docRef, {
      ...req,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getManualFundingRequestsFromFirestore(): Promise<ManualFundingRequest[]> {
  const path = 'manual_funding_requests';
  try {
    const colRef = collection(firestoreDb, path);
    const snap = await getDocs(colRef);
    const list = snap.docs.map(d => d.data() as ManualFundingRequest);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateManualFundingRequestStatusInFirestore(
  requestId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const path = `manual_funding_requests/${requestId}`;
  try {
    const docRef = doc(firestoreDb, 'manual_funding_requests', requestId);
    await updateDoc(docRef, {
      status,
      ...(rejectionReason ? { rejectionReason } : {}),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getManualFundingConfigFromFirestore(): Promise<ManualFundingConfig | null> {
  const path = 'settings/manual_funding';
  try {
    const docRef = doc(firestoreDb, 'settings', 'manual_funding');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as ManualFundingConfig;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveManualFundingConfigToFirestore(config: ManualFundingConfig): Promise<void> {
  const path = 'settings/manual_funding';
  try {
    const docRef = doc(firestoreDb, 'settings', 'manual_funding');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
