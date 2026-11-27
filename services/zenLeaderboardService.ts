// Real-time Firestore service for Zen Leaderboard, Weekly Tournaments, and Badges

import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { ZenScoreRecord, ZenWeeklyWinnerRecord } from '../types';

const LOCAL_ZEN_SCORES_KEY = 'neuralplan_zen_local_scores_v1';
const LOCAL_WEEKLY_WINNERS_KEY = 'neuralplan_zen_weekly_winners_v1';

/**
 * Returns the ISO week identifier string (e.g., "2026-W45")
 */
export function getCurrentWeekId(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Gets remaining time in the current weekly tournament
 */
export function getRemainingTimeInWeek(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);

  const diffMs = Math.max(0, endOfWeek.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

/**
 * Saves a completed Zen meditation and focus game score
 */
export async function submitZenScore(score: Omit<ZenScoreRecord, 'id' | 'createdAt' | 'weekId'>): Promise<ZenScoreRecord> {
  const weekId = getCurrentWeekId();
  const scoreId = `zen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullRecord: ZenScoreRecord = {
    ...score,
    id: scoreId,
    weekId,
    createdAt: new Date().toISOString()
  };

  // Always save locally first
  try {
    const existingRaw = localStorage.getItem(LOCAL_ZEN_SCORES_KEY);
    const existing: ZenScoreRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.unshift(fullRecord);
    // Keep last 100 locally
    localStorage.setItem(LOCAL_ZEN_SCORES_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch (err) {
    console.warn('Local storage write warning:', err);
  }

  // If signed in, sync to Firestore
  if (auth.currentUser) {
    const path = `zen_scores/${scoreId}`;
    try {
      const scoreRef = doc(db, 'zen_scores', scoreId);
      await setDoc(scoreRef, {
        ...fullRecord,
        userId: auth.currentUser.uid,
        serverCreatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  return fullRecord;
}

/**
 * Subscribes to real-time weekly tournament scores
 */
export function subscribeToWeeklyLeaderboard(
  weekId: string, 
  onUpdate: (scores: ZenScoreRecord[]) => void
): () => void {
  // If not authenticated or in offline fallback mode, read from local storage
  if (!auth.currentUser) {
    const readLocal = () => {
      try {
        const raw = localStorage.getItem(LOCAL_ZEN_SCORES_KEY);
        const all: ZenScoreRecord[] = raw ? JSON.parse(raw) : [];
        const filtered = all
          .filter(s => s.weekId === weekId)
          .sort((a, b) => b.score - a.score);
        onUpdate(filtered.slice(0, 50));
      } catch {
        onUpdate([]);
      }
    };
    readLocal();
    return () => {};
  }

  const path = 'zen_scores';
  try {
    const scoresCol = collection(db, 'zen_scores');
    const q = query(
      scoresCol,
      where('weekId', '==', weekId),
      orderBy('score', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const cloudScores: ZenScoreRecord[] = [];
      snapshot.forEach(docSnap => {
        cloudScores.push(docSnap.data() as ZenScoreRecord);
      });

      // Merge with local scores for instant feedback
      try {
        const localRaw = localStorage.getItem(LOCAL_ZEN_SCORES_KEY);
        const localList: ZenScoreRecord[] = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map<string, ZenScoreRecord>();
        
        // Add cloud scores
        cloudScores.forEach(s => mergedMap.set(s.id, s));
        // Add local scores for current week
        localList.filter(s => s.weekId === weekId).forEach(s => {
          if (!mergedMap.has(s.id)) mergedMap.set(s.id, s);
        });

        const sorted = Array.from(mergedMap.values()).sort((a, b) => b.score - a.score);
        onUpdate(sorted);
      } catch {
        onUpdate(cloudScores);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Subscribes to all-time Zen Masters leaderboard
 */
export function subscribeToAllTimeLeaderboard(
  onUpdate: (scores: ZenScoreRecord[]) => void
): () => void {
  if (!auth.currentUser) {
    try {
      const raw = localStorage.getItem(LOCAL_ZEN_SCORES_KEY);
      const all: ZenScoreRecord[] = raw ? JSON.parse(raw) : [];
      onUpdate(all.sort((a, b) => b.score - a.score).slice(0, 50));
    } catch {
      onUpdate([]);
    }
    return () => {};
  }

  const path = 'zen_scores';
  try {
    const scoresCol = collection(db, 'zen_scores');
    const q = query(
      scoresCol,
      orderBy('score', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const list: ZenScoreRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ZenScoreRecord);
      });
      onUpdate(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Subscribes to the reigning Weekly Champion award document
 */
export function subscribeToWeeklyWinner(
  weekId: string,
  onUpdate: (winner: ZenWeeklyWinnerRecord | null) => void
): () => void {
  const awardId = `award_${weekId}`;
  if (!auth.currentUser) {
    try {
      const raw = localStorage.getItem(LOCAL_WEEKLY_WINNERS_KEY);
      const winners: Record<string, ZenWeeklyWinnerRecord> = raw ? JSON.parse(raw) : {};
      onUpdate(winners[awardId] || null);
    } catch {
      onUpdate(null);
    }
    return () => {};
  }

  const path = `zen_winners/${awardId}`;
  try {
    const winnerRef = doc(db, 'zen_winners', awardId);
    return onSnapshot(winnerRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as ZenWeeklyWinnerRecord);
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
 * Crowns and saves a weekly winner
 */
export async function recordWeeklyWinner(winner: ZenWeeklyWinnerRecord) {
  const awardId = winner.id;
  try {
    const raw = localStorage.getItem(LOCAL_WEEKLY_WINNERS_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[awardId] = winner;
    localStorage.setItem(LOCAL_WEEKLY_WINNERS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Local winner cache error:', e);
  }

  if (auth.currentUser) {
    const path = `zen_winners/${awardId}`;
    try {
      const docRef = doc(db, 'zen_winners', awardId);
      await setDoc(docRef, {
        ...winner,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}
