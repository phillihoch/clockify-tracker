export function formatDuration(durationStr: string): string {
  if (!durationStr) {
    return "Timer running...";
  }

  const durationRegex = /PT(\d+H)?(\d+M)?/;
  const matches = durationRegex.exec(durationStr);

  if (!matches) {
    return "Invalid duration";
  }

  const hours = matches[1] ? parseInt(matches[1].slice(0, -1), 10) : 0;
  const minutes = matches[2] ? parseInt(matches[2].slice(0, -1), 10) : 0;

  const formattedHours = hours > 0 ? `${hours}h` : "";
  const formattedMinutes = minutes > 0 ? `${minutes}m` : "";

  return `${formattedHours} ${formattedMinutes}`.trim();
}

export function formatDurationInMinutes(duration: number): string {
  if (!duration) {
    return "Timer running...";
  }

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  const formattedHours = hours > 0 ? `${hours}h` : "";
  const formattedMinutes = minutes > 0 ? `${minutes}m` : "";

  return `${formattedHours} ${formattedMinutes}`.trim();
}
