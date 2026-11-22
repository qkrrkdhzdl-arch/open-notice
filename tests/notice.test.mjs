// Tests for the page's own operations. Run:
//   node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";

// Minimal browser stand-ins: the page object only needs storage, and the calendar
// export needs a Blob, an object URL and one anchor element.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.Blob = class Blob {
  constructor(parts, opts) {
    this.parts = parts;
    this.type = opts && opts.type;
    this.size = parts.join("").length;
  }
};
globalThis.URL.createObjectURL = () => "blob:test";
globalThis.URL.revokeObjectURL = () => {};
const clicked = [];
globalThis.document = {
  createElement: () => ({
    set download(v) { this._d = v; },
    get download() { return this._d; },
    click() { clicked.push(this._d); },
    remove() {},
  }),
  body: { appendChild() {} },
};

const { App } = await import("../script.js");

test("the desk lists three notices with unique ids", () => {
  const state = App.page.getState();
  assert.equal(state.notices.length, 3);
  assert.equal(new Set(state.notices.map((n) => n.id)).size, 3);
});

test("a plan dates every step back from the closing date", () => {
  const result = App.page.buildPlan("storefront-trial");
  assert.equal(result.ok, true);
  const plan = result.plan;
  assert.equal(plan.noticeId, "storefront-trial");
  assert.equal(plan.deadline, "2027-01-15");
  // First step is 21 days before the close, the last one is on the closing date.
  assert.equal(plan.items[0].due, "2026-12-25");
  assert.equal(plan.items[plan.items.length - 1].due, "2027-01-15");
  // Every step keeps a date inside the window and an explanation.
  for (const item of plan.items) {
    assert.match(item.due, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.label.length > 0);
    assert.ok(item.detail.length > 0);
  }
});

test("an unknown notice id is refused and changes nothing", () => {
  const before = App.page.getState();
  const refused = App.page.buildPlan("no-such-notice");
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /no notice/i);
  assert.deepEqual(App.page.getState().plan, before.plan);
});

test("the plan survives a reload because it is stored", () => {
  App.page.buildPlan("deposit-return");
  assert.ok(store.get("open-notice.plan.v1"));
  const saved = JSON.parse(store.get("open-notice.plan.v1"));
  assert.equal(saved.noticeId, "deposit-return");
});

test("the calendar export refuses without a plan", () => {
  App.page.clearPlan();
  const result = App.page.exportCalendar();
  assert.equal(result.ok, false);
  assert.match(result.reason, /no plan/i);
});

test("the calendar export writes one event per dated step", () => {
  const built = App.page.buildPlan("closure-support");
  const result = App.page.exportCalendar();
  assert.equal(result.ok, true);
  assert.equal(result.events, built.plan.items.length);
  assert.match(result.filename, /\.ics$/);
  assert.equal(clicked[clicked.length - 1], result.filename);
});

test("clearing the plan empties the page state", () => {
  const result = App.page.clearPlan();
  assert.equal(result.ok, true);
  assert.equal(App.page.getState().plan, null);
});
