const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const naturalCompare = (a: string, b: string): number => collator.compare(a, b);
