import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageParams, paged, MAX_LIMIT } from '../../dist/lib/pagination.js';

const req = (query) => ({ query });

test('a caller who asks for nothing gets a bounded first page', () => {
    const p = pageParams(req({}));
    assert.equal(p.page, 1);
    assert.equal(p.skip, 0);
    assert.ok(p.limit > 0 && p.limit <= MAX_LIMIT);
});

test('nobody can ask for the whole collection', () => {
    assert.equal(pageParams(req({ limit: '100000' })).limit, MAX_LIMIT);
});

test('nonsense falls back rather than producing NaN offsets', () => {
    for (const bad of ['abc', '-5', '0', '', undefined]) {
        const p = pageParams(req({ page: bad, limit: bad }));
        assert.equal(p.page, 1, `page for ${bad}`);
        assert.ok(Number.isInteger(p.skip) && p.skip >= 0, `skip for ${bad}`);
    }
});

test('the second page skips exactly one page of rows', () => {
    const p = pageParams(req({ page: '3', limit: '20' }));
    assert.equal(p.skip, 40);
});

test('page count never reads as zero for an empty list', () => {
    assert.equal(paged([], 0, pageParams(req({}))).pages, 1);
});

test('the envelope reports the true total, not the page size', () => {
    const e = paged([1, 2], 57, pageParams(req({ limit: '2' })));
    assert.equal(e.total, 57);
    assert.equal(e.pages, 29);
});
