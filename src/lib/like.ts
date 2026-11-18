// Makes typed text safe inside an ILIKE pattern (% and _ would act as wildcards).
export const escLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
