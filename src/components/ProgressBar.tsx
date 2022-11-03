/** A progress bar at the top of the screen */
export function ProgressBar({ percent }: { percent: number }) {
  // Clamp percent
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;

  return (
    <div className="bar-container">
      <div className="bar" style={{ width: `${percent * 100}%` }} />
    </div>
  );
}
