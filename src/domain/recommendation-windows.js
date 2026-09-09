import {weekday,validDate} from './dates.js';
import {freeWindows} from './planner.js';

// Recommendations are a preference layer. These intervals never become occupied.
export function recommendationWindows(window,date,settings){
  const exclusions=(settings.recommendationExclusions||[]).filter(e=>e.date===date||e.weekday===weekday(date));
  return freeWindows(exclusions,window.start,window.end,settings.minimumWindow??20);
}
export function validateRecommendationSettings(settings){
  if(settings.minimumWindow!==undefined&&(!Number.isInteger(settings.minimumWindow)||settings.minimumWindow<5||settings.minimumWindow>480))throw Error('Минимальное окно: от 5 до 480 минут.');
  if(settings.recommendationExclusions!==undefined&&(!Array.isArray(settings.recommendationExclusions)||settings.recommendationExclusions.some(e=>typeof e.id!=='string'||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<0||e.end>1440||e.start>=e.end||!(validDate(e.date)||Number.isInteger(e.weekday)&&e.weekday>=1&&e.weekday<=7))))throw Error('Некорректное исключение рекомендаций.');
}
