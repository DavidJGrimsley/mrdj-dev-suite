import type {
  RoadmapTask,
  ScriptedJennyTurn,
  TutorialBlueprintField,
  TutorialBlueprintState,
} from "./types.ts";

function createField<T>(
  key: string,
  label: string,
  section: string,
  value: T | null = null
): TutorialBlueprintField<T> {
  return {
    key,
    label,
    section,
    value,
    isDiscussed: value !== null,
  };
}

export function createInitialTutorialBlueprint(): TutorialBlueprintState {
  return {
    overview: createField<string>("overview", "Overview & Scope", "identity"),
    targetAudience: createField<string>("targetAudience", "Target Audience", "identity"),
    targetPlatforms: createField<string[]>("targetPlatforms", "Target Platforms", "platform"),
    framework: createField<string>("framework", "Framework", "platform"),
    projectName: createField<string>("projectName", "Project Name", "identity"),
    firstTargetPlatform: createField<string>("firstTargetPlatform", "First Target Platform", "platform"),
    problemStatement: createField<string>("problemStatement", "Problem Statement", "goals"),
    productGoals: createField<string>("productGoals", "Product Goals", "goals"),
    nonGoals: createField<string>("nonGoals", "Non-Goals (Out of Scope)", "goals"),
    coreFlows: createField<string>("coreFlows", "Primary Flow (First Action)", "flows"),
    keyFeatures: createField<string[]>("keyFeatures", "Key Features & Information", "flows"),
    screens: createField<string[]>("screens", "Screens & Views", "flows"),
    dataStored: createField<string>("dataStored", "Data Stored", "data"),
    dataStorage: createField<string>("dataStorage", "Storage & Offline Sync", "data"),
    authentication: createField<string>("authentication", "Accounts & Backend", "data"),
    visualStyle: createField<string>("visualStyle", "Visual Style & Tokens", "design"),
    navigationPattern: createField<string>("navigationPattern", "Navigation Pattern", "design"),
    onboardingFlow: createField<string>("onboardingFlow", "Onboarding Gate", "operations"),
    monetizationStrategy: createField<string>("monetizationStrategy", "Monetization Strategy", "operations"),
    teamContext: createField<string>("teamContext", "Team & Maintenance", "operations"),
    laterScope: createField<string>("laterScope", "Future Scope (Later Ideas)", "goals"),
    referenceDesigns: createField<string>("referenceDesigns", "UI Style & Layout", "design"),
    distribution: createField<string>("distribution", "Distribution Strategy", "operations"),
    legalSupport: createField<string>("legalSupport", "Legal & Support Readiness", "operations"),
    projectSetup: createField<string>("projectSetup", "Project & Contract Setup", "quality"),
    mdsGuidelines: createField<string>("mdsGuidelines", "i² Guidelines & Checks", "quality"),
    roadmapTasks: [],
  };
}

export const INITIAL_ROADMAP_TASKS: RoadmapTask[] = [
  {
    id: "task-1",
    title: "Define Experiment data schema in app.ts",
    status: "pending",
  },
  {
    id: "task-2",
    title: "Implement Experiment List view in app.contract",
    status: "pending",
  },
];

export const SCRIPTED_JENNY_TURNS: ScriptedJennyTurn[] = [
  {
    turnIndex: 0,
    question: "What are we building?",
    answer: "An app to keep track of simple experiments.",
    fieldKey: "overview",
    patch: (prev) => ({
      ...prev,
      overview: {
        ...prev.overview,
        value: "An app to keep track of simple experiments.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 1,
    question: "Who is this app's intended audience?",
    answer:
      "Scientists, learners, and field researchers who need to record experiments on the go.",
    fieldKey: "targetAudience",
    patch: (prev) => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        value:
          "Scientists, learners, and field researchers who need to record experiments on the go.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 2,
    question: "What are the target platforms?",
    answer: "Android and Web.",
    fieldKey: "targetPlatforms",
    patch: (prev) => ({
      ...prev,
      targetPlatforms: {
        ...prev.targetPlatforms,
        value: ["Android", "Web"],
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 3,
    question: "Do you have a framework in mind? I suggest Exact or Expo.",
    answer: "Exact.",
    fieldKey: "framework",
    patch: (prev) => ({
      ...prev,
      framework: {
        ...prev.framework,
        value: "Exact",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 4,
    question: "What would you like to call the app?",
    answer: "Experimemo.",
    fieldKey: "projectName",
    patch: (prev) => ({
      ...prev,
      projectName: {
        ...prev.projectName,
        value: "Experimemo",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 5,
    question: "Which platform should we get working first?",
    answer:
      "Web first so we can preview it, with Android also in the project plan.",
    fieldKey: "firstTargetPlatform",
    patch: (prev) => ({
      ...prev,
      firstTargetPlatform: {
        ...prev.firstTargetPlatform,
        value:
          "Web first so we can preview it, with Android also in the project plan.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 6,
    question: "What problem should Experimemo solve?",
    answer:
      "Keeping experiment information organized and accessible while working on the go.",
    fieldKey: "problemStatement",
    patch: (prev) => ({
      ...prev,
      problemStatement: {
        ...prev.problemStatement,
        value:
          "Keeping experiment information organized and accessible while working on the go.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 7,
    question: "What would make the app successful?",
    answer:
      "Making experiments easy to record, track, and manage without slowing people down.",
    fieldKey: "productGoals",
    patch: (prev) => ({
      ...prev,
      productGoals: {
        ...prev.productGoals,
        value:
          "Making experiments easy to record, track, and manage without slowing people down.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 8,
    question: "What should stay outside the initial scope?",
    answer:
      "Conducting experiments for users, scientific data analysis, and collaboration.",
    fieldKey: "nonGoals",
    patch: (prev) => ({
      ...prev,
      nonGoals: {
        ...prev.nonGoals,
        value:
          "Conducting experiments for users, scientific data analysis, and collaboration.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 9,
    question: "What should someone be able to do first?",
    answer: "Create an experiment, then find it in Track and update it.",
    fieldKey: "coreFlows",
    patch: (prev) => ({
      ...prev,
      coreFlows: {
        ...prev.coreFlows,
        value: "Create an experiment, then find it in Track and update it.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 10,
    question: "What information and features does that require?",
    answer:
      "Hypotheses, procedures, data collection plans, observations, results, notes, photos, and experiment status.",
    fieldKey: "keyFeatures",
    patch: (prev) => ({
      ...prev,
      keyFeatures: {
        ...prev.keyFeatures,
        value: [
          "Hypotheses",
          "Procedures",
          "Data collection plans",
          "Observations",
          "Results",
          "Notes",
          "Photos",
          "Experiment status",
        ],
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 11,
    question: "Which screens do you already have in mind?",
    answer: "New, Track, an experiment editor, and App Info.",
    fieldKey: "screens",
    patch: (prev) => ({
      ...prev,
      screens: {
        ...prev.screens,
        value: ["New", "Track", "Experiment editor", "App Info"],
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 12,
    question: "What kinds of data will the app store?",
    answer: "Experiment records, dated results, notes, and attached photos.",
    fieldKey: "dataStored",
    patch: (prev) => ({
      ...prev,
      dataStored: {
        ...prev.dataStored,
        value:
          "Experiment records, dated results, notes, and attached photos.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 13,
    question: "Should information stay on the device, or sync between devices?",
    answer:
      "Save it locally and support working offline. Multi-device sync can come later.",
    fieldKey: "dataStorage",
    patch: (prev) => ({
      ...prev,
      dataStorage: {
        ...prev.dataStorage,
        value:
          "Save it locally and support working offline. Multi-device sync can come later.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 14,
    question: "Will people need accounts or a shared backend?",
    answer: "No accounts or shared backend for the first version.",
    fieldKey: "authentication",
    patch: (prev) => ({
      ...prev,
      authentication: {
        ...prev.authentication,
        value: "No accounts or shared backend for the first version.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 15,
    question: "Do you have a visual style in mind?",
    answer:
      "A simple field notebook with green accents, slate surfaces, light and dark themes, and the Experimemo script heading.",
    fieldKey: "visualStyle",
    patch: (prev) => ({
      ...prev,
      visualStyle: {
        ...prev.visualStyle,
        value:
          "A simple field notebook with green accents, slate surfaces, light and dark themes, and the Experimemo script heading.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 16,
    question: "How should people move around the app?",
    answer:
      "Use New and Track navigation, open experiments to edit them, and open App Info from the header.",
    fieldKey: "navigationPattern",
    patch: (prev) => ({
      ...prev,
      navigationPattern: {
        ...prev.navigationPattern,
        value:
          "Use New and Track navigation, open experiments to edit them, and open App Info from the header.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 17,
    question:
      "Should onboarding or an account screen block people from using it?",
    answer: "No. Let them start using the app directly.",
    fieldKey: "onboardingFlow",
    patch: (prev) => ({
      ...prev,
      onboardingFlow: {
        ...prev.onboardingFlow,
        value: "No. Let them start using the app directly.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 18,
    question: "How will this app make money?",
    answer: "No monetization for the MVP. Grants might support development later.",
    fieldKey: "monetizationStrategy",
    patch: (prev) => ({
      ...prev,
      monetizationStrategy: {
        ...prev.monetizationStrategy,
        value:
          "No monetization for the MVP. Grants might support development later.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 19,
    question: "Who is building and maintaining it?",
    answer: "A solo developer, with design help for the logo.",
    fieldKey: "teamContext",
    patch: (prev) => ({
      ...prev,
      teamContext: {
        ...prev.teamContext,
        value: "A solo developer, with design help for the logo.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 20,
    question: "What ideas should we save for later?",
    answer:
      "Voice-note transcription, hands-free recording, multi-device sync, and folder, search, and filtering improvements.",
    fieldKey: "laterScope",
    patch: (prev) => ({
      ...prev,
      laterScope: {
        ...prev.laterScope,
        value:
          "Voice-note transcription, hands-free recording, multi-device sync, and folder, search, and filtering improvements.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 21,
    question: "Are there references or existing designs to follow?",
    answer:
      "I just want a simple UI with forms and cards for tracked experiments.",
    fieldKey: "referenceDesigns",
    patch: (prev) => ({
      ...prev,
      referenceDesigns: {
        ...prev.referenceDesigns,
        value:
          "I just want a simple UI with forms and cards for tracked experiments.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 22,
    question: "How should the first version reach users?",
    answer: "Start with a web preview, then prepare Android distribution.",
    fieldKey: "distribution",
    patch: (prev) => ({
      ...prev,
      distribution: {
        ...prev.distribution,
        value: "Start with a web preview, then prepare Android distribution.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 23,
    question:
      "Are support, terms, privacy, and legal contact details ready?",
    answer: "Not yet. Record those as pending before release.",
    fieldKey: "legalSupport",
    patch: (prev) => ({
      ...prev,
      legalSupport: {
        ...prev.legalSupport,
        value: "Not yet. Record those as pending before release.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 24,
    question:
      "Shall I use Exact's standard Contract and TypeScript setup and create an i2 workspace with the project documents?",
    answer: "Yes.",
    fieldKey: "projectSetup",
    patch: (prev) => ({
      ...prev,
      projectSetup: {
        ...prev.projectSetup,
        value:
          "Exact standard Contract and TypeScript setup with i2 workspace documents.",
        isDiscussed: true,
      },
    }),
  },
  {
    turnIndex: 25,
    question:
      "Should I include the i² project guidelines and test-before-handoff checks?",
    answer: "Yes.",
    fieldKey: "mdsGuidelines",
    patch: (prev) => ({
      ...prev,
      mdsGuidelines: {
        ...prev.mdsGuidelines,
        value:
          "i² project guidelines and test-before-handoff checks included.",
        isDiscussed: true,
      },
      // Tasks appear only after Turn 26 answer!
      roadmapTasks: INITIAL_ROADMAP_TASKS,
    }),
  },
];

export const JENNY_SUMMARY_MESSAGE =
  "I have summarized the completed blueprint for Experimemo. Exact contract setup, offline local storage, field notebook visual styling, and i² quality safeguards are all configured.\n\nProposed initial roadmap:\n• Task 1: Define Experiment data schema in app.ts (Pending)\n• Task 2: Implement Experiment List view in app.contract (Pending)\n\nShall we generate Experimemo?";

export const APPROVAL_ANSWER_TEXT = "Yes, generate Experimemo.";
