import { SCORED_FIELDS, type KnownLead } from '../types';
import { hasText } from './leadData';

export const computeScore = (known: KnownLead): number =>
  SCORED_FIELDS.reduce((score, field) => score + (hasText(known[field]) ? 20 : 0), 0);

export const computeStatus = (score: number): 'hot' | 'warm' | 'cold' => {
  if (score >= 60) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
};
