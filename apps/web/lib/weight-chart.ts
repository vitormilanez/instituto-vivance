export type WeightPoint = { value: number; date: string };

export function weightDateTime(date: string): number | null {
  const day = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const time = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day ? time : null;
}
export function validWeightPoint(point: WeightPoint): boolean {
  return Number.isFinite(point.value) && point.value > 0 && weightDateTime(point.date) !== null;
}
export function weightChartModel(input: WeightPoint[]) {
  // Same-day records remain distinct source entries; do not invent days.
  const points = input.filter(validWeightPoint).slice().sort((a, b) => weightDateTime(a.date)! - weightDateTime(b.date)!);
  if (!points.length) return null;
  const firstTime = weightDateTime(points[0].date)!;
  const lastTime = weightDateTime(points.at(-1)!.date)!;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(0.5, (max - min) * 0.15);
  const low = min - padding;
  const high = max + padding;
  return { points, low, high, ticks: [high, (high + low) / 2, low], coordinates: points.map((point) => ({
    x: lastTime === firstTime ? 0.5 : (weightDateTime(point.date)! - firstTime) / (lastTime - firstTime),
    y: (high - point.value) / (high - low),
  })) };
}
export function weightVariation(current: WeightPoint, baseline: WeightPoint | null | undefined) {
  if (!baseline || !validWeightPoint(current) || !validWeightPoint(baseline) || weightDateTime(baseline.date)! > weightDateTime(current.date)!) return null;
  const kilograms = current.value - baseline.value;
  return { kilograms, percent: (kilograms / baseline.value) * 100 };
}
