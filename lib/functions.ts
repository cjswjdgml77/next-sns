export function timeChangeToHoursAndMinutes(date: Date) {
  if (!date) return;

  date = new Date(date);
  let m = date.getMinutes();
  let h = date.getHours();
  let r: string;
  if (h < 10) r = `0${h}`;
  else r = `${h}`;
  if (m < 10) r = `${r}:0${m}`;
  else r = `${r}:${m}`;
  return r;
}
