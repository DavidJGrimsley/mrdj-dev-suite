import type {

  ChatMessage,

  FrameworkId,

  ProjectBlueprint,

  ProjectMemoryFiles,

  RequirementItem,

  RequirementProvenance,

  RequirementStatus,

  DiscoveryResult,

} from "./types.ts";

import { getFramework } from "./frameworks.ts";



export const JENNY_INITIAL_GREETING =

  "Hello I'm Jenny. I'm ready to help you create a new project. What's the idea?";



function createItem<T>(

  key: string,

  label: string,

  value: T,

  status: RequirementStatus = "unknown",

  provenance: RequirementProvenance = "framework-default",

  notes?: string

): RequirementItem<T> {

  return { key, label, value, status, provenance, notes };

}



export function createInitialBlueprint(frameworkId: FrameworkId = "exact"): ProjectBlueprint {

  const fw = getFramework(frameworkId);

  return {

    version: 1,

    frameworkId,

    template: fw.defaultTemplate,

    projectName: createItem("projectName", "Project Name", "New App", "unknown", "framework-default"),

    slug: createItem("slug", "Slug / Bundle ID", "new-app", "unknown", "framework-default"),

    elevatorPitch: createItem("elevatorPitch", "Elevator Pitch", "", "unknown", "framework-default"),

    targetAudience: createItem("targetAudience", "Target Audience", "Unknown", "unknown", "framework-default"),

    platforms: createItem<string[]>(

      "platforms",

      "Target Platforms",

      frameworkId === "exact" ? ["Web", "macOS"] : ["iOS", "Android", "Web"],

      "inferred",

      "framework-default"

    ),

    mvpFeatures: createItem<string[]>("mvpFeatures", "MVP Features", [], "unknown", "framework-default"),

    deferredFeatures: createItem<string[]>("deferredFeatures", "Deferred Post-MVP", [], "unknown", "framework-default"),

    visualDirection: createItem("visualDirection", "Visual Direction", "Unknown", "unknown", "framework-default"),

    colorPalette: createItem("colorPalette", "Color Palette", "Unknown", "unknown", "framework-default"),

    navigationPattern: createItem("navigationPattern", "Navigation Pattern", "Unknown", "unknown", "framework-default"),

    dataStorage: createItem("dataStorage", "Data & Persistence", "Unknown", "unknown", "framework-default"),

    authentication: createItem("authentication", "Authentication", "Unknown", "unknown", "framework-default"),

    offlineSupport: createItem("offlineSupport", "Offline Support", "Unknown", "unknown", "framework-default"),

    openDecisions: createItem<string[]>("openDecisions", "Open Technical Decisions", [], "unknown", "framework-default"),

    readinessScore: 10,

    approvedPlanId: null,

    lastUpdated: Date.now(),

  };

}



export function calculateReadinessScore(blueprint: ProjectBlueprint): number {

  let score = 0;

  // Name & pitch (up to 25%)

  if (blueprint.projectName.status === "answered" || blueprint.projectName.status === "inferred") score += 15;

  if (blueprint.elevatorPitch.status === "answered" || blueprint.elevatorPitch.status === "inferred") score += 10;



  // Platforms (up to 20%)

  if (blueprint.platforms.value.length > 0 && blueprint.platforms.status !== "unknown") score += 20;



  // MVP Features (up to 25%)

  if (blueprint.mvpFeatures.value.length >= 1) score += 15;

  if (blueprint.mvpFeatures.value.length >= 3) score += 10;



  // Data & Auth (up to 10%)

  if (blueprint.dataStorage.status !== "unknown" || blueprint.authentication.status !== "unknown") score += 10;



  // Visual & Design (up to 10%)

  if (blueprint.visualDirection.status !== "unknown") score += 10;



  return Math.min(100, score);

}



/**

 * Deterministic local discovery parser.

 * Extracts explicit requirements, infers reasonable defaults, tracks provenance,

 * asks targeted 1-3 next questions without repetition, and stops when MVP is defined.

 */

export function analyzeInput(

  rawInput: string,

  current: ProjectBlueprint,

  history: ChatMessage[] = []

): DiscoveryResult {

  const input = redactCredentials(rawInput.trim());

  const lower = input.toLowerCase();



  // Clone blueprint to keep pure

  const updated: ProjectBlueprint = JSON.parse(JSON.stringify(current));

  updated.lastUpdated = Date.now();

  const isFirstInput = history.filter((m) => m.role === "user").length === 0;

  const provenance: RequirementProvenance = isFirstInput ? "initial-idea" : "chat";



  const pending = [...history].reverse().find(m => m.role === "jenny")?.text || "";

  const deferredAnswer = /\b(later|defer|undecided|not sure|skip|unknown)\b/i.test(input);

  const answerStatus: RequirementStatus = deferredAnswer ? "deferred" : "answered";

  if (!isFirstInput && /must-have features/.test(pending)) updated.mvpFeatures = createItem("mvpFeatures", "MVP Features", deferredAnswer ? [] : input.split(/[.,;]|\band\b/i).map(x => x.trim()).filter(x => x && !/\b(no|not|without|later|defer|skip)\b/i.test(x)), answerStatus, provenance, input);

  if (!isFirstInput && /cloud data syncing/.test(pending)) updated.dataStorage = createItem("dataStorage", "Data & Persistence", input, answerStatus, provenance);

  if (!isFirstInput && /visual style or theme/.test(pending)) updated.visualDirection = createItem("visualDirection", "Visual Direction", input, answerStatus, provenance);

  if (!isFirstInput && /platforms are you targeting/.test(pending) && deferredAnswer) updated.platforms = createItem("platforms", "Target Platforms", [], "deferred", provenance, input);

  // 1. Extract Project Name

  let extractedName: string | null = null;

  const quotedMatch = input.match(/(?:called|named|name is|title is)\s+["']([^"']+)["']/i);

  if (quotedMatch && quotedMatch[1]) {

    extractedName = quotedMatch[1].trim();

  } else {

    const unquotedMatch = input.match(

      /(?:called|named|name is|title is)\s+([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+){0,2}?)(?=\s+(?:with|for|that|which|to|and|in|on|using)\b|[.,;!?\n]|$)/i

    );

    if (unquotedMatch && unquotedMatch[1]) {

      extractedName = unquotedMatch[1].trim();



    }

  }



  if (extractedName) {

    updated.projectName = createItem("projectName", "Project Name", extractedName, "answered", provenance);

    const slug = extractedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    updated.slug = createItem("slug", "Slug / Bundle ID", slug || "my-app", "answered", provenance);

  } else if (isFirstInput && updated.projectName.status === "unknown") {

    // Infer a descriptive name from key words

    const words = input.split(/\s+/).slice(0, 4).join(" ");

    const candidate = words.replace(/[^a-zA-Z0-9\s]/g, "");

    if (candidate.length > 2) {

      const titleCase = candidate

        .split(" ")

        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

        .join(" ");

      updated.projectName = createItem(

        "projectName",

        "Project Name",

        titleCase || "New App",

        "inferred",

        "inferred",

        "Inferred from initial concept"

      );

      const slug = titleCase.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      updated.slug = createItem("slug", "Slug / Bundle ID", slug || "new-app", "inferred", "inferred");

    }

  }



  // 2. Elevator Pitch

  if (isFirstInput || updated.elevatorPitch.status === "unknown") {

    updated.elevatorPitch = createItem("elevatorPitch", "Elevator Pitch", input, "answered", provenance);

  }



  // Explicit platform choices take precedence over broad mobile defaults.

  const selected: string[] = [];

  if (/\b(web|browser)\b/i.test(lower) && !/\b(no|not|without)\s+(web|browser)\b/i.test(lower)) selected.push("Web");

  if (/\b(ios|iphone|ipad)\b/i.test(lower) && !/\b(no|not|without)\s+(ios|iphone|ipad)\b/i.test(lower)) selected.push("iOS");

  if (/\bandroid\b/i.test(lower) && !/\b(no|not|without)\s+android\b/i.test(lower)) selected.push("Android");

  if (/\b(macos|mac)\b/i.test(lower)) selected.push("macOS");

  if (/\b(mobile|phone)\b/i.test(lower) && !/\b(ios|iphone|ipad|android)\b/i.test(lower)) selected.push("iOS", "Android");

  if (selected.length) updated.platforms = createItem("platforms", "Target Platforms", [...new Set(selected)], "answered", provenance);



  const featuresToAdd: string[] = [];

  const deferredToAdd: string[] = [];

  const patterns: [RegExp, string][] = [

    [/\b(camera|photo|picture|gallery|image upload)\b/i, "Camera & Photo Upload"],

    [/\b(chat|messaging|direct messages?|dm|comments)\b/i, "Real-time Messaging"],

    [/\b(auth|login|signup|user accounts?|profile)\b/i, "User Authentication & Profiles"],

    [/\b(search|filter|explore|bookmarks)\b/i, "Search & Filtering"],

    [/\b(notifications?|alerts)\b/i, "Push Notifications"],

    [/\b(payments?|stripe|checkout|subscriptions?)\b/i, "Payments & Billing"],

    [/\b(map|location|gps)\b/i, "Interactive Maps & Geolocation"],

    [/\b(offline|cache|sync)\b/i, "Offline Data & Local Caching"],

    [/\b(ai|llm|copilot|generator)\b/i, "AI Assistant Integration"],

  ];

  for (const clause of input.split(/[.;!\n]|,|\bbut\b/i)) {

    for (const [pattern, feature] of patterns) {

      if (!pattern.test(clause)) continue;

      if (/\b(later|post-mvp|phase 2|future|not now|skip|defer)\b/i.test(clause)) deferredToAdd.push(feature);

      else if (/\b(no|not|never|without|exclude|don't|do not)\b/i.test(clause)) {

        updated.mvpFeatures.value = updated.mvpFeatures.value.filter(f => f !== feature);

        updated.openDecisions.value = [...new Set([...updated.openDecisions.value, `Excluded requirement: ${clause.trim()}`])];

        updated.openDecisions.status = "answered"; updated.openDecisions.provenance = provenance;

        if (/auth|login|signup/.test(feature.toLowerCase()) || feature.includes("Authentication")) updated.authentication = createItem("authentication", "Authentication", "No authentication", "answered", provenance);

      } else if (!/\b(maybe|perhaps|consider|undecided)\b/i.test(clause)) featuresToAdd.push(feature);

    }

  }

  updated.mvpFeatures.value = updated.mvpFeatures.value.filter(f => !deferredToAdd.includes(f));

  // Merge features without duplicates

  const existingFeatures = new Set(updated.mvpFeatures.value);

  featuresToAdd.filter(f => !deferredToAdd.includes(f)).forEach((f) => existingFeatures.add(f));

  if (existingFeatures.size > 0) {

    updated.mvpFeatures = createItem(

      "mvpFeatures",

      "MVP Features",

      Array.from(existingFeatures),

      updated.mvpFeatures.status === "deferred" ? "deferred" : "answered",

      provenance

    );

  }



  const existingDeferred = new Set(updated.deferredFeatures.value);

  deferredToAdd.forEach((d) => existingDeferred.add(d));

  if (existingDeferred.size > 0) {

    updated.deferredFeatures = createItem(

      "deferredFeatures",

      "Deferred Post-MVP",

      Array.from(existingDeferred),

      "deferred",

      provenance

    );

  }



  const affirmative = input.split(/[.;!\n]|,|\bbut\b/i).filter(c => !/\b(no|not|without|later|defer|skip|maybe|perhaps|consider)\b/i.test(c)).join(". ");
  // 5. Data Storage & Auth

  if (/supabase/i.test(affirmative)) {

    updated.dataStorage = createItem("dataStorage", "Data & Persistence", "Supabase PostgreSQL", "answered", provenance);

    if (/\b(auth|login|signup)\b/i.test(affirmative) && !/\b(no|without|not)\s+(auth|login|signup)/i.test(affirmative)) updated.authentication = createItem("authentication", "Authentication", "Supabase Auth", "answered", provenance);

  } else if (/firebase/i.test(affirmative)) {

    updated.dataStorage = createItem("dataStorage", "Data & Persistence", "Firebase Firestore", "answered", provenance);

    if (/\b(auth|login|signup)\b/i.test(affirmative)) updated.authentication = createItem("authentication", "Authentication", "Firebase Auth", "answered", provenance);

  } else if (/sqlite|local storage|offline first|no backend/i.test(affirmative)) {

    updated.dataStorage = createItem("dataStorage", "Data & Persistence", "Local SQLite / Offline Store", "answered", provenance);

    updated.authentication = createItem("authentication", "Authentication", "None (Local Only)", "answered", provenance);

  }



  if (/\brest api\b/i.test(affirmative)) updated.dataStorage = createItem("dataStorage", "Data & Persistence", "REST API integration", "answered", provenance);



  // 6. Visual Design Direction

  if (/dark mode|dark theme|black|obsidian/i.test(affirmative)) {

    updated.visualDirection = createItem("visualDirection", "Visual Direction", "Dark Obsidian Minimal", "answered", provenance);



  } else if (/minimal|clean|simple|scandinavian/i.test(affirmative)) {

    updated.visualDirection = createItem("visualDirection", "Visual Direction", "Crisp Minimalist", "answered", provenance);

  } else if (/playful|colorful|vibrant/i.test(affirmative)) {

    updated.visualDirection = createItem("visualDirection", "Visual Direction", "Vibrant & Playful", "answered", provenance);

  }



  if (/\b(maybe|perhaps|consider|not sure)\b/i.test(input)) updated.openDecisions = createItem("openDecisions", "Open Technical Decisions", [...updated.openDecisions.value, input], "requires-confirmation", provenance);

  if (/\b(conflicts?|conflicting|contradict(?:ing|ory)?|both required and forbidden)\b/i.test(input)) updated.openDecisions = createItem("openDecisions", "Open Technical Decisions", [...updated.openDecisions.value, input], "conflicting", provenance);

  const palette = input.match(/(?:palette|colou?rs?)\s*(?:is|are|:)?\s+([^.;!]+)/i);

  if (palette) updated.colorPalette = createItem("colorPalette", "Color Palette", palette[1].trim(), "answered", provenance);

  // Invalidate previous plan approval if requirements changed

  updated.approvedPlanId = null;

  updated.readinessScore = calculateReadinessScore(updated);



  // Determine Next Questions (1 to 3 max, avoid repetition)

  const questions: string[] = [];

  const suggestions: string[] = [];



  const fwName = getFramework(updated.frameworkId).displayName;



  if (updated.mvpFeatures.value.length === 0 && updated.mvpFeatures.status === "unknown") {

    questions.push("What are the 1–3 must-have features for the first usable version?");

    suggestions.push("User accounts & feed", "Direct messaging & photos", "Simple search & bookmarks");

  } else if (updated.platforms.status === "unknown" || updated.platforms.value.length === 0) {

    questions.push("Which platforms are you targeting first?");

    if (updated.frameworkId === "exact") {

      suggestions.push("Web & macOS first", "Web only", "Cross-platform (Web + Native)");

    } else {

      suggestions.push("iOS & Android", "iOS first", "Mobile + Web");

    }

  } else if (updated.dataStorage.status === "unknown") {

    questions.push("Does this app need cloud data syncing, or should it run purely offline / on-device?");

    suggestions.push("Cloud backend (Supabase)", "Purely offline / local storage", "REST API integration");

  } else if (updated.visualDirection.status === "unknown") {

    questions.push("Do you have a visual style or theme in mind (e.g. dark minimalist, vibrant, system native)?");

    suggestions.push("Dark obsidian minimal", "Clean high-contrast", "Vibrant & colorful");

  }



  const readyToReview = updated.readinessScore >= 70;



  let reply = "";

  if (readyToReview) {

    reply = `Local planning helper: Your project specification for **${updated.projectName.value}** on **${fwName}** is clear and well-structured!

I have populated the blueprint on the left with your MVP features, target platforms, and architecture.



You can edit any requirement directly in the blueprint, adjust open decisions, or click **${getFramework(updated.frameworkId).actionText}** to review and proceed.`;

    suggestions.push("Looks great, let's review!", "Add another feature", "Change visual style");

  } else if (questions.length > 0) {

    const intro = isFirstInput

      ? `Great concept! I've started assembling the project blueprint for **${updated.projectName.value}** on **${fwName}**.`

      : "Got it, I've updated the blueprint with those details.";

    reply = `Local planning helper: ${intro}\n\nTo narrow down the architecture:\n` + questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n");

  } else {

    reply = `Blueprint updated! Take a look at the left pane. Let me know if you want to refine anything or defer non-essential features.`;

  }



  return {

    updatedBlueprint: updated,

    reply,

    suggestions: suggestions.slice(0, 3),

    readyToReview,

  };

}



/** Exportable drafts preserve uncertainty; these are not generated project files. */

export function redactCredentials(text: string): string {

  return text.replace(/\b(api[ _-]?key|access[ _-]?token|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")

    .replace(/\b(sk-[A-Za-z0-9_-]{8,}|AIza[A-Za-z0-9_-]{10,})\b/g, "[REDACTED]")

    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g, "$1[REDACTED]@");

}

export function redactValue<T>(value: T): T {
  if (typeof value === "string") return redactCredentials(value) as T;
  if (Array.isArray(value)) return value.map(redactValue) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item)])) as T;
  return value;
}
export function generateProjectMemory(b: ProjectBlueprint): ProjectMemoryFiles {

  const item = (r: RequirementItem<string | string[]>) => `${r.label} [${r.status}; ${r.provenance}]: ${Array.isArray(r.value) ? r.value.length ? r.value.map(v => `\n- ${v}`).join("") : "Unknown / none recorded" : r.value || "Unknown"}${r.notes ? `\nNotes: ${r.notes}` : ""}`;

  const section = (title: string, fields: RequirementItem<string | string[]>[]) => redactCredentials(`# ${title} — blueprint draft\n\n${fields.map(item).join("\n\n")}\n`);

  return {

    infoMd: section(`Project: ${b.projectName.value}`, [b.projectName, b.slug, b.elevatorPitch, b.targetAudience, b.platforms, b.mvpFeatures, b.deferredFeatures, b.openDecisions]),

    styleMd: section(`Design System & Style: ${b.projectName.value}`, [b.visualDirection, b.colorPalette, b.navigationPattern]) + "\nTypography: Unknown; requires confirmation.\nAccessibility: Requirements and compliance unverified.\n",

    guidelinesMd: redactCredentials(`# Engineering draft\nFramework: ${getFramework(b.frameworkId).displayName} (${b.frameworkId})\nTemplate selection: ${b.template}\n\n${[b.dataStorage, b.authentication, b.offlineSupport].map(item).join("\n\n")}\nArchitecture: Unconfirmed. Host/toolchain verification required.\n`),

    todoMd: section("MVP roadmap draft", [b.mvpFeatures, b.deferredFeatures, b.openDecisions]) + "\n- [ ] Confirm unknown requirements\n- [ ] Review an executable host plan before scaffolding\n",

  };

}
