// Confirmed human evidence for one source entry, never a geometry/parity rule.
export function timingClarification(series,term){
  if(term?.id!=='mipt-2026-autumn'||series.source?.workbook!=='БВО 1 КУРС ОСЕНЬ 2026-2027 г..xlsx'||series.source.sheet!=='Лист1'||series.source.ranges?.length!==1||series.source.ranges[0]!=='CK55:CK57'||series.source.rawText!=='Введение в программирование, уч.асс. Гавва А.С.-706 КПМ'||series.cohorts?.length!==1||series.cohorts[0].groupId!=='Б06-603'||series.recurrence?.weekdays?.length!==1||series.recurrence.weekdays[0]!==4||series.time?.startsAt!=='15:30'||series.time.endsAt!=='18:30')return null;
  return {id:'b06-603-programming-thursday-2026',startsAt:'16:15',gridStartsAt:'15:30',receivedOn:'2026-09-10',evidence:'Подтверждено студентом через владельца проекта: программирование в четверг у Б06-603 начинается с середины пары, в 16:15. Конец по исходной книге — 18:30.'};
}
export function pendingTimingClarification(schedule){
  return schedule?.series?.some(s=>{const c=timingClarification(s,schedule.term);return c&&!schedule.importMeta?.clarificationsApplied?.includes(c.id);})||false;
}
