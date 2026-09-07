// Inclusion is a user choice, independent of parser confidence and old exclusions.
export function reviewRecords(candidate, group) {
  return candidate.series.filter(s=>s.cohorts.some(c=>c.groupId===group));
}
export function unresolvedRecords(candidate) {
  return (candidate.importMeta.unresolved||[]).filter(u=>!candidate.series.some(s=>s.source.fingerprint===`unresolved:${u.sheet}:${u.range}`));
}
export function validateSelection(candidate, selected, unresolvedSelected) {
  if(unresolvedSelected.length||candidate.series.some(s=>selected.has(s.id)&&s.blocked))
    throw Error('Есть выбранные записи без достоверного времени или повторения. Уточните их либо явно снимите отметку включения.');
}
