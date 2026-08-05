import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextOccurrence } from '../../dist/models/Subscription.js';

/* Weekday arithmetic decides when a customer's water actually turns up. */

const iso = (d) => d.toISOString().slice(0, 10);

test('the next Wednesday from a Monday is two days later', () => {
    assert.equal(iso(nextOccurrence(3, new Date('2026-08-03T10:00:00Z'))), '2026-08-05');
});

test('a subscription never fires on the day it is created', () => {
    // The slot for today may already have passed, and a delivery arriving the
    // same hour someone set up a standing order surprises them.
    const monday = new Date('2026-08-03T10:00:00Z');
    assert.equal(iso(nextOccurrence(1, monday)), '2026-08-10');
});

test('Sunday is 7, not 0', () => {
    assert.equal(iso(nextOccurrence(7, new Date('2026-08-03T10:00:00Z'))), '2026-08-09');
});

test('it lands at midnight so the date is unambiguous', () => {
    const d = nextOccurrence(5, new Date('2026-08-03T23:59:00Z'));
    assert.equal(d.getUTCHours(), 0);
    assert.equal(d.getUTCMinutes(), 0);
});
