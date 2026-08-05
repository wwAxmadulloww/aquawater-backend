import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemsTotal, orderTotal, orderBottles } from '../../client/src/lib/orderFormat.ts';

/*
 * The arithmetic every screen depends on. These ran only as throwaway scripts
 * against production before, which meant nothing stopped a refactor from
 * quietly changing what a customer is charged.
 */

const line = (price, qty, deposit = 0) => ({ priceSnapshot: price, qty, depositSnapshot: deposit });

test('goods add up at the prices captured when the order was placed', () => {
    assert.equal(itemsTotal({ items: [line(25000, 3), line(15000, 2)] }), 105000);
});

test('a bought container is charged on top of the water', () => {
    assert.equal(itemsTotal({ items: [line(25000, 2, 35000)] }), 120000);
});

test('the total the courier collects includes the delivery fee', () => {
    assert.equal(orderTotal({ items: [line(25000, 2)], deliveryFee: 15000 }), 65000);
});

test('a missing fee is not a missing total', () => {
    assert.equal(orderTotal({ items: [line(10000, 1)] }), 10000);
});

test('an order with no items is worth nothing, not NaN', () => {
    assert.equal(orderTotal({}), 0);
    assert.equal(itemsTotal(null), 0);
});

test('containers to return come from what the order recorded', () => {
    const b = orderBottles({ bottlesIssued: 3, items: [line(25000, 3)], emptiesCollected: 1 });
    assert.equal(b.toReturn, 3);
    assert.equal(b.collected, 1);
});

test('a bought container counts as bought, never as owed', () => {
    const b = orderBottles({ bottlesIssued: 0, items: [line(25000, 2, 35000)] });
    assert.equal(b.bought, 2);
    assert.equal(b.toReturn, 0);
});

test('an order from before the count was stored reports unknown, not zero', () => {
    // Telling someone holding four bottles that they owe none is worse than
    // saying nothing at all.
    assert.equal(orderBottles({ items: [line(25000, 4)] }).toReturn, null);
});
