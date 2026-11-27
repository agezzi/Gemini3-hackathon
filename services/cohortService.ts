import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { UserProfileRecord, DailyPlanRecord, CoachFeedbackItem, MemberStatus, ZenScoreRecord } from '../types';

export const ADMIN_EMAIL = 'agejirizume@gmail.com';

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Saves or updates a user profile and telemetry in Firestore
 */
export async function syncUserProfile(data: Partial<UserProfileRecord> & { id: string; email?: string }) {
  const path = `users/${data.id}`;
  try {
    const userDocRef = doc(db, 'users', data.id);
    const email = data.email || auth.currentUser?.email || '';
    const payload: Record<string, any> = {
      ...data,
      email,
      lastActiveAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    };
    if (data.displayName) payload.displayName = data.displayName;
    if (data.currentStreak !== undefined) payload.currentStreak = data.currentStreak;
    if (data.highestStreak !== undefined) payload.highestStreak = data.highestStreak;
    if (data.totalPlansGenerated !== undefined) payload.totalPlansGenerated = data.totalPlansGenerated;
    if (data.totalFocusMinutes !== undefined) payload.totalFocusMinutes = data.totalFocusMinutes;
    if (data.dailyFocusMinutes !== undefined) payload.dailyFocusMinutes = data.dailyFocusMinutes;
    if (data.currentStatus) payload.currentStatus = data.currentStatus;
    if (data.mainGoal !== undefined) payload.mainGoal = data.mainGoal;
    if (data.goalHistory !== undefined) payload.goalHistory = data.goalHistory;
    if (data.emailDigestSettings !== undefined) payload.emailDigestSettings = data.emailDigestSettings;
    if (data.activeUiTheme !== undefined) payload.activeUiTheme = data.activeUiTheme;

    await setDoc(userDocRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to real-time changes to a user's own profile in Firestore
 */
export function subscribeToUserProfile(userId: string, onUpdate: (profile: Partial<UserProfileRecord> | null) => void) {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    return onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserProfileRecord);
      } else {
        onUpdate(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Saves a generated daily plan into the user's subcollection
 */
export async function saveDailyPlanToCloud(userId: string, plan: {
  date: string;
  adaptedPlan: string;
  insights?: string;
  explanation?: string;
  completionRate?: number;
}) {
  const planId = `plan_${Date.now()}`;
  const path = `users/${userId}/plans/${planId}`;
  try {
    const planRef = doc(db, 'users', userId, 'plans', planId);
    await setDoc(planRef, {
      id: planId,
      userId,
      ...plan,
      createdAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp()
    });

    // Also update user's lastActive & latestPlanSnippet
    await syncUserProfile({
      id: userId,
      email: auth.currentUser?.email || '',
      currentStatus: 'plan_ready',
      latestPlanSnippet: plan.adaptedPlan.slice(0, 150) + '...'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Subscribes in real-time to Zen meditation scores across the cohort
 */
export function subscribeToZenCohortScores(onUpdate: (scores: ZenScoreRecord[]) => void) {
  const path = 'zen_scores';
  try {
    const scoresCol = collection(db, 'zen_scores');
    return onSnapshot(scoresCol, (snapshot) => {
      const scores: ZenScoreRecord[] = [];
      snapshot.forEach(docSnap => {
        scores.push(docSnap.data() as ZenScoreRecord);
      });
      scores.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(scores);
    }, (error) => {
      console.warn('Zen cohort scores subscription notice:', error);
    });
  } catch (error) {
    console.warn('Zen cohort scores init notice:', error);
    return () => {};
  }
}

/**
 * Subscribes in real-time to all cohort members for the Admin CMS
 */
export function subscribeToCohort(onUpdate: (members: UserProfileRecord[]) => void, onError?: (err: any) => void) {
  const path = 'users';
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(usersCol, (snapshot) => {
      const members: UserProfileRecord[] = [];
      snapshot.forEach(docSnap => {
        members.push(docSnap.data() as UserProfileRecord);
      });
      // Sort by last active descending
      members.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
      onUpdate(members);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Subscribes to real-time feedback for a specific user
 */
export function subscribeToFeedback(userId: string, onUpdate: (feedback: CoachFeedbackItem[]) => void) {
  const path = `users/${userId}/feedback`;
  try {
    const fbCol = collection(db, 'users', userId, 'feedback');
    return onSnapshot(fbCol, (snapshot) => {
      const items: CoachFeedbackItem[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as CoachFeedbackItem);
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Subscribes to plans for a specific user
 */
export function subscribeToMemberPlans(userId: string, onUpdate: (plans: DailyPlanRecord[]) => void) {
  const path = `users/${userId}/plans`;
  try {
    const plansCol = collection(db, 'users', userId, 'plans');
    return onSnapshot(plansCol, (snapshot) => {
      const plans: DailyPlanRecord[] = [];
      snapshot.forEach(docSnap => {
        plans.push(docSnap.data() as DailyPlanRecord);
      });
      plans.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(plans);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Sends feedback from Coach / Admin CMS to a user
 */
export async function sendFeedbackToMember(feedback: {
  userId: string;
  adminId: string;
  adminEmail: string;
  title: string;
  message: string;
  type: 'kudos' | 'warning' | 'strategy' | 'checkin';
}) {
  const feedbackId = `fb_${Date.now()}`;
  const path = `users/${feedback.userId}/feedback/${feedbackId}`;
  try {
    const fbRef = doc(db, 'users', feedback.userId, 'feedback', feedbackId);
    await setDoc(fbRef, {
      id: feedbackId,
      ...feedback,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Marks a feedback item as read by the member
 */
export async function markFeedbackRead(userId: string, feedbackId: string) {
  const path = `users/${userId}/feedback/${feedbackId}`;
  try {
    const fbRef = doc(db, 'users', userId, 'feedback', feedbackId);
    await updateDoc(fbRef, { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Resets a single member's streaks, focus history, goals, and plans in Firestore
 * while preserving their account identity and cognitive archetype profile.
 */
export async function resetUserProgressInCloud(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const existing = snap.data() as Partial<UserProfileRecord>;
      await updateDoc(userDocRef, {
        id: existing.id || userId,
        email: existing.email || auth.currentUser?.email || '',
        displayName: existing.displayName || auth.currentUser?.displayName || 'Member',
        currentStreak: 0,
        highestStreak: 0,
        totalPlansGenerated: 0,
        totalFocusMinutes: 0,
        dailyFocusMinutes: {},
        mainGoal: null,
        goalHistory: [],
        activeUiTheme: 'default',
        currentStatus: 'idle',
        latestPlanSnippet: '',
        updatedAt: serverTimestamp(),
      });
    }

    const [plansSnap, zenSnap] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'plans')),
      getDocs(query(collection(db, 'zen_scores'), where('userId', '==', userId))),
    ]);

    const refsToDelete = [
      ...plansSnap.docs.map((d) => d.ref),
      ...zenSnap.docs.map((d) => d.ref),
    ];

    for (let i = 0; i < refsToDelete.length; i += 400) {
      const chunk = refsToDelete.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  } catch (error) {
    console.warn('Cloud progress reset notice:', error);
  }
}

/**
 * Permanently clears all Firestore documents (users, subcollections, zen_scores, zen_winners)
 * and local test caches so the application starts in a completely fresh production state.
 * Requires verified Admin privileges enforced by Firestore Security Rules.
 */
export async function purgeAllBackendData(): Promise<{
  deletedUsers: number;
  deletedSubdocs: number;
  deletedZenScores: number;
  deletedZenWinners: number;
}> {
  let deletedUsers = 0;
  let deletedSubdocs = 0;
  let deletedZenScores = 0;
  let deletedZenWinners = 0;

  const refsToDelete: Array<{ ref: ReturnType<typeof doc>; category: 'user' | 'sub' | 'score' | 'winner' }> = [];

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const [plansSnap, feedbackSnap] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'plans')),
        getDocs(collection(db, 'users', uid, 'feedback'))
      ]);

      plansSnap.docs.forEach((p) => refsToDelete.push({ ref: p.ref, category: 'sub' }));
      feedbackSnap.docs.forEach((f) => refsToDelete.push({ ref: f.ref, category: 'sub' }));
      refsToDelete.push({ ref: userDoc.ref, category: 'user' });
    }

    const [zenScoresSnap, zenWinnersSnap] = await Promise.all([
      getDocs(collection(db, 'zen_scores')),
      getDocs(collection(db, 'zen_winners'))
    ]);

    zenScoresSnap.docs.forEach((s) => refsToDelete.push({ ref: s.ref, category: 'score' }));
    zenWinnersSnap.docs.forEach((w) => refsToDelete.push({ ref: w.ref, category: 'winner' }));

    // Commit deletes in batches of 400 to stay safely below Firestore's 500-op batch ceiling
    for (let i = 0; i < refsToDelete.length; i += 400) {
      const chunk = refsToDelete.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        batch.delete(item.ref);
        if (item.category === 'user') deletedUsers += 1;
        else if (item.category === 'sub') deletedSubdocs += 1;
        else if (item.category === 'score') deletedZenScores += 1;
        else if (item.category === 'winner') deletedZenWinners += 1;
      });
      await batch.commit();
    }

    // Clear test/demo local storage keys in the current browser session
    if (typeof window !== 'undefined') {
      [
        'neuralplan_v12_stable',
        'neuralplan_onboarded_completed_v12',
        'neuralplan_zen_local_scores_v1',
        'neuralplan_zen_weekly_winners_v1',
        'neuralplan_xr_last_report_v1'
      ].forEach((k) => window.localStorage.removeItem(k));
    }

    return { deletedUsers, deletedSubdocs, deletedZenScores, deletedZenWinners };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'users|zen_scores|zen_winners');
    return { deletedUsers, deletedSubdocs, deletedZenScores, deletedZenWinners };
  }
}
