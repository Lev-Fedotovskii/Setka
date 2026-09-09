export function rememberCorrection(state,fingerprint){
  const series=state.schedule?.series.filter(s=>s.source.fingerprint===fingerprint)||[];
  state.correctionHistory??=[];
  state.correctionHistory.push({fingerprint,series:structuredClone(series),override:structuredClone(state.overrides?.[fingerprint]||null)});
}
export function undoCorrection(state,fingerprint){
  const history=state.correctionHistory||[],index=history.findLastIndex(h=>h.fingerprint===fingerprint);
  if(index<0){
    const current=state.schedule.series.filter(s=>s.source.fingerprint===fingerprint),baseline=current[0]?.sourceBaseline;
    if(!baseline)throw Error('Для уточнений из 0.3.x сначала повторно откройте исходную книгу: её исходная запись не была сохранена в старой версии.');
    state.schedule.series=state.schedule.series.filter(s=>s.source.fingerprint!==fingerprint).concat(structuredClone(baseline));delete state.overrides[fingerprint];return;
  }
  const entry=history[index],current=state.schedule.series.filter(s=>s.source.fingerprint===fingerprint);
  if(current.some(s=>entry.series.length&&!entry.series.some(old=>old.source.rawText===s.source.rawText&&old.source.workbook===s.source.workbook)))throw Error('Источник уже изменился. Проверьте новую запись перед исправлением.');
  state.schedule.series=state.schedule.series.filter(s=>s.source.fingerprint!==fingerprint).concat(structuredClone(entry.series));
  if(entry.override)state.overrides[fingerprint]=entry.override;else delete state.overrides[fingerprint];
  history.splice(index,1);
}
