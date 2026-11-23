// Widgets & Whatnot continues in a real project Infie chat. The demo project and
// imported projects are not safe hosts: the demo is tutorial-owned, and an import
// stops at the prototype limit instead of opening a navigable workspace.

export type WidgetsTourCandidate = {
  id: string;
  active?: boolean;
  wired?: boolean;
};

export function firstActiveUsableProject<T extends WidgetsTourCandidate>(
  projects: readonly T[],
  options: { demoProjectId: string; isImported: (id: string) => boolean },
): T | null {
  return (
    projects.find(
      (project) =>
        project.active === true &&
        project.wired === true &&
        project.id !== options.demoProjectId &&
        !options.isImported(project.id),
    ) ?? null
  );
}
