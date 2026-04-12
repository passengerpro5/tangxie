function formatMetric(metric) {
  if (metric.id === "closure" || metric.label === "收尾力") {
    return metric.value.trim();
  }

  return `${metric.label} ${metric.value}`.trim();
}

function normalizeText(value, fallback) {
  const text = value.trim();
  return text.length > 0 ? text : fallback;
}

export function createDailyRecapScorecardModel(input) {
  const title = normalizeText(input.title, "今日成绩单");
  const metrics = input.metrics.slice();
  const summary = normalizeText(input.summary, title);
  const tagline = metrics.length > 0 ? metrics.map(formatMetric).join(" · ") : summary;
  const firstMetric = metrics[0];
  const shareTitle = firstMetric ? `${title}｜${formatMetric(firstMetric)}` : title;

  return {
    title,
    tagline,
    metrics,
    summary,
    shareTitle,
    shareSubtitle: summary,
  };
}
