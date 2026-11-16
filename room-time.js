export function roomPhase(room, now) {
  const start = Number(room.started_at);
  const focus = Number(room.focus_minutes) * 60;
  const rest = Number(room.break_minutes) * 60;
  const rounds = Number(room.planned_cycles) || 4;
  const end = room.ends_at == null ? null : Number(room.ends_at);
  if (now < start) return {phase:'waiting', remaining:Math.ceil((start-now)/1000), cycle:0};
  if (end !== null && now >= end) return {phase:'complete', remaining:0, cycle:rounds};
  const elapsed = Math.max(0,(now-start)/1000), offset = elapsed%(focus+rest);
  return {phase:offset<focus?'focus':'break', remaining:Math.ceil((offset<focus?focus:focus+rest)-offset), cycle:Math.floor(elapsed/(focus+rest))+1};
}
