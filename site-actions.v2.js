// Registers this website's operations with the agent runtime.
// agent-manifest.json loads this module through "actions.module". Only the names in
// "actions.agentTools" become model tools, called website_<name>.
//
// The rules themselves live in script.js; these wrappers only describe them to the model.
import { App } from "./script.js";

class SiteActions {
  static registerActions(actions) {
    actions.register(SiteActions.readStateAction());
    actions.register(SiteActions.readNoticeAction());
    actions.register(SiteActions.buildPlanAction());
    actions.register(SiteActions.exportCalendarAction());
    actions.register(SiteActions.clearPlanAction());
  }

  static readStateAction() {
    return {
      name: "get_site_state",
      description:
        "Read the notices on this desk (id, title, issuer, closing date, who it is for, how many documents it asks for), the current plan and its version. Call it before answering about a notice or the plan, and again in each turn that needs it: the visitor also uses the page.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: SiteActions.readState,
    };
  }

  static readState() {
    return App.page.getState();
  }

  static readNoticeAction() {
    return {
      name: "get_notice",
      description:
        "Read one notice in full: its documents and its steps, each with how many days before the closing date it is due. Call it when the visitor asks what a notice asks for, or before quoting a document list.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            enum: App.page.catalogIds(),
            description: "Notice id from website_get_site_state.",
          },
        },
      },
      execute: SiteActions.readNotice,
    };
  }

  static readNotice(args) {
    return App.page.getNotice(args.id);
  }

  static buildPlanAction() {
    return {
      name: "build_plan",
      description:
        "Turn one notice into a dated checklist on the page, replacing any plan already there. Reversible: the visitor can clear or rebuild it on the page. Returns the plan, its dates and the new version.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: {
            type: "string",
            enum: App.page.catalogIds(),
            description: "Notice id from website_get_site_state.",
          },
        },
      },
      execute: SiteActions.buildPlan,
    };
  }

  static buildPlan(args) {
    return App.page.buildPlan(args.id);
  }

  static exportCalendarAction() {
    return {
      name: "export_calendar",
      description:
        "Download the current plan as an iCalendar (.ics) file, so the dates land in the visitor's calendar. Call it only when the visitor asks for the dates as a file or asks to add them to a calendar. It refuses when there is no plan.",
      effect: "write",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: SiteActions.exportCalendar,
    };
  }

  static exportCalendar() {
    return App.page.exportCalendar();
  }

  static clearPlanAction() {
    return {
      name: "clear_plan",
      description:
        "Remove the plan from the page. Call it only when the visitor asks to clear or remove the plan.",
      effect: "write",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: SiteActions.clearPlan,
    };
  }

  static clearPlan() {
    return App.page.clearPlan();
  }
}

export { SiteActions };

/** The runtime calls this export when the manifest's actions.module loads. */
export function registerActions(actions) {
  SiteActions.registerActions(actions);
}
