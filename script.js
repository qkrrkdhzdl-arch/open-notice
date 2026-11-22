/**
 * Open Notice — the page's own data and operations.
 *
 * The same functions back the buttons on the page and the assistant's website_* tools,
 * so the rules live here only (site-actions.js just wraps them).
 *
 * Every sample notice below is a demonstration record. The figures are simplified and
 * the notice numbers are marked SAMPLE: this page is a reading desk, not an official
 * publication. Real offices publish their own notices and their own numbers.
 */

const STORE_KEY = "open-notice.plan.v1";

/** Sample notices, each a short record a visitor can turn into a plan. */
const NOTICES = [
  {
    id: "storefront-trial",
    title: "Youth Storefront Trial Grant 2027",
    issuer: "Sample notice SAMPLE-2027-0114 · regional small-business office",
    deadline: "2027-01-15",
    award: "Up to KRW 20 million for fit-out, 6-month rent support",
    who: "Aged 19–34, opening a first storefront in the district, no storefront currently operating",
    documents: ["Business plan (3 pages)", "Lease draft or letter of intent", "Resident registration copy", "Tax clearance certificate"],
    steps: [
      { label: "Read the eligibility list once more", daysBefore: 21, detail: "Age, district and 'first storefront' conditions are checked before scoring." },
      { label: "Get the lease draft signed by the landlord", daysBefore: 14, detail: "Without a draft or letter of intent the application is returned." },
      { label: "Issue the tax clearance certificate", daysBefore: 7, detail: "Valid 30 days; issue it after the lease is settled." },
      { label: "Submit the plan and attachments", daysBefore: 3, detail: "Online submission closes at 18:00; late files are not opened." },
    ],
  },
  {
    id: "closure-support",
    title: "Early Closure Support — Loan Balance Reduction",
    issuer: "Sample notice SAMPLE-2026-0912 · public guarantee foundation",
    deadline: "2026-12-31",
    award: "Up to 70% reduction of the remaining guaranteed balance",
    who: "A business closed in 2026 after at least one year of operation, with a guaranteed loan still outstanding",
    documents: ["Closure certificate", "Loan balance statement", "Business registration history", "Application form"],
    steps: [
      { label: "Order the closure certificate", daysBefore: 30, detail: "The certificate is issued the day after closure is reported." },
      { label: "Ask the lender for the balance statement", daysBefore: 21, detail: "It must be dated within 14 days of the application." },
      { label: "Check the reduction rate for the loan type", daysBefore: 10, detail: "Rates differ by guarantee product; the table is in annex 2." },
      { label: "Submit before the year-end closing", daysBefore: 2, detail: "Applications received after 12-31 are held to the next year's scheme." },
    ],
  },
  {
    id: "deposit-return",
    title: "Housing Deposit Return — Mediation Request",
    issuer: "Sample notice SAMPLE-2026-1030 · housing dispute mediation committee",
    deadline: "2027-02-28",
    award: "Free mediation; no filing fee",
    who: "A tenant whose deposit was not returned within one month of moving out",
    documents: ["Lease contract", "Move-out confirmation", "Deposit transfer record", "Message log with the landlord"],
    steps: [
      { label: "Send a written return request to the landlord", daysBefore: 45, detail: "A recorded message or text with the account number starts the clock." },
      { label: "Collect the move-out confirmation", daysBefore: 30, detail: "The building manager or the address transfer record is accepted." },
      { label: "File the mediation request", daysBefore: 14, detail: "Filing is free; the first hearing is set within six weeks." },
    ],
  },
];

/** Every date in a plan is counted from the deadline, so a plan stays correct when read later. */
function shiftDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function loadPlan() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const plan = JSON.parse(raw);
    if (!plan || !Array.isArray(plan.items)) return null;
    return plan;
  } catch {
    return null;
  }
}

/** The page object. Exported so site.js and site-actions.js share one instance. */
export class NoticePage {
  constructor() {
    this.notices = NOTICES;
    this.version = 1;
    this.plan = loadPlan();
  }

  /** Ids the assistant may name. */
  catalogIds() {
    return this.notices.map((n) => n.id);
  }

  /** A copy of the page state for the assistant and for rendering. */
  getState() {
    return {
      notices: this.notices.map((n) => ({
        id: n.id,
        title: n.title,
        issuer: n.issuer,
        deadline: n.deadline,
        award: n.award,
        who: n.who,
        documentCount: n.documents.length,
      })),
      plan: this.plan,
      version: this.version,
    };
  }

  /** One notice, with its documents and steps. */
  getNotice(id) {
    const notice = this.notices.find((n) => n.id === id);
    if (!notice) {
      return { ok: false, reason: `There is no notice with the id "${id}".` };
    }
    return { ok: true, notice };
  }

  /**
   * Turn one notice into a dated checklist. Reversible: the page can rebuild or clear it.
   */
  buildPlan(id) {
    const found = this.getNotice(id);
    if (found.ok === false) return found;
    const notice = found.notice;
    const items = notice.steps.map((step, index) => ({
      order: index + 1,
      label: step.label,
      due: shiftDays(notice.deadline, step.daysBefore),
      detail: step.detail,
    }));
    items.push({
      order: items.length + 1,
      label: `Submit: ${notice.title}`,
      due: notice.deadline,
      detail: "Keep the submission receipt. The desk cannot confirm a submission it cannot see.",
    });
    this.plan = {
      noticeId: notice.id,
      noticeTitle: notice.title,
      deadline: notice.deadline,
      documents: notice.documents.slice(),
      items,
      builtAt: new Date().toISOString(),
    };
    this.version += 1;
    this.save();
    return { ok: true, plan: this.plan, version: this.version };
  }

  /**
   * Download the current plan as an iCalendar file. The visitor gets a file, and the
   * page keeps the plan, so this can be repeated.
   */
  exportCalendar() {
    if (!this.plan) {
      return { ok: false, reason: "There is no plan on this page yet. Build one from a notice first." };
    }
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Open Notice//Plan//EN",
      "CALSCALE:GREGORIAN",
    ];
    for (const item of this.plan.items) {
      const day = item.due.replace(/-/g, "");
      lines.push(
        "BEGIN:VEVENT",
        `UID:open-notice-${this.plan.noticeId}-${item.order}@open-notice`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART;VALUE=DATE:${day}`,
        `SUMMARY:${escapeIcs(item.label)}`,
        `DESCRIPTION:${escapeIcs(item.detail)}`,
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    const text = lines.join("\r\n") + "\r\n";
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `open-notice-${this.plan.noticeId}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true, filename: a.download, events: this.plan.items.length };
  }

  /** Forget the plan. Reversible only in the sense that it can be rebuilt. */
  clearPlan() {
    this.plan = null;
    this.version += 1;
    this.save();
    return { ok: true, version: this.version };
  }

  save() {
    try {
      if (this.plan) localStorage.setItem(STORE_KEY, JSON.stringify(this.plan));
      else localStorage.removeItem(STORE_KEY);
    } catch {
      /* private mode: the plan still lives in memory for this visit */
    }
  }
}

function escapeIcs(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export const App = { page: new NoticePage() };
