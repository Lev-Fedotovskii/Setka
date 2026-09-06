// This is an observed MIPT palette, not a universal Excel color convention.
export const MIPT_PALETTE = { lecture:'FF99CC', seminar:'CCFFFF', practice:'FFFF99' };
export function classifyKind(raw, style={}, profile=false) {
  const text=raw.normalize('NFC').toLowerCase().replaceAll('ё','е');
  let explicit=/физическ[а-я]* культур|физвоспитан/.test(text)?'sport':
    /лаборатор|(?:^|\W)лаб\./.test(text)?'lab':
    /семинар|\(\s*с\s*\)/.test(text)?'seminar':
    /лекци|\(\s*л\s*\)/.test(text)?'lecture':
    /практикум|практическ[а-я]* занят/.test(text)?'practice':null;
  const color=style.fill?.rgb?.slice(-6).toUpperCase();
  const inferred=profile && style.fill?.pattern==='solid' ? Object.entries(MIPT_PALETTE).find(([,v])=>v===color)?.[0] : null;
  // Explicit text wins, including yellow chemistry with an explicit (с) suffix.
  const kind=explicit||inferred||'other';
  return {kind,evidence:{method:explicit?'text':inferred?'mipt-palette':'unresolved',profile:profile?'mipt-bvo-2026-v1':null,color:color||null},warnings:explicit&&inferred&&explicit!==inferred&&!(explicit==='lab'&&inferred==='practice')&&explicit!=='sport'?['Текст уточняет тип вопреки цвету ячейки.']:[]};
}
export function recognizePalette(sheet) {
  const colors=new Set(sheet.cells.filter(c=>c.style?.fill?.pattern==='solid').map(c=>c.style.fill.rgb?.slice(-6).toUpperCase()));
  return Object.values(MIPT_PALETTE).every(c=>colors.has(c));
}
