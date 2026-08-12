function parseHexColor(color: string): [number, number, number] | null {
  const normalized = color.trim().replace(/^#/, '');

  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    return normalized.split('').map((value) => parseInt(`${value}${value}`, 16)) as [
      number,
      number,
      number,
    ];
  }

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }

  return null;
}

function toLinearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function getReadableTextColor(
  backgroundColor: string,
  darkText = '#111827',
  lightText = '#ffffff',
): string {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) {
    return lightText;
  }

  const [red, green, blue] = rgb.map(toLinearChannel);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > 0.45 ? darkText : lightText;
}
