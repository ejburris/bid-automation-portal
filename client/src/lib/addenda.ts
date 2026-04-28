export type ProposalAddendum = {
  name: string;
  date?: string;
};

export function parseProposalAddenda(value?: string | null | ProposalAddendum[]): ProposalAddendum[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return (value as Array<string | ProposalAddendum>)
      .map((item) => {
        if (typeof item === 'string') return { name: item.trim() };
        return {
          name: String(item?.name ?? '').trim(),
          date: String(item?.date ?? '').trim() || undefined,
        };
      })
      .filter((item) => item.name);
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') return { name: item.trim() };
          return {
            name: String(item?.name ?? '').trim(),
            date: String(item?.date ?? '').trim() || undefined,
          };
        })
        .filter((item) => item.name);
    }
  } catch {
    return value
      .split(/\r?\n/)
      .map((item) => ({ name: item.trim() }))
      .filter((item) => item.name);
  }
  return [];
}

export function formatAddendumDate(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US');
}
