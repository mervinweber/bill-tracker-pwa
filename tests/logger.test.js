import { it, expect, beforeAll, afterAll } from 'vitest';
import { logger } from '../src/utils/logger.js';

let captured = { logs: [], warns: [], errors: [] };
const orig = { log: console.log, warn: console.warn, error: console.error };

beforeAll(() => {
    console.log = (...a) => captured.logs.push(a.join(' '));
    console.warn = (...a) => captured.warns.push(a.join(' '));
    console.error = (...a) => captured.errors.push(a.join(' '));
});

afterAll(() => {
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
});

const clear = () => { captured.logs = []; captured.warns = []; captured.errors = []; };

it('logs a debug message', () => {
    clear();
    logger.debug('debug msg');
    expect(captured.logs.some(l => l.includes('debug msg'))).toBe(true);
});

it('logs an info message', () => {
    clear();
    logger.info('info msg');
    expect(captured.logs.some(l => l.includes('info msg'))).toBe(true);
});

it('logs a warning', () => {
    clear();
    logger.warn('warn msg');
    expect(captured.warns.some(l => l.includes('warn msg'))).toBe(true);
});

it('logs an error', () => {
    clear();
    logger.error('error msg', new Error('oops'));
    expect(captured.errors.some(l => l.includes('error msg'))).toBe(true);
});

it('log format includes timestamp', () => {
    clear();
    logger.info('ts test');
    const hasTimestamp = captured.logs.some(l => /\[\d{2}:\d{2}:\d{2}\]/.test(l));
    expect(hasTimestamp).toBe(true);
});

it('logger getConfig returns expected keys', () => {
    const cfg = logger.getConfig();
    expect(cfg).toHaveProperty('isDevelopment');
    expect(cfg).toHaveProperty('minLogLevel');
});
