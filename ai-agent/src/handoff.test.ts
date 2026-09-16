import { describe, expect, it } from 'vitest';
import { enforceHandoffGate, hasKeyInfo, stripHandoffPhrase } from './handoff';

const base = () => ({
  reply: 'Baik, agen kami akan menghubungi Anda.',
  lead_data: {
    budget: null as string | null,
    area: null as string | null,
    property_type: null as string | null,
  },
  needs_human_followup: true,
  next_action: 'human_followup',
});

describe('hasKeyInfo', () => {
  it('requires budget + area + property_type', () => {
    expect(hasKeyInfo({ budget: '2 M', area: 'Bekasi', property_type: 'Ruko' })).toBe(true);
    expect(hasKeyInfo({ budget: null, area: 'Bekasi', property_type: 'Ruko' })).toBe(false);
    expect(hasKeyInfo({ budget: '2 M', area: '', property_type: 'Ruko' })).toBe(false);
  });

  it('tolerates nullish input', () => {
    expect(hasKeyInfo(null)).toBe(false);
    expect(hasKeyInfo(undefined)).toBe(false);
  });
});

describe('enforceHandoffGate', () => {
  it('blocks handoff when budget is missing and strips the closing line', () => {
    const result = enforceHandoffGate({
      ...base(),
      lead_data: { budget: null, area: 'Bekasi', property_type: 'Ruko' },
    });

    expect(result.needs_human_followup).toBe(false);
    expect(result.next_action).toBe('collect_info');
    expect(result.reply.toLowerCase()).not.toContain('menghubungi anda');
  });

  it('keeps handoff when all key fields are present', () => {
    const result = enforceHandoffGate({
      ...base(),
      lead_data: { budget: '2 M', area: 'Bekasi', property_type: 'Ruko' },
    });

    expect(result.needs_human_followup).toBe(true);
  });

  it('catches fallback wording from the LLM', () => {
    const result = enforceHandoffGate({
      reply: 'Area itu belum tersedia. Agen kami akan menghubungi Anda.',
      lead_data: { budget: null, area: 'Bekasi', property_type: null },
      needs_human_followup: true,
      next_action: 'human_followup',
    });

    expect(result.reply.toLowerCase()).not.toContain('menghubungi anda');
    expect(result.needs_human_followup).toBe(false);
  });

  it('tolerates malformed input', () => {
    const result = enforceHandoffGate({
      reply: 'Halo',
      lead_data: {},
      needs_human_followup: undefined,
    });

    expect(result.needs_human_followup).toBeFalsy();
    expect(result.reply).toBe('Halo');
  });
});

describe('stripHandoffPhrase', () => {
  it('removes the whole handoff sentence', () => {
    expect(stripHandoffPhrase('Baik. Agen kami akan menghubungi Anda. Terima kasih.')).toBe(
      'Baik. Terima kasih.'
    );
  });
});
