import { LEEK_BEATS_TRACKS, SEEDED_FILES } from '../../data/seeded-workspace.ts';
import { WIDGET_CATALOG } from '../../data/widget-catalog.ts';
import type { CanonicalWidgetId, SpatialLayoutPreset, SpatialWindow } from '../../types/widgets.ts';
import { computeWindowPixelSpec, getEffectiveWindowDimensions } from '../spatial/cockpit-math.ts';
import {
  computeGroupedCellLayout,
  resolveWindowGroupLayout,
} from '../spatial/window-group-layout.ts';
import {
  FONT_BODY_MEDIUM,
  FONT_BODY_REGULAR,
  FONT_DISPLAY_BOLD,
  FONT_DISPLAY_MEDIUM,
  FONT_DISPLAY_REGULAR,
  I2_PALETTE,
  drawBoltOps,
  drawInfinityEmblemOps,
  drawPillButton,
  drawSendPlaneOps,
  drawSparkleOps,
  hitTestWindowSurface,
  intersectRayWithWindowPlane,
  isPointInsideRoundedSurface,
  pushClipRestore,
  pushClipRoundRect,
  worldPointToWindowUv,
  wrapLines,
  type SurfaceUvResult,
  type WindowRenderDataContext,
  type WindowSurfaceHitTarget,
  type WindowSurfaceModel,
} from './quest-surface-primitives.ts';

export {
  FONT_BODY_MEDIUM,
  FONT_BODY_REGULAR,
  FONT_DISPLAY_BOLD,
  FONT_DISPLAY_MEDIUM,
  FONT_DISPLAY_REGULAR,
  I2_PALETTE,
  hitTestWindowSurface,
  intersectRayWithWindowPlane,
  isPointInsideRoundedSurface,
  worldPointToWindowUv,
};
export type {
  SurfaceUvResult,
  WindowRenderDataContext,
  WindowSurfaceHitTarget,
  WindowSurfaceModel,
};

interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const INFIE_GREETING =
  'Hey! Infie here — I coordinate your agents, sessions, and PRs so you can focus on building. Ask me anything, or open a project to get started.';

function resolveSessionActionLabel(status: string | undefined): { label: string; urgent: boolean } {
  switch (status) {
    case 'PLAN REVIEW':
      return { label: 'Approve Plan', urgent: false };
    case 'WAITING ON TEST':
      return { label: 'Test App', urgent: true };
    case 'NEEDS YOU':
      return { label: 'Checklist in', urgent: true };
    case 'CODING':
      return { label: 'Coding', urgent: false };
    case 'VERIFIED':
      return { label: 'Open PR', urgent: false };
    case 'PR OPEN':
      return { label: 'Merge PR', urgent: false };
    default:
      return { label: 'Open Session', urgent: false };
  }
}

function drawTextLines(
  ops: Record<string, unknown>[],
  lines: readonly string[],
  x: number,
  startY: number,
  lineHeight: number,
  size: number,
  color: string,
  font: string,
  maxWidth: number,
  bold = false
): number {
  let y = startY;
  for (const line of lines) {
    ops.push({
      op: 'text',
      text: line,
      x: Math.round(x),
      y: Math.round(y),
      size,
      color,
      align: 'left',
      bold,
      font,
      maxWidth: Math.max(40, Math.round(maxWidth)),
    });
    y += lineHeight;
  }
  return y;
}

/**
 * Renders either the full two-column desktop i² Home screen (when cell is wide enough
 * and homeSurfaceMode !== 'chat') or the focused Infie Convo column.
 */
function renderInfieOrHomeCell(
  ops: Record<string, unknown>[],
  hitTargets: WindowSurfaceHitTarget[],
  bounds: CellBounds,
  ctx: WindowRenderDataContext,
  allowFullHome: boolean,
  hasGroupedCellHeader = false
) {
  const showFullHome = allowFullHome && bounds.width >= 660 && ctx.homeSurfaceMode !== 'chat';
  const activeProj = ctx.projects.find((p) => p.id === ctx.activeProjectId) ?? ctx.projects[0];
  const activeSess = ctx.sessions.find((s) => s.id === ctx.activeSessionId) ?? ctx.sessions[0];
  const petProj = ctx.projects.find((p) => p.id === 'pet') ?? ctx.projects[0];
  const petSess =
    ctx.sessions.find((s) => s.id === 'add-comments') ??
    ctx.sessions.find((s) => s.projectId === petProj?.id) ??
    activeSess;

  // Clean desktop header strip (hidden when cell header is rendered in grouped mode)
  const hdrH = hasGroupedCellHeader ? 36 : 52;
  if (!hasGroupedCellHeader) {
    ops.push({
      op: 'rect',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: hdrH,
      color: '#0e0c1a',
    });
    ops.push({
      op: 'line',
      x1: bounds.x,
      y1: bounds.y + hdrH,
      x2: bounds.x + bounds.width,
      y2: bounds.y + hdrH,
      strokeWidth: 1,
      color: '#1e1b2e',
    });

    // i² mint pill breadcrumb
    const pillX = bounds.x + 18;
    const pillY = bounds.y + 10;
    drawPillButton(ops, hitTargets, {
      id: 'hdr-i2-home',
      x: pillX,
      y: pillY,
      width: 64,
      height: 32,
      radius: 8,
      bg: showFullHome ? I2_PALETTE.mint : '#213a26',
      text: 'i²',
      textColor: showFullHome ? I2_PALETTE.mintDark : I2_PALETTE.mint,
      font: FONT_DISPLAY_BOLD,
      fontSize: 17,
      widgetId: 'infieChat',
      actionId: 'toggle-home-mode',
      paddingLeft: 32,
      align: 'left',
    });
    drawInfinityEmblemOps(
      ops,
      pillX + 18,
      pillY + 16,
      10,
      showFullHome ? I2_PALETTE.mintDark : I2_PALETTE.mint,
      2.2
    );

    const crumbX = pillX + 76;
    drawPillButton(ops, hitTargets, {
      id: 'hdr-proj-crumb',
      x: crumbX,
      y: pillY + 1,
      width: Math.min(185, Math.max(115, (activeProj?.name.length ?? 10) * 9 + 24)),
      height: 30,
      radius: 8,
      bg: '#1c2b23',
      border: '#385c42',
      borderWidth: 1,
      text: activeProj?.name ?? 'Pet Show & Tell',
      textColor: I2_PALETTE.mint,
      font: FONT_DISPLAY_MEDIUM,
      fontSize: 14,
      bold: false,
      widgetId: 'infieChat',
      actionId: 'toggle-home-mode',
    });

    if (bounds.width >= 540) {
      drawPillButton(ops, hitTargets, {
        id: 'hdr-mode-switch',
        x: bounds.x + bounds.width - 178,
        y: pillY + 1,
        width: 110,
        height: 30,
        radius: 9,
        bg: '#1c2533',
        border: '#334155',
        text: showFullHome ? 'Chat View' : 'i² Home',
        textColor: I2_PALETTE.textPrimary,
        font: FONT_DISPLAY_MEDIUM,
        fontSize: 13,
        bold: false,
        widgetId: 'infieChat',
        actionId: 'toggle-home-mode',
      });
      ops.push({
        op: 'roundRect',
        x: bounds.x + bounds.width - 60,
        y: pillY + 2,
        width: 44,
        height: 28,
        radius: 9,
        color: '#16231d',
      });
      ops.push({
        op: 'text',
        text: 'Lvl 1',
        x: bounds.x + bounds.width - 38,
        y: pillY + 8,
        size: 13,
        color: '#94a3b8',
        align: 'center',
        bold: false,
        font: FONT_DISPLAY_MEDIUM,
        maxWidth: 40,
      });
    }
  }

  const bodyTop = bounds.y + hdrH + 14;
  const bodyH = Math.max(220, bounds.height - hdrH - 28);
  const padX = 20;

  const chatColX = bounds.x + padX;
  const chatColW = showFullHome
    ? Math.round((bounds.width - padX * 2 - 22) * 0.47)
    : bounds.width - padX * 2;

  // ── Left Column (Infie Convo + Action Row + Input) ─────────────────────
  const inputH = 44;
  const inputY = bounds.y + bounds.height - 16 - inputH;
  const actionRowH = 54;
  const actionRowY = inputY - 12 - actionRowH;
  const msgAreaBottom = actionRowY - 10;

  const scopeKey = `project:${ctx.activeProjectId}`;
  const msgs = ctx.messagesByScope[scopeKey] ?? ctx.messagesByScope.home ?? [];
  const displayedMsgs =
    msgs.length > 0
      ? msgs.slice(-3).map((m) => ({ id: m.id, role: m.role, text: m.content }))
      : [{ id: 'idle-greeting', role: 'assistant' as const, text: INFIE_GREETING }];

  let msgY = bodyTop + 6;
  const maxChars = Math.max(26, Math.floor((chatColW - 44) / 8.5));
  for (let i = 0; i < displayedMsgs.length; i++) {
    const m = displayedMsgs[i];
    const isUser = m.role === 'user';
    const lines = wrapLines(m.text, maxChars, 4);
    const bubbleH = Math.max(40, lines.length * 22 + 18);
    if (msgY + bubbleH > msgAreaBottom) break;
    const bubbleW = Math.min(chatColW - 14, Math.max(160, chatColW * (isUser ? 0.84 : 0.94)));
    const bubbleX = isUser ? chatColX + chatColW - bubbleW : chatColX;

    ops.push({
      op: 'roundRect',
      x: bubbleX,
      y: msgY,
      width: bubbleW,
      height: bubbleH,
      radius: 12,
      color: isUser ? I2_PALETTE.teal : '#181926',
    });
    if (!isUser) {
      ops.push({
        op: 'strokeRect',
        x: bubbleX,
        y: msgY,
        width: bubbleW,
        height: bubbleH,
        radius: 12,
        strokeWidth: 1,
        color: '#25263a',
      });
    }
    drawTextLines(
      ops,
      lines,
      bubbleX + 14,
      msgY + 9,
      22,
      15,
      isUser ? I2_PALETTE.tealDark : '#e2e8f0',
      isUser ? FONT_BODY_MEDIUM : FONT_BODY_REGULAR,
      bubbleW - 28,
      isUser
    );
    msgY += bubbleH + 10;
  }

  // HomeInfieActionRow (What's Next pill + Pet Show & Tell action pill)
  const whatsW = Math.min(148, Math.round(chatColW * 0.36));
  drawPillButton(ops, hitTargets, {
    id: 'home-whats-next-pill',
    x: chatColX,
    y: actionRowY + 4,
    width: whatsW,
    height: 46,
    radius: 12,
    bg: '#112825',
    border: '#2dd4bf',
    borderWidth: 1.4,
    text: "What's Next",
    textColor: I2_PALETTE.teal,
    font: FONT_DISPLAY_BOLD,
    fontSize: 14,
    align: 'left',
    paddingLeft: 34,
    widgetId: 'infieChat',
    actionId: 'home-whats-next',
  });
  drawSparkleOps(ops, chatColX + 18, actionRowY + 27, 8, I2_PALETTE.teal);

  const petBtnX = chatColX + whatsW + 10;
  const petBtnW = Math.max(120, chatColW - whatsW - 10);
  const sessBadge = resolveSessionActionLabel(petSess?.status);
  const petColor = sessBadge.urgent ? I2_PALETTE.amber : I2_PALETTE.teal;
  ops.push({
    op: 'roundRect',
    x: petBtnX,
    y: actionRowY,
    width: petBtnW,
    height: actionRowH,
    radius: 12,
    color: '#112825',
  });
  ops.push({
    op: 'strokeRect',
    x: petBtnX,
    y: actionRowY,
    width: petBtnW,
    height: actionRowH,
    radius: 12,
    strokeWidth: 1.4,
    color: petColor,
  });
  ops.push({
    op: 'text',
    text: `${sessBadge.label} · ${petSess?.name ?? 'Add Comments'}`,
    x: petBtnX + 12,
    y: actionRowY + 7,
    size: 13,
    color: petColor,
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: petBtnW - 24,
  });
  ops.push({
    op: 'text',
    text: `${petProj?.name ?? 'Pet Show and Tell'} · Tap to advance`,
    x: petBtnX + 12,
    y: actionRowY + 28,
    size: 12,
    color: '#cbd5e1',
    align: 'left',
    bold: false,
    font: FONT_BODY_REGULAR,
    maxWidth: petBtnW - 24,
  });
  hitTargets.push({
    id: 'home-pet-action-pill',
    x: petBtnX,
    y: actionRowY,
    width: petBtnW,
    height: actionRowH,
    widgetId: 'infieChat',
    actionId: 'home-pet-action',
    label: `${sessBadge.label} ${petSess?.name ?? 'Add Comments'}`,
  });

  // Chat Input Row
  const sendSize = 44;
  const inputBoxW = Math.max(120, chatColW - sendSize - 8);
  drawPillButton(ops, hitTargets, {
    id: 'infie-input-box',
    x: chatColX,
    y: inputY,
    width: inputBoxW,
    height: inputH,
    radius: 10,
    bg: '#151424',
    border: '#2c2d45',
    borderWidth: 1,
    text: 'Talk to Infie…',
    textColor: '#8b9ab0',
    font: FONT_BODY_REGULAR,
    fontSize: 14,
    bold: false,
    align: 'left',
    paddingLeft: 14,
    widgetId: 'infieChat',
    actionId: 'focus-input',
    hitLabel: 'Talk to Infie input',
  });

  const sendX = chatColX + inputBoxW + 8;
  drawPillButton(ops, hitTargets, {
    id: 'infie-send-btn',
    x: sendX,
    y: inputY,
    width: sendSize,
    height: inputH,
    radius: 10,
    bg: I2_PALETTE.teal,
    text: '',
    textColor: I2_PALETTE.mintDark,
    widgetId: 'infieChat',
    actionId: 'send-sample-prompt',
    hitLabel: 'Send message to Infie',
  });
  drawSendPlaneOps(ops, sendX + sendSize / 2, inputY + inputH / 2, 18, I2_PALETTE.mintDark);

  if (!showFullHome) {
    return;
  }

  // ── Right Column (ACTIVE PROJECTS 2-col Grid + Generate / Import CTA) ──
  const rightX = chatColX + chatColW + 22;
  const rightW = bounds.x + bounds.width - padX - rightX;

  ops.push({
    op: 'text',
    text: 'ACTIVE PROJECTS',
    x: rightX,
    y: bodyTop + 6,
    size: 12,
    color: '#6e7285',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: rightW,
  });

  const cardTop = bodyTop + 34;
  const cardGap = 14;
  const cardW = Math.floor((rightW - cardGap) / 2);
  const cardH = Math.min(182, Math.max(136, Math.round(bodyH * 0.46)));

  const shownProjects = ctx.projects.slice(0, 4);
  for (let i = 0; i < shownProjects.length; i++) {
    const p = shownProjects[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = rightX + col * (cardW + cardGap);
    const cy = cardTop + row * (cardH + cardGap);
    if (cy + cardH > inputY - 12) break;
    const isActive = p.id === ctx.activeProjectId;

    ops.push({
      op: 'roundRect',
      x: cx,
      y: cy,
      width: cardW,
      height: cardH,
      radius: 14,
      color: I2_PALETTE.card,
    });
    ops.push({
      op: 'strokeRect',
      x: cx,
      y: cy,
      width: cardW,
      height: cardH,
      radius: 14,
      strokeWidth: isActive ? 1.8 : 1,
      color: isActive ? I2_PALETTE.teal : '#212536',
    });

    // 36x36 project icon box
    ops.push({
      op: 'roundRect',
      x: cx + 14,
      y: cy + 14,
      width: 36,
      height: 36,
      radius: 10,
      color: '#192a22',
    });
    ops.push({
      op: 'strokeRect',
      x: cx + 14,
      y: cy + 14,
      width: 36,
      height: 36,
      radius: 10,
      strokeWidth: 1,
      color: '#34583f',
    });
    drawInfinityEmblemOps(ops, cx + 32, cy + 32, 9, I2_PALETTE.mint, 2);

    if (isActive) {
      ops.push({
        op: 'roundRect',
        x: cx + cardW - 82,
        y: cy + 18,
        width: 68,
        height: 24,
        radius: 12,
        color: '#122c2a',
      });
      ops.push({
        op: 'circle',
        cx: cx + cardW - 70,
        cy: cy + 30,
        r: 3.5,
        color: I2_PALETTE.teal,
      });
      ops.push({
        op: 'text',
        text: 'Active',
        x: cx + cardW - 60,
        y: cy + 21,
        size: 12,
        color: I2_PALETTE.teal,
        align: 'left',
        bold: true,
        font: FONT_DISPLAY_MEDIUM,
        maxWidth: 44,
      });
    }

    ops.push({
      op: 'text',
      text: p.name,
      x: cx + 14,
      y: cy + 62,
      size: 17,
      color: '#ffffff',
      align: 'left',
      bold: true,
      font: FONT_DISPLAY_BOLD,
      maxWidth: cardW - 28,
    });

    const descLines = wrapLines(p.description, Math.max(18, Math.floor((cardW - 28) / 7.5)), 2);
    drawTextLines(
      ops,
      descLines,
      cx + 14,
      cy + 88,
      17,
      13,
      '#848899',
      FONT_BODY_REGULAR,
      cardW - 28
    );

    ops.push({
      op: 'text',
      text: `${p.framework} · ${p.sessionCount} ${p.sessionCount === 1 ? 'session' : 'sessions'} · ${p.updatedLabel}`,
      x: cx + 14,
      y: cy + cardH - 28,
      size: 12,
      color: '#686d80',
      align: 'left',
      bold: false,
      font: FONT_DISPLAY_REGULAR,
      maxWidth: cardW - 28,
    });

    hitTargets.push({
      id: `proj-card-${p.id}`,
      x: cx,
      y: cy,
      width: cardW,
      height: cardH,
      widgetId: 'infieChat',
      actionId: `select-project:${p.id}`,
      label: `Open ${p.name}`,
    });
  }

  // Bottom CTA Row: ⚡ Generate new Expo Project + Import Project
  const ctaY = inputY - 6;
  const ctaH = 50;
  const importW = Math.min(148, Math.round(rightW * 0.34));
  const genW = Math.max(160, rightW - importW - 12);

  drawPillButton(ops, hitTargets, {
    id: 'home-generate-expo',
    x: rightX,
    y: ctaY,
    width: genW,
    height: ctaH,
    radius: 12,
    bg: '#1a9999',
    gradient: {
      type: 'linear',
      x0: rightX,
      y0: ctaY,
      x1: rightX + genW * 0.87,
      y1: ctaY + ctaH,
      colors: ['#8cffff', '#1a9999'],
      stops: [0.05, 0.87],
    },
    text: 'Generate new Expo Project',
    textColor: I2_PALETTE.mintDark,
    font: FONT_DISPLAY_BOLD,
    fontSize: 14,
    align: 'left',
    paddingLeft: 34,
    widgetId: 'infieChat',
    actionId: 'generate-expo-project',
  });
  drawBoltOps(ops, rightX + 18, ctaY + ctaH / 2, 16, I2_PALETTE.mintDark);

  drawPillButton(ops, hitTargets, {
    id: 'home-import-project',
    x: rightX + genW + 12,
    y: ctaY,
    width: importW,
    height: ctaH,
    radius: 12,
    bg: '#181726',
    border: '#2d2c40',
    borderWidth: 1,
    text: 'Import Project',
    textColor: '#d4d4d8',
    font: FONT_DISPLAY_MEDIUM,
    fontSize: 13,
    bold: false,
    widgetId: 'infieChat',
    actionId: 'import-project',
  });
}

/**
 * Renders the authentic Emulator Canvas matching i2-ide-prototype:
 * #252323 toolbar, Web/Android/iOS target switcher, and cream #f7f5ef + #234e38 Pet Show & Tell device viewport.
 */
function renderEmulatorCell(
  ops: Record<string, unknown>[],
  hitTargets: WindowSurfaceHitTarget[],
  bounds: CellBounds,
  ctx: WindowRenderDataContext
) {
  ops.push({
    op: 'roundRect',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    radius: 16,
    color: I2_PALETTE.emuCanvas,
  });

  // Top #252323 Emulator toolbar
  const barH = 50;
  ops.push({
    op: 'rect',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: barH,
    color: I2_PALETTE.emuToolbar,
  });
  ops.push({
    op: 'line',
    x1: bounds.x,
    y1: bounds.y + barH,
    x2: bounds.x + bounds.width,
    y2: bounds.y + barH,
    strokeWidth: 1,
    color: '#3d3a3a',
  });

  const activeProj = ctx.projects.find((p) => p.id === ctx.activeProjectId) ?? ctx.projects[0];
  const isPetProject = (activeProj?.id ?? 'pet') === 'pet';

  ops.push({
    op: 'text',
    text: 'Emulator Canvas',
    x: bounds.x + 16,
    y: bounds.y + 14,
    size: 16,
    color: '#ffffff',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: 180,
  });

  const target = ctx.emulatorTarget ?? 'web';
  const targets: readonly { id: 'web' | 'android' | 'ios'; label: string }[] = [
    { id: 'web', label: 'Web' },
    { id: 'android', label: 'Android' },
    { id: 'ios', label: 'iOS' },
  ];
  let tx = bounds.x + Math.min(200, Math.round(bounds.width * 0.36));
  const pillW = Math.min(78, Math.max(58, Math.floor((bounds.width - tx - 90) / 3)));
  for (const t of targets) {
    const active = target === t.id;
    drawPillButton(ops, hitTargets, {
      id: `emu-target-${t.id}`,
      x: tx,
      y: bounds.y + 10,
      width: pillW,
      height: 30,
      radius: 8,
      bg: active ? I2_PALETTE.emuPill : '#1e1c1c',
      border: active ? I2_PALETTE.mint : '#3a3737',
      borderWidth: active ? 1.4 : 1,
      text: t.label,
      textColor: active ? I2_PALETTE.mint : '#a1a1aa',
      font: FONT_DISPLAY_MEDIUM,
      fontSize: 13,
      bold: active,
      widgetId: 'emuWeb',
      actionId: `emu-target:${t.id}`,
    });
    tx += pillW + 6;
  }

  drawPillButton(ops, hitTargets, {
    id: 'emu-reload',
    x: bounds.x + bounds.width - 84,
    y: bounds.y + 10,
    width: 72,
    height: 30,
    radius: 8,
    bg: '#1c2b23',
    border: '#385c42',
    text: 'Reload',
    textColor: I2_PALETTE.mint,
    font: FONT_DISPLAY_MEDIUM,
    fontSize: 13,
    bold: false,
    widgetId: 'emuWeb',
    actionId: 'emu-reload',
  });

  // Device bezel inside canvas
  const phoneMaxW = Math.min(430, Math.max(240, bounds.width - 44));
  const phoneW = Math.round(phoneMaxW);
  const phoneX = Math.round(bounds.x + (bounds.width - phoneW) / 2);
  const phoneY = bounds.y + barH + 14;
  const phoneH = Math.max(260, bounds.height - barH - 28);

  ops.push({
    op: 'roundRect',
    x: phoneX,
    y: phoneY,
    width: phoneW,
    height: phoneH,
    radius: 26,
    color: '#141416',
  });
  ops.push({
    op: 'strokeRect',
    x: phoneX,
    y: phoneY,
    width: phoneW,
    height: phoneH,
    radius: 26,
    strokeWidth: 2,
    color: '#44403c',
  });

  // Inner Pet Show & Tell mobile screen (#f7f5ef warm cream)
  const pad = 10;
  const scrX = phoneX + pad;
  const scrY = phoneY + pad;
  const scrW = phoneW - pad * 2;
  const scrH = phoneH - pad * 2;

  pushClipRoundRect(ops, scrX, scrY, scrW, scrH, 18);
  ops.push({
    op: 'roundRect',
    x: scrX,
    y: scrY,
    width: scrW,
    height: scrH,
    radius: 18,
    color: I2_PALETTE.petCream,
  });

  // Status / URL header bar
  ops.push({
    op: 'rect',
    x: scrX,
    y: scrY,
    width: scrW,
    height: 32,
    color: '#ede9de',
  });
  ops.push({
    op: 'text',
    text: `${target.toUpperCase()} · localhost:8081`,
    x: scrX + scrW / 2,
    y: scrY + 8,
    size: 12,
    color: '#57534e',
    align: 'center',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: scrW - 24,
  });

  // App Forest Green Header (#234e38) or active project preview header
  const appHdrY = scrY + 32;
  const appHdrH = 44;
  ops.push({
    op: 'rect',
    x: scrX,
    y: appHdrY,
    width: scrW,
    height: appHdrH,
    color: isPetProject ? I2_PALETTE.petForest : '#1e293b',
  });
  ops.push({
    op: 'text',
    text: isPetProject ? 'Pet Show & Tell' : (activeProj?.name ?? 'Expo Preview'),
    x: scrX + 16,
    y: appHdrY + 12,
    size: 16,
    color: '#ffffff',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: scrW - 110,
  });
  ops.push({
    op: 'roundRect',
    x: scrX + scrW - 66,
    y: appHdrY + 11,
    width: 52,
    height: 22,
    radius: 11,
    color: '#abefa3',
  });
  ops.push({
    op: 'text',
    text: 'Live',
    x: scrX + scrW - 40,
    y: appHdrY + 14,
    size: 12,
    color: '#061413',
    align: 'center',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: 44,
  });

  if (!isPetProject) {
    const cardX = scrX + 12;
    const cardY = appHdrY + appHdrH + 16;
    const cardW = scrW - 24;
    ops.push({
      op: 'roundRect',
      x: cardX,
      y: cardY,
      width: cardW,
      height: Math.max(120, scrH - 120),
      radius: 14,
      color: '#ffffff',
    });
    ops.push({
      op: 'strokeRect',
      x: cardX,
      y: cardY,
      width: cardW,
      height: Math.max(120, scrH - 120),
      radius: 14,
      strokeWidth: 1,
      color: I2_PALETTE.petBorder,
    });
    ops.push({
      op: 'text',
      text: activeProj?.name ?? 'Expo App Preview',
      x: cardX + 16,
      y: cardY + 20,
      size: 17,
      color: '#0f172a',
      align: 'left',
      bold: true,
      font: FONT_DISPLAY_BOLD,
      maxWidth: cardW - 32,
    });
    ops.push({
      op: 'text',
      text: activeProj?.description ?? 'Simulated Expo preview bundle',
      x: cardX + 16,
      y: cardY + 52,
      size: 13,
      color: '#475569',
      align: 'left',
      bold: false,
      font: FONT_BODY_REGULAR,
      maxWidth: cardW - 32,
    });
    pushClipRestore(ops);
    return;
  }

  // Featured Pet Card
  const cardX = scrX + 12;
  const cardY = appHdrY + appHdrH + 12;
  const cardW = scrW - 24;
  const heroH = Math.min(118, Math.round(scrH * 0.24));

  ops.push({
    op: 'roundRect',
    x: cardX,
    y: cardY,
    width: cardW,
    height: heroH,
    radius: 14,
    color: '#f59e0b',
    gradient: {
      type: 'linear',
      x0: cardX,
      y0: cardY,
      x1: cardX + cardW,
      y1: cardY + heroH,
      colors: ['#fde68a', '#f59e0b'],
      stops: [0, 1],
    },
  });
  ops.push({
    op: 'text',
    text: 'Sunny · Golden Retriever',
    x: cardX + 14,
    y: cardY + 14,
    size: 16,
    color: '#451a03',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: cardW - 28,
  });
  ops.push({
    op: 'text',
    text: '"Afternoon zoomies after catching every tennis ball!"',
    x: cardX + 14,
    y: cardY + 42,
    size: 13,
    color: '#78350f',
    align: 'left',
    bold: false,
    font: FONT_BODY_MEDIUM,
    maxWidth: cardW - 28,
  });
  const leadComment = ctx.appPreview.comments[0];
  const totalLikes = ctx.appPreview.comments.reduce((acc, c) => acc + c.likes, 0);
  const userLiked = Boolean(
    leadComment?.userReaction === 'like' || leadComment?.userReaction === 'love'
  );

  ops.push({
    op: 'text',
    text: `${totalLikes} likes · ${ctx.appPreview.comments.length} comments · ${ctx.appPreview.targetBranch}`,
    x: cardX + 14,
    y: cardY + heroH - 28,
    size: 12,
    color: '#451a03',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: cardW - 28,
  });

  // Action Bar inside Emulator viewport: ♥ Like & + Comment
  const actY = cardY + heroH + 10;
  const halfBtnW = Math.floor((cardW - 8) / 2);
  drawPillButton(ops, hitTargets, {
    id: 'emu-like-btn',
    x: cardX,
    y: actY,
    width: halfBtnW,
    height: 36,
    radius: 10,
    bg: userLiked ? '#e11d48' : '#ffffff',
    border: userLiked ? '#be123c' : '#d6d3c9',
    text: userLiked ? `Liked (${totalLikes})` : `Like (${totalLikes})`,
    textColor: userLiked ? '#ffffff' : '#1c1917',
    font: FONT_DISPLAY_BOLD,
    fontSize: 13,
    widgetId: 'emuWeb',
    actionId: 'emu-like',
  });
  drawPillButton(ops, hitTargets, {
    id: 'emu-comment-btn',
    x: cardX + halfBtnW + 8,
    y: actY,
    width: halfBtnW,
    height: 36,
    radius: 10,
    bg: I2_PALETTE.petForest,
    text: '+ Add Comment',
    textColor: '#ffffff',
    font: FONT_DISPLAY_BOLD,
    fontSize: 13,
    widgetId: 'emuWeb',
    actionId: 'emu-post',
  });

  // Live Comments feed
  let cmtY = actY + 46;
  const maxCommentY = scrY + scrH - 10;
  for (const comment of ctx.appPreview.comments.slice(-4)) {
    if (cmtY + 46 > maxCommentY) break;
    ops.push({
      op: 'roundRect',
      x: cardX,
      y: cmtY,
      width: cardW,
      height: 44,
      radius: 10,
      color: '#ffffff',
    });
    ops.push({
      op: 'strokeRect',
      x: cardX,
      y: cmtY,
      width: cardW,
      height: 44,
      radius: 10,
      strokeWidth: 1,
      color: I2_PALETTE.petBorder,
    });
    ops.push({
      op: 'text',
      text: `${comment.author}`,
      x: cardX + 10,
      y: cmtY + 5,
      size: 12,
      color: I2_PALETTE.petForest,
      align: 'left',
      bold: true,
      font: FONT_DISPLAY_BOLD,
      maxWidth: cardW - 20,
    });
    ops.push({
      op: 'text',
      text: comment.text,
      x: cardX + 10,
      y: cmtY + 21,
      size: 12,
      color: '#292524',
      align: 'left',
      bold: false,
      font: FONT_BODY_REGULAR,
      maxWidth: cardW - 20,
    });
    cmtY += 50;
  }

  pushClipRestore(ops);
}

function getGenericWidgetContent(
  widgetId: CanonicalWidgetId,
  ctx: WindowRenderDataContext
): {
  title: string;
  lines: { text: string; color?: string }[];
  actions: { id: string; label: string; tone?: 'teal' | 'amber' | 'dark' }[];
} {
  const activeProj = ctx.projects.find((p) => p.id === ctx.activeProjectId) ?? ctx.projects[0];
  const activeSess = ctx.sessions.find((s) => s.id === ctx.activeSessionId) ?? ctx.sessions[0];
  const projFiles = SEEDED_FILES[ctx.activeProjectId] ?? SEEDED_FILES.pet ?? {};
  const fileNames = Object.keys(projFiles);
  const currentFile =
    ctx.selectedFilePath && projFiles[ctx.selectedFilePath]
      ? ctx.selectedFilePath
      : (fileNames[0] ?? 'comments.ts');

  switch (widgetId) {
    case 'workspaceEnv':
      return {
        title: `i² Environment · ${ctx.environmentName}`,
        lines: [
          { text: `Local shared simulation · ${ctx.providerKind}`, color: I2_PALETTE.mint },
          {
            text: `${activeProj?.name ?? 'Pet Show'} · ${activeSess?.name ?? 'Add Comments'}`,
            color: '#e2e8f0',
          },
          { text: ctx.recentEvents[0]?.summary ?? 'Workspace ready', color: '#94a3b8' },
        ],
        actions: [
          { id: 'env-switch', label: 'Switch Env', tone: 'teal' },
          { id: 'run-tests', label: 'Run Tests', tone: 'dark' },
        ],
      };
    case 'currentGoal':
      return {
        title: 'Current Goal',
        lines: [
          { text: activeSess?.name ?? 'Add Comments', color: I2_PALETTE.teal },
          {
            text: activeSess?.goal ?? 'Implement comments and emoji reactions on pet posts.',
            color: '#e2e8f0',
          },
        ],
        actions: [{ id: 'approve-goal', label: 'Approve Plan', tone: 'teal' }],
      };
    case 'agentTasks':
      return {
        title: 'Agent Tasks',
        lines: (activeSess?.agentTasks ?? []).slice(0, 4).map((t) => ({
          text: `${t.done ? '[✓]' : '[•]'} ${t.text}`,
          color: t.done ? I2_PALETTE.mint : '#e2e8f0',
        })),
        actions: [{ id: 'advance-task', label: 'Advance Next', tone: 'teal' }],
      };
    case 'humanTesting':
      return {
        title: 'Human Testing Checklist',
        lines: (activeSess?.humanTests ?? []).slice(0, 4).map((t) => ({
          text: `${t.done ? '[✓]' : '[ ]'} ${t.text}`,
          color: t.done ? I2_PALETTE.mint : I2_PALETTE.amber,
        })),
        actions: [
          { id: 'toggle-first-human-test', label: 'Toggle Check', tone: 'amber' },
          { id: 'submit-report', label: 'Submit Report', tone: 'teal' },
        ],
      };
    case 'projectFolder':
    case 'explorer':
      return {
        title: widgetId === 'explorer' ? `Explorer · ${currentFile}` : 'Project Folder',
        lines:
          widgetId === 'explorer'
            ? (projFiles[currentFile] ?? '')
                .split('\n')
                .slice(0, 5)
                .map((l) => ({
                  text: l.slice(0, 64),
                  color: '#cbd5e1',
                }))
            : fileNames
                .slice(0, 5)
                .map((f) => ({ text: f, color: f === currentFile ? I2_PALETTE.mint : '#cbd5e1' })),
        actions: [{ id: 'cycle-file', label: 'Next File', tone: 'dark' }],
      };
    case 'git':
      return {
        title: 'Git & Pull Requests',
        lines: [
          { text: `Branch: ${ctx.appPreview.targetBranch}`, color: I2_PALETTE.teal },
          { text: `Session: ${activeSess?.status ?? 'NEEDS YOU'}`, color: '#e2e8f0' },
        ],
        actions: [
          { id: 'open-pr', label: 'Open PR', tone: 'teal' },
          { id: 'merge-pr', label: 'Merge', tone: 'dark' },
        ],
      };
    case 'music': {
      const track = LEEK_BEATS_TRACKS[ctx.musicTrackIndex % LEEK_BEATS_TRACKS.length];
      return {
        title: 'LeekBeats Music',
        lines: [
          {
            text: `${ctx.musicPlaying ? 'Playing' : 'Paused'}: ${track?.title ?? 'Lo-fi'}`,
            color: I2_PALETTE.teal,
          },
          { text: `${track?.artist ?? 'i²'} · ${track?.durationSec ?? 180}s`, color: '#94a3b8' },
        ],
        actions: [
          { id: 'music-toggle', label: ctx.musicPlaying ? 'Pause' : 'Play', tone: 'teal' },
          { id: 'music-next', label: 'Next', tone: 'dark' },
        ],
      };
    }
    default: {
      const meta = WIDGET_CATALOG.find((c) => c.id === widgetId);
      return {
        title: meta?.label ?? widgetId,
        lines: [
          { text: meta?.description ?? `${widgetId} active`, color: '#e2e8f0' },
          {
            text: `${activeProj?.name ?? 'Pet Show'} · ${activeSess?.name ?? 'Add Comments'}`,
            color: '#94a3b8',
          },
        ],
        actions: [{ id: 'run-tests', label: 'Run Action', tone: 'teal' }],
      };
    }
  }
}

function renderCatalogCell(
  ops: Record<string, unknown>[],
  hitTargets: WindowSurfaceHitTarget[],
  widgetId: CanonicalWidgetId,
  bounds: CellBounds,
  ctx: WindowRenderDataContext,
  showCellTitle: boolean
) {
  const data = getGenericWidgetContent(widgetId, ctx);
  ops.push({
    op: 'roundRect',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    radius: 14,
    color: I2_PALETTE.card,
  });
  ops.push({
    op: 'strokeRect',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    radius: 14,
    strokeWidth: 1.2,
    color: I2_PALETTE.cardBorder,
  });

  let y = bounds.y + (showCellTitle ? 40 : 16);
  if (!showCellTitle) {
    ops.push({
      op: 'text',
      text: data.title,
      x: bounds.x + 16,
      y,
      size: 16,
      color: I2_PALETTE.mint,
      align: 'left',
      bold: true,
      font: FONT_DISPLAY_BOLD,
      maxWidth: bounds.width - 32,
    });
    y += 30;
  }

  const maxChars = Math.max(20, Math.floor((bounds.width - 32) / 8.2));
  const btnAreaTop = bounds.y + bounds.height - 52;
  for (const l of data.lines) {
    const wrapped = wrapLines(l.text, maxChars, 2);
    for (const wl of wrapped) {
      if (y + 22 > btnAreaTop) break;
      ops.push({
        op: 'text',
        text: wl,
        x: bounds.x + 16,
        y,
        size: 14,
        color: l.color ?? '#cbd5e1',
        align: 'left',
        bold: false,
        font: FONT_BODY_REGULAR,
        maxWidth: bounds.width - 32,
      });
      y += 23;
    }
  }

  let ax = bounds.x + 16;
  for (const act of data.actions) {
    const bw = Math.min(156, Math.max(96, act.label.length * 10 + 28));
    if (ax + bw > bounds.x + bounds.width - 12) break;
    const isTeal = act.tone === 'teal';
    const isAmber = act.tone === 'amber';
    drawPillButton(ops, hitTargets, {
      id: `act:${widgetId}:${act.id}`,
      x: ax,
      y: btnAreaTop + 4,
      width: bw,
      height: 36,
      radius: 10,
      bg: isTeal ? I2_PALETTE.teal : isAmber ? '#78350f' : '#182232',
      border: isTeal ? undefined : isAmber ? I2_PALETTE.amber : '#334155',
      text: act.label,
      textColor: isTeal ? I2_PALETTE.mintDark : isAmber ? '#fef3c7' : '#e2e8f0',
      font: FONT_DISPLAY_BOLD,
      fontSize: 13,
      widgetId,
      actionId: act.id,
    });
    ax += bw + 10;
  }
}

export function buildWindowSurfaceModel(params: {
  win: SpatialWindow;
  focused: boolean;
  hovered?: boolean;
  hoveredTargetId?: string | null;
  hoveredHitId?: string | null;
  focusedWidgetId?: CanonicalWidgetId | null;
  context?: WindowRenderDataContext;
  ctx?: WindowRenderDataContext;
  maxSwapchainWidth?: number;
  maxSwapchainHeight?: number;
}): WindowSurfaceModel {
  const { win, focused } = params;
  const context = params.context ?? params.ctx;
  if (!context) {
    throw new Error('buildWindowSurfaceModel requires context or ctx');
  }
  const dims = getEffectiveWindowDimensions(win);
  const pxSpec = computeWindowPixelSpec({
    widthM: dims.widthM,
    heightM: dims.heightM,
    widgetCount: win.widgetIds.length,
    hasHighDensityContent:
      win.widgetIds.includes('infieChat') ||
      win.widgetIds.includes('emuWeb') ||
      win.widgetIds.includes('explorer'),
    totalVisibleWindows: context.visibleWindowCount || 2,
    maxSwapchainWidth: params.maxSwapchainWidth ?? 2048,
    maxSwapchainHeight: params.maxSwapchainHeight ?? 2048,
  });
  const widthPx = pxSpec.widthPx;
  const heightPx = pxSpec.heightPx;
  const cornerRadiusPx = 22;

  const ops: Record<string, unknown>[] = [];
  const hitTargets: WindowSurfaceHitTarget[] = [];

  // Window rounded backdrop (#0a0814 desktop color)
  ops.push({
    op: 'roundRect',
    x: 0,
    y: 0,
    width: widthPx,
    height: heightPx,
    radius: cornerRadiusPx,
    color: I2_PALETTE.backdrop,
  });
  ops.push({
    op: 'strokeRect',
    x: 2,
    y: 2,
    width: widthPx - 4,
    height: heightPx - 4,
    radius: cornerRadiusPx - 2,
    strokeWidth: focused ? 2.5 : 1.4,
    color: focused ? I2_PALETTE.teal : '#25263a',
  });

  // Minimal clean window header bar (no telemetry / swapchain / OpenXR debug text!)
  const winHdrH = 44;
  ops.push({
    op: 'roundRect',
    x: 4,
    y: 4,
    width: widthPx - 8,
    height: winHdrH,
    radius: 18,
    color: '#111022',
  });
  ops.push({
    op: 'text',
    text: win.title,
    x: 20,
    y: 13,
    size: 16,
    color: focused ? '#ffffff' : '#cbd5e1',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: Math.max(120, widthPx - (win.widgetIds.length > 1 ? 260 : 120)),
  });

  let ctrlX = widthPx - 14;
  // Close button
  ctrlX -= 36;
  drawPillButton(ops, hitTargets, {
    id: `win:close:${win.windowId}`,
    x: ctrlX,
    y: 10,
    width: 36,
    height: 30,
    radius: 9,
    bg: '#2c1522',
    border: '#fb7185',
    text: '×',
    textColor: '#ffe4e6',
    font: FONT_DISPLAY_BOLD,
    fontSize: 16,
    widgetId: '__window__',
    actionId: 'close-window',
    hitLabel: 'Close Window',
  });

  if (win.widgetIds.length > 1) {
    const resolved = resolveWindowGroupLayout(win);
    ctrlX -= 88;
    drawPillButton(ops, hitTargets, {
      id: `win:toggle-cols:${win.windowId}`,
      x: ctrlX,
      y: 10,
      width: 80,
      height: 30,
      radius: 9,
      bg: '#16252c',
      border: I2_PALETTE.teal,
      text: resolved.columns === 2 ? '2 Col Grid' : '1 Col',
      textColor: I2_PALETTE.teal,
      font: FONT_DISPLAY_MEDIUM,
      fontSize: 12,
      widgetId: '__window__',
      actionId: 'toggle-group-columns',
      hitLabel: 'Toggle Grid Columns',
    });
  }

  const contentBounds = {
    x: 10,
    y: winHdrH + 8,
    width: widthPx - 20,
    height: heightPx - winHdrH - 18,
  };

  if (win.widgetIds.length === 1) {
    const wid = win.widgetIds[0];
    pushClipRoundRect(
      ops,
      contentBounds.x,
      contentBounds.y,
      contentBounds.width,
      contentBounds.height,
      14
    );
    if (wid === 'infieChat') {
      renderInfieOrHomeCell(ops, hitTargets, contentBounds, context, true);
    } else if (wid === 'emuWeb') {
      renderEmulatorCell(ops, hitTargets, contentBounds, context);
    } else {
      renderCatalogCell(ops, hitTargets, wid, contentBounds, context, false);
    }
    pushClipRestore(ops);
  } else {
    // True simultaneous grouped window: every widget renders inside an adjustable cell!
    const { cells, dividers } = computeGroupedCellLayout(win, contentBounds, 16);
    for (const cell of cells) {
      const wid = cell.widgetId;
      pushClipRoundRect(ops, cell.x, cell.y, cell.width, cell.height, 14);

      if (wid === 'infieChat') {
        renderInfieOrHomeCell(ops, hitTargets, cell, context, false, true);
      } else if (wid === 'emuWeb') {
        renderEmulatorCell(ops, hitTargets, cell, context);
      } else {
        renderCatalogCell(ops, hitTargets, wid, cell, context, true);
      }

      // Per-cell compact header overlay for Pop / Reorder without hiding content
      const meta = WIDGET_CATALOG.find((c) => c.id === wid);
      ops.push({
        op: 'roundRect',
        x: cell.x + 6,
        y: cell.y + 6,
        width: cell.width - 12,
        height: 28,
        radius: 8,
        color: '#0e1422cc',
      });
      ops.push({
        op: 'text',
        text: meta?.label ?? wid,
        x: cell.x + 14,
        y: cell.y + 10,
        size: 13,
        color: I2_PALETTE.mint,
        align: 'left',
        bold: true,
        font: FONT_DISPLAY_BOLD,
        maxWidth: Math.max(60, cell.width - 150),
      });

      const popX = cell.x + cell.width - 62;
      drawPillButton(ops, hitTargets, {
        id: `cell:pop:${wid}`,
        x: popX,
        y: cell.y + 8,
        width: 52,
        height: 24,
        radius: 7,
        bg: '#1c2b23',
        border: I2_PALETTE.mint,
        text: 'Pop',
        textColor: I2_PALETTE.mint,
        font: FONT_DISPLAY_MEDIUM,
        fontSize: 11,
        widgetId: wid,
        actionId: 'ungroup-widget',
        hitLabel: `Pop ${meta?.label ?? wid} out`,
      });
      if (cell.index > 0) {
        drawPillButton(ops, hitTargets, {
          id: `cell:up:${wid}`,
          x: popX - 36,
          y: cell.y + 8,
          width: 30,
          height: 24,
          radius: 7,
          bg: '#1c2432',
          border: '#475569',
          text: '↑',
          textColor: '#e2e8f0',
          font: FONT_DISPLAY_BOLD,
          fontSize: 12,
          widgetId: wid,
          actionId: 'reorder-up',
          hitLabel: 'Move widget earlier',
        });
      }
      pushClipRestore(ops);
    }

    // Adjustable cell boundary divider handles
    for (const div of dividers) {
      if (div.axis === 'col') {
        const cx = Math.round(div.x + div.width / 2);
        const cy = Math.round(div.y + div.height / 2);
        ops.push({
          op: 'line',
          x1: cx,
          y1: div.y + 8,
          x2: cx,
          y2: div.y + div.height - 8,
          strokeWidth: 2,
          color: '#2dd4bf66',
        });
        drawPillButton(ops, hitTargets, {
          id: `div:col:${div.index}:shrink`,
          x: cx - 16,
          y: cy - 34,
          width: 32,
          height: 28,
          radius: 8,
          bg: '#112825',
          border: I2_PALETTE.teal,
          text: '‹',
          textColor: I2_PALETTE.teal,
          font: FONT_DISPLAY_BOLD,
          fontSize: 16,
          widgetId: '__window__',
          actionId: `adjust-split:col:${div.index}:-0.08`,
          hitLabel: 'Narrow Left Column',
        });
        drawPillButton(ops, hitTargets, {
          id: `div:col:${div.index}:grow`,
          x: cx - 16,
          y: cy + 6,
          width: 32,
          height: 28,
          radius: 8,
          bg: '#112825',
          border: I2_PALETTE.teal,
          text: '›',
          textColor: I2_PALETTE.teal,
          font: FONT_DISPLAY_BOLD,
          fontSize: 16,
          widgetId: '__window__',
          actionId: `adjust-split:col:${div.index}:0.08`,
          hitLabel: 'Widen Left Column',
        });
      } else {
        const cx = Math.round(div.x + div.width / 2);
        const cy = Math.round(div.y + div.height / 2);
        ops.push({
          op: 'line',
          x1: div.x + 8,
          y1: cy,
          x2: div.x + div.width - 8,
          y2: cy,
          strokeWidth: 2,
          color: '#2dd4bf66',
        });
        drawPillButton(ops, hitTargets, {
          id: `div:row:${div.index}:shrink`,
          x: cx - 40,
          y: cy - 13,
          width: 34,
          height: 26,
          radius: 8,
          bg: '#112825',
          border: I2_PALETTE.teal,
          text: '-',
          textColor: I2_PALETTE.teal,
          font: FONT_DISPLAY_BOLD,
          fontSize: 16,
          widgetId: '__window__',
          actionId: `adjust-split:row:${div.index}:-0.08`,
          hitLabel: 'Shrink Top Row',
        });
        drawPillButton(ops, hitTargets, {
          id: `div:row:${div.index}:grow`,
          x: cx + 6,
          y: cy - 13,
          width: 34,
          height: 26,
          radius: 8,
          bg: '#112825',
          border: I2_PALETTE.teal,
          text: '+',
          textColor: I2_PALETTE.teal,
          font: FONT_DISPLAY_BOLD,
          fontSize: 16,
          widgetId: '__window__',
          actionId: `adjust-split:row:${div.index}:0.08`,
          hitLabel: 'Expand Top Row',
        });
      }
    }
  }

  return {
    windowId: win.windowId,
    widthPx,
    heightPx,
    bucketWidthPx: pxSpec.bucketWidthPx,
    bucketHeightPx: pxSpec.bucketHeightPx,
    widthM: dims.widthM,
    heightM: dims.heightM,
    cornerRadiusPx,
    ops,
    hitTargets,
  };
}

/**
 * In-VR Sign-In panel rendered in OpenXR when signed out (no 2D Horizon panel round-trip).
 */
export function buildAuthWindowSurfaceModel(params: {
  email: string;
  passwordMasked: string;
  errorMessage?: string | null;
}): WindowSurfaceModel {
  const widthM = 0.82;
  const heightM = 0.66;
  const pxSpec = computeWindowPixelSpec({
    widthM,
    heightM,
    widgetCount: 1,
    hasHighDensityContent: true,
    totalVisibleWindows: 1,
  });
  const w = pxSpec.widthPx;
  const h = pxSpec.heightPx;
  const ops: Record<string, unknown>[] = [];
  const hitTargets: WindowSurfaceHitTarget[] = [];

  ops.push({
    op: 'roundRect',
    x: 0,
    y: 0,
    width: w,
    height: h,
    radius: 24,
    color: I2_PALETTE.backdrop,
  });
  ops.push({
    op: 'strokeRect',
    x: 2,
    y: 2,
    width: w - 4,
    height: h - 4,
    radius: 22,
    strokeWidth: 2,
    color: I2_PALETTE.teal,
  });

  ops.push({
    op: 'roundRect',
    x: 40,
    y: 40,
    width: 92,
    height: 38,
    radius: 10,
    color: I2_PALETTE.mint,
  });
  drawInfinityEmblemOps(ops, 62, 59, 12, I2_PALETTE.mintDark, 2.5);
  ops.push({
    op: 'text',
    text: 'i²',
    x: 86,
    y: 47,
    size: 22,
    color: I2_PALETTE.mintDark,
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: 40,
  });

  ops.push({
    op: 'text',
    text: 'Sign in to i²',
    x: 40,
    y: 98,
    size: 28,
    color: '#ffffff',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: w - 80,
  });
  ops.push({
    op: 'text',
    text: 'Enter your spatial workspace with Infie, Projects, and Emulators.',
    x: 40,
    y: 138,
    size: 16,
    color: '#94a3b8',
    align: 'left',
    bold: false,
    font: FONT_BODY_REGULAR,
    maxWidth: w - 80,
  });

  // Email box
  ops.push({
    op: 'text',
    text: 'EMAIL',
    x: 40,
    y: 186,
    size: 12,
    color: '#64748b',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: 120,
  });
  ops.push({
    op: 'roundRect',
    x: 40,
    y: 208,
    width: w - 80,
    height: 48,
    radius: 12,
    color: I2_PALETTE.card,
  });
  ops.push({
    op: 'strokeRect',
    x: 40,
    y: 208,
    width: w - 80,
    height: 48,
    radius: 12,
    strokeWidth: 1.2,
    color: '#273043',
  });
  ops.push({
    op: 'text',
    text: params.email,
    x: 56,
    y: 220,
    size: 16,
    color: '#f8fafc',
    align: 'left',
    bold: false,
    font: FONT_BODY_REGULAR,
    maxWidth: w - 112,
  });

  // Password box
  ops.push({
    op: 'text',
    text: 'PASSWORD',
    x: 40,
    y: 274,
    size: 12,
    color: '#64748b',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: 120,
  });
  ops.push({
    op: 'roundRect',
    x: 40,
    y: 296,
    width: w - 80,
    height: 48,
    radius: 12,
    color: I2_PALETTE.card,
  });
  ops.push({
    op: 'strokeRect',
    x: 40,
    y: 296,
    width: w - 80,
    height: 48,
    radius: 12,
    strokeWidth: 1.2,
    color: '#273043',
  });
  ops.push({
    op: 'text',
    text: params.passwordMasked,
    x: 56,
    y: 308,
    size: 16,
    color: '#f8fafc',
    align: 'left',
    bold: false,
    font: FONT_BODY_REGULAR,
    maxWidth: w - 112,
  });

  if (params.errorMessage) {
    ops.push({
      op: 'text',
      text: params.errorMessage,
      x: 40,
      y: 356,
      size: 14,
      color: I2_PALETTE.rose,
      align: 'left',
      bold: true,
      font: FONT_BODY_MEDIUM,
      maxWidth: w - 80,
    });
  }

  drawPillButton(ops, hitTargets, {
    id: 'vr-auth-signin',
    x: 40,
    y: h - 104,
    width: w - 80,
    height: 54,
    radius: 12,
    bg: I2_PALETTE.teal,
    gradient: {
      type: 'linear',
      x0: 40,
      y0: h - 104,
      x1: w - 40,
      y1: h - 50,
      colors: ['#8cffff', '#1a9999'],
      stops: [0.05, 0.87],
    },
    text: 'Sign In to i² Workspace',
    textColor: I2_PALETTE.mintDark,
    font: FONT_DISPLAY_BOLD,
    fontSize: 17,
    widgetId: '__window__',
    actionId: 'auth-sign-in',
  });

  return {
    windowId: 'win-vr-auth',
    widthPx: w,
    heightPx: h,
    bucketWidthPx: pxSpec.bucketWidthPx,
    bucketHeightPx: pxSpec.bucketHeightPx,
    widthM,
    heightM,
    cornerRadiusPx: 24,
    ops,
    hitTargets,
  };
}

/**
 * Interactive OpenXR Widgets & Custom Layouts manager window.
 */
export function buildWidgetsMenuSurfaceModel(params: {
  windows: readonly SpatialWindow[];
  presets: readonly SpatialLayoutPreset[];
  activePresetId: string;
  focusedWindowId: string | null;
}): WindowSurfaceModel {
  const widthM = 0.96;
  const heightM = 0.78;
  const pxSpec = computeWindowPixelSpec({
    widthM,
    heightM,
    widgetCount: 2,
    hasHighDensityContent: true,
    totalVisibleWindows: 3,
  });
  const w = pxSpec.widthPx;
  const h = pxSpec.heightPx;
  const ops: Record<string, unknown>[] = [];
  const hitTargets: WindowSurfaceHitTarget[] = [];

  ops.push({
    op: 'roundRect',
    x: 0,
    y: 0,
    width: w,
    height: h,
    radius: 22,
    color: I2_PALETTE.backdrop,
  });
  ops.push({
    op: 'strokeRect',
    x: 2,
    y: 2,
    width: w - 4,
    height: h - 4,
    radius: 20,
    strokeWidth: 2,
    color: I2_PALETTE.mint,
  });

  ops.push({
    op: 'text',
    text: 'Widgets & Layouts',
    x: 24,
    y: 18,
    size: 22,
    color: '#ffffff',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: 320,
  });

  drawPillButton(ops, hitTargets, {
    id: 'wmenu-save-custom',
    x: w - 246,
    y: 14,
    width: 176,
    height: 36,
    radius: 10,
    bg: I2_PALETTE.teal,
    text: '+ Save Custom Layout',
    textColor: I2_PALETTE.mintDark,
    font: FONT_DISPLAY_BOLD,
    fontSize: 13,
    widgetId: '__window__',
    actionId: 'save-custom-layout',
  });
  drawPillButton(ops, hitTargets, {
    id: 'wmenu-close',
    x: w - 58,
    y: 14,
    width: 38,
    height: 36,
    radius: 10,
    bg: '#2c1522',
    border: I2_PALETTE.rose,
    text: '×',
    textColor: '#ffe4e6',
    font: FONT_DISPLAY_BOLD,
    fontSize: 16,
    widgetId: '__window__',
    actionId: 'close-widgets-menu',
  });

  // Left: Layouts section (Builtins + Custom Saved)
  ops.push({
    op: 'text',
    text: 'SAVED & BUILT-IN LAYOUTS',
    x: 24,
    y: 68,
    size: 12,
    color: '#64748b',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: 360,
  });
  let ly = 94;
  for (const preset of params.presets.slice(0, 6)) {
    const active = preset.presetId === params.activePresetId;
    drawPillButton(ops, hitTargets, {
      id: `preset:${preset.presetId}`,
      x: 24,
      y: ly,
      width: 320,
      height: 44,
      radius: 10,
      bg: active ? '#112825' : I2_PALETTE.card,
      border: active ? I2_PALETTE.teal : '#212838',
      text: `${preset.isBuiltin ? '' : '★ '}${preset.name}`,
      textColor: active ? I2_PALETTE.teal : '#e2e8f0',
      font: FONT_DISPLAY_MEDIUM,
      fontSize: 14,
      align: 'left',
      paddingLeft: 14,
      widgetId: '__window__',
      actionId: `switch-preset:${preset.presetId}`,
    });
    ly += 52;
  }

  // Right: Widgets list with Solo or Group into Focused Window
  const rx = 370;
  const rw = w - rx - 24;
  ops.push({
    op: 'text',
    text: 'PLACE SOLO OR GROUP IN FOCUSED WINDOW',
    x: rx,
    y: 68,
    size: 12,
    color: '#64748b',
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_MEDIUM,
    maxWidth: rw,
  });

  let wy = 94;
  const catalogItems = WIDGET_CATALOG.filter((c) => c.id !== 'infie3d').slice(0, 9);
  for (const item of catalogItems) {
    if (wy + 46 > h - 20) break;
    ops.push({
      op: 'roundRect',
      x: rx,
      y: wy,
      width: rw,
      height: 42,
      radius: 10,
      color: I2_PALETTE.card,
    });
    ops.push({
      op: 'text',
      text: item.label,
      x: rx + 12,
      y: wy + 12,
      size: 14,
      color: '#f8fafc',
      align: 'left',
      bold: true,
      font: FONT_DISPLAY_MEDIUM,
      maxWidth: rw - 178,
    });

    drawPillButton(ops, hitTargets, {
      id: `wadd-solo:${item.id}`,
      x: rx + rw - 162,
      y: wy + 5,
      width: 68,
      height: 32,
      radius: 8,
      bg: '#1b2636',
      border: '#334155',
      text: 'Solo',
      textColor: '#cbd5e1',
      font: FONT_DISPLAY_MEDIUM,
      fontSize: 12,
      widgetId: item.id,
      actionId: `add-solo:${item.id}`,
    });
    drawPillButton(ops, hitTargets, {
      id: `wadd-group:${item.id}`,
      x: rx + rw - 86,
      y: wy + 5,
      width: 78,
      height: 32,
      radius: 8,
      bg: '#112825',
      border: I2_PALETTE.teal,
      text: '+ Group',
      textColor: I2_PALETTE.teal,
      font: FONT_DISPLAY_BOLD,
      fontSize: 12,
      widgetId: item.id,
      actionId: `add-group:${item.id}`,
    });
    wy += 48;
  }

  return {
    windowId: 'win-widgets-menu',
    widthPx: w,
    heightPx: h,
    bucketWidthPx: pxSpec.bucketWidthPx,
    bucketHeightPx: pxSpec.bucketHeightPx,
    widthM,
    heightM,
    cornerRadiusPx: 22,
    ops,
    hitTargets,
  };
}

/**
 * Concise In-VR tutorial card rendered sharp in OpenXR (replaces 2D phone TutorialOverlay on Quest).
 */
export function buildTutorialWindowSurfaceModel(params: {
  title: string;
  body: string;
  stepIndex: number;
  totalSteps: number;
}): WindowSurfaceModel {
  const widthM = 0.72;
  const heightM = 0.28;
  const pxSpec = computeWindowPixelSpec({
    widthM,
    heightM,
    widgetCount: 1,
    hasHighDensityContent: false,
    totalVisibleWindows: 3,
  });
  const w = pxSpec.widthPx;
  const h = pxSpec.heightPx;
  const ops: Record<string, unknown>[] = [];
  const hitTargets: WindowSurfaceHitTarget[] = [];

  ops.push({ op: 'roundRect', x: 0, y: 0, width: w, height: h, radius: 18, color: '#0c1624' });
  ops.push({
    op: 'strokeRect',
    x: 2,
    y: 2,
    width: w - 4,
    height: h - 4,
    radius: 16,
    strokeWidth: 2,
    color: I2_PALETTE.teal,
  });

  ops.push({
    op: 'text',
    text: `i² Guide (${params.stepIndex + 1}/${params.totalSteps}) · ${params.title}`,
    x: 20,
    y: 18,
    size: 17,
    color: I2_PALETTE.mint,
    align: 'left',
    bold: true,
    font: FONT_DISPLAY_BOLD,
    maxWidth: w - 40,
  });

  const bodyLines = wrapLines(params.body, 56, 3);
  drawTextLines(ops, bodyLines, 20, 52, 22, 14, '#e2e8f0', FONT_BODY_REGULAR, w - 40);

  drawPillButton(ops, hitTargets, {
    id: 'tut-skip',
    x: 20,
    y: h - 52,
    width: 110,
    height: 36,
    radius: 10,
    bg: '#1c2432',
    border: '#334155',
    text: 'Skip Guide',
    textColor: '#cbd5e1',
    font: FONT_DISPLAY_MEDIUM,
    fontSize: 13,
    widgetId: '__window__',
    actionId: 'tutorial-skip',
  });
  drawPillButton(ops, hitTargets, {
    id: 'tut-next',
    x: w - 146,
    y: h - 52,
    width: 126,
    height: 36,
    radius: 10,
    bg: I2_PALETTE.teal,
    text: params.stepIndex + 1 >= params.totalSteps ? 'Done' : 'Next Tip',
    textColor: I2_PALETTE.mintDark,
    font: FONT_DISPLAY_BOLD,
    fontSize: 14,
    widgetId: '__window__',
    actionId: 'tutorial-next',
  });

  return {
    windowId: 'win-vr-tutorial',
    widthPx: w,
    heightPx: h,
    bucketWidthPx: pxSpec.bucketWidthPx,
    bucketHeightPx: pxSpec.bucketHeightPx,
    widthM,
    heightM,
    cornerRadiusPx: 18,
    ops,
    hitTargets,
  };
}
