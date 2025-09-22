export type MessageFormatter = (
  value: any,
  locale: string | string[],
  args?: any[],
) => string;
