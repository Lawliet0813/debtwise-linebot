import { describe, it, expect } from 'vitest';
import { routeTextCommand } from '../src/handlers.js';

describe('routeTextCommand', () => {
  it('returns help instructions', () => {
    const result = routeTextCommand('help');
    expect(result.command).toBe('help');
    expect(result.messages[0].type).toBe('text');
    expect(result.messages[0].text).toContain('dashboard');
    expect(result.messages[0].text).toContain('開啟儀表板');
  });

  it('returns flex message for dashboard command', () => {
    const result = routeTextCommand('dashboard', { userId: 'U123' });
    expect(result.command).toBe('dashboard');
    expect(result.messages[0].type).toBe('flex');
    expect(result.messages[0].altText).toBe('DebtWise 儀表板');
  });

  it('falls back for unknown text', () => {
    const result = routeTextCommand('unknown phrase');
    expect(result.command).toBe('fallback');
    expect(result.messages[0].text).toContain('help 查看使用方式');
  });
});
