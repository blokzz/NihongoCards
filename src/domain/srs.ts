import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating as FsrsRating,
  type Grade,
  type Card as FsrsCard,
} from "ts-fsrs";
import type { Card, FsrsState, Rating } from "@/domain/models";
import type { FsrsSnapshot, ReviewLog } from "@/data/store";

const params = generatorParameters({ enable_fuzz: true });
export const scheduler = fsrs(params);

const iso = (d: Date): string => d.toISOString();

function toFsrsRating(rating: Rating): Grade {
  const map: Record<Rating, Grade> = {
    1: FsrsRating.Again,
    2: FsrsRating.Hard,
    3: FsrsRating.Good,
    4: FsrsRating.Easy,
  };
  return map[rating];
}

export function emptyFsrsSnapshot(now: Date = new Date()): FsrsSnapshot {
  const c = createEmptyCard(now);
  return {
    due: iso(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as FsrsState,
    lastReview: c.last_review ? iso(c.last_review) : null,
  };
}

function toFsrsCard(card: Card): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  } as FsrsCard;
}

export interface GradeResult {
  snapshot: FsrsSnapshot;
  log: ReviewLog;
  correct: boolean;
}

export function gradeCard(card: Card, rating: Rating, now: Date = new Date()): GradeResult {
  const item = scheduler.next(toFsrsCard(card), now, toFsrsRating(rating));
  const c = item.card;
  const l = item.log;

  const snapshot: FsrsSnapshot = {
    due: iso(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as FsrsState,
    lastReview: iso(now),
  };

  const log: ReviewLog = {
    ...snapshot,
    rating,
    lastElapsedDays: l.last_elapsed_days,
    reviewedAt: iso(now),
  };

  return { snapshot, log, correct: rating !== 1 };
}

function humanInterval(fromISO: string, now: Date): string {
  const ms = new Date(fromISO).getTime() - now.getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ${d === 1 ? "dzień" : "dni"}`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mies.`;
  return `${(d / 365).toFixed(1)} lat`;
}

export function previewIntervals(card: Card, now: Date = new Date()): Record<Rating, string> {
  const fc = toFsrsCard(card);
  const one = (r: Rating) => humanInterval(iso(scheduler.next(fc, now, toFsrsRating(r)).card.due), now);
  return { 1: one(1), 2: one(2), 3: one(3), 4: one(4) };
}
