import { COMPANY_IDENTITY } from '@shared/companyIdentity';
import { DEFAULT_PROPOSAL_SCOPE_LANGUAGE } from '@shared/defaultProposalScope';
import { formatUsd, type LockedPricingSnapshot } from '@/lib/pricingSnapshot';
import { formatAddendumDate, parseProposalAddenda } from '@/lib/addenda';

type ProposalBid = {
  projectName?: string | null;
  projectAddress?: string | null;
  clientCompany?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  addendaAcknowledged?: string | null;
  proposalScopeNotes?: string | null;
  createdAt?: Date | string | null;
  wageType?: 'private' | 'prevailing' | string | null;
};

type ProposalPdfOptions = {
  bid: ProposalBid;
  snapshot: LockedPricingSnapshot;
  displayMode: 'standard' | 'detailed';
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PROTECTION_LANGUAGE =
  'Final Cleaning pricing is based on a standard post-construction clean. Any re-cleaning required due to ongoing work, material changes, or post-clean activities will be treated as additional service.';

type TextOptions = {
  size?: number;
  bold?: boolean;
  color?: string;
  width?: number;
  lineGap?: number;
  align?: 'left' | 'right';
};

class SimplePdf {
  private pages: string[][] = [[]];
  y = MARGIN;

  private get commands() {
    return this.pages[this.pages.length - 1];
  }

  addPage() {
    this.pages.push([]);
    this.y = MARGIN;
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.addPage();
    }
  }

  text(value: string, x = MARGIN, options: TextOptions = {}) {
    const size = options.size ?? 10;
    const lineGap = options.lineGap ?? 3;
    const width = options.width ?? CONTENT_WIDTH;
    const lines = wrapText(value, width, size);

    for (const line of lines) {
      this.ensureSpace(size + lineGap);
      const lineWidth = approximateTextWidth(line, size);
      const drawX = options.align === 'right' ? x + width - lineWidth : x;
      const pdfY = PAGE_HEIGHT - this.y - size;
      this.commands.push(
        `BT /${options.bold ? 'F2' : 'F1'} ${size} Tf ${rgb(options.color ?? '#111827')} ${drawX.toFixed(2)} ${pdfY.toFixed(2)} Td (${escapePdfText(line)}) Tj ET`,
      );
      this.y += size + lineGap;
    }
  }

  textAt(value: string, x: number, y: number, options: TextOptions = {}) {
    const size = options.size ?? 10;
    const width = options.width ?? CONTENT_WIDTH;
    const lineWidth = approximateTextWidth(value, size);
    const drawX = options.align === 'right' ? x + width - lineWidth : x;
    const pdfY = PAGE_HEIGHT - y - size;
    this.commands.push(
      `BT /${options.bold ? 'F2' : 'F1'} ${size} Tf ${rgb(options.color ?? '#111827')} ${drawX.toFixed(2)} ${pdfY.toFixed(2)} Td (${escapePdfText(value)}) Tj ET`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color = '#D1D5DB') {
    this.commands.push(`${rgbStroke(color)} 1 w ${x1} ${PAGE_HEIGHT - y1} m ${x2} ${PAGE_HEIGHT - y2} l S`);
  }

  rect(x: number, y: number, width: number, height: number, fill = '#F3F4F6', stroke = '#D1D5DB') {
    this.commands.push(
      `${rgb(fill)} ${rgbStroke(stroke)} ${x} ${PAGE_HEIGHT - y - height} ${width} ${height} re B`,
    );
  }

  moveDown(amount = 12) {
    this.y += amount;
  }

  output() {
    return buildPdf(this.pages);
  }
}

function normalizeText(value: string) {
  return value
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
}

function escapePdfText(value: string) {
  return normalizeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function approximateTextWidth(value: string, size: number) {
  return normalizeText(value).length * size * 0.52;
}

function wrapText(value: string, width: number, size: number) {
  const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
  const output: string[] = [];
  for (const paragraph of normalizeText(value).split(/\r?\n/)) {
    if (!paragraph.trim()) {
      output.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        output.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function rgb(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b} rg`;
}

function rgbStroke(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return `${r} ${g} ${b} RG`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ].map((part) => Number(part.toFixed(3)));
}

function buildPdf(pages: string[][]) {
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];

  const pageRefs: string[] = [];
  for (const commands of pages) {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = objects.length + 2;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    const stream = commands.join('\n');
    objects.push(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;

  const encoder = new TextEncoder();
  const parts: string[] = ['%PDF-1.4\n'];
  const offsets = [0];
  let length = encoder.encode(parts[0]).length;

  objects.forEach((object, index) => {
    offsets.push(length);
    const serialized = `${index + 1} 0 obj\n${object}\nendobj\n`;
    parts.push(serialized);
    length += encoder.encode(serialized).length;
  });

  const xrefOffset = length;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
  ].join('\n');

  return new Blob([...parts, xref], { type: 'application/pdf' });
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function formatProposalDate(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString();
  return date.toLocaleDateString();
}

function filenameDate() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFilenamePart(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Untitled_Project';
}

export function buildProposalPdfFilename(projectName?: string | null) {
  return `CWM_Proposal_${sanitizeFilenamePart(projectName || 'Untitled_Project')}_${filenameDate()}.pdf`;
}

function sectionTitle(pdf: SimplePdf, title: string) {
  pdf.ensureSpace(42);
  pdf.moveDown(8);
  pdf.text(title, MARGIN, { size: 12, bold: true });
  pdf.line(MARGIN, pdf.y + 3, PAGE_WIDTH - MARGIN, pdf.y + 3);
  pdf.moveDown(12);
}

function infoRow(pdf: SimplePdf, leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) {
  pdf.ensureSpace(56);
  const top = pdf.y;
  pdf.textAt(leftLabel.toUpperCase(), MARGIN, top, { size: 8, bold: true, color: '#6B7280' });
  pdf.textAt(leftValue || 'N/A', MARGIN, top + 16, { size: 10, width: 230 });
  pdf.textAt(rightLabel.toUpperCase(), 330, top, { size: 8, bold: true, color: '#6B7280' });
  pdf.textAt(rightValue || 'N/A', 330, top + 16, { size: 10, width: 220 });
  pdf.y = top + 58;
}

function pricingLine(pdf: SimplePdf, label: string, value: number, detail?: string) {
  pdf.ensureSpace(34);
  const top = pdf.y;
  pdf.textAt(label, MARGIN, top, { size: 10, bold: true });
  if (detail) {
    pdf.textAt(detail, MARGIN, top + 13, { size: 8, color: '#6B7280' });
  }
  pdf.textAt(formatUsd(value), 430, top, { size: 10, bold: true, width: 110, align: 'right' });
  pdf.line(MARGIN, top + 29, PAGE_WIDTH - MARGIN, top + 29, '#E5E7EB');
  pdf.y = top + 36;
}

function totalBox(pdf: SimplePdf, snapshot: LockedPricingSnapshot) {
  pdf.ensureSpace(82);
  const top = pdf.y;
  pdf.rect(MARGIN, top, CONTENT_WIDTH, 66);
  pdf.textAt('Final Cleaning Cost', MARGIN + 18, top + 16, { size: 13, bold: true });
  pdf.textAt('Standard post-construction final clean', MARGIN + 18, top + 36, { size: 9, color: '#4B5563' });
  pdf.textAt(formatUsd(snapshot.totals.total), MARGIN + 330, top + 19, {
    size: 22,
    bold: true,
    width: CONTENT_WIDTH - 348,
    align: 'right',
  });
  pdf.y = top + 82;
}

export async function downloadProposalPdf({ bid, snapshot, displayMode }: ProposalPdfOptions) {
  const pdf = new SimplePdf();
  const clientName = bid.clientCompany || bid.contactName || 'Client';
  const proposalDate = formatProposalDate(bid.createdAt);
  const scopeLanguage = bid.proposalScopeNotes ?? DEFAULT_PROPOSAL_SCOPE_LANGUAGE;
  const isDetailed = displayMode === 'detailed';
  const addenda = parseProposalAddenda(bid.addendaAcknowledged);
  const wageLabel = (bid.wageType ?? snapshot.wageType) === 'prevailing' ? 'Prevailing Wage' : 'Private Wage';

  pdf.text('PROPOSAL', MARGIN, { size: 9, bold: true, color: '#6B7280' });
  pdf.text(COMPANY_IDENTITY.name, MARGIN, { size: 22, bold: true });
  pdf.moveDown(4);
  pdf.text(`${COMPANY_IDENTITY.phone} | ${COMPANY_IDENTITY.tollFree}`, MARGIN, { size: 9, color: '#4B5563' });
  pdf.text(COMPANY_IDENTITY.email, MARGIN, { size: 9, color: '#4B5563' });
  pdf.text(COMPANY_IDENTITY.address, MARGIN, { size: 9, color: '#4B5563' });
  pdf.text(`WA Contractor License: ${COMPANY_IDENTITY.waContractorLicense}`, MARGIN, { size: 9, color: '#4B5563' });
  pdf.text(`OMWBE Certification Number: ${COMPANY_IDENTITY.omwbeCertificationNumber}`, MARGIN, {
    size: 9,
    color: '#4B5563',
  });
  pdf.moveDown(12);

  infoRow(pdf, 'Project', bid.projectName || 'Untitled Project', 'Client', clientName);
  infoRow(pdf, 'Project Address', bid.projectAddress || 'No project address provided', 'Date', proposalDate);

  sectionTitle(pdf, 'Wage Type');
  pdf.text(`Wage Type: ${wageLabel}`, MARGIN, { size: 10, bold: true, color: '#111827', lineGap: 4 });

  if (addenda.length > 0) {
    sectionTitle(pdf, 'Addenda Acknowledged');
    for (const addendum of addenda) {
      const date = addendum.date ? ` - ${formatAddendumDate(addendum.date)}` : '';
      pdf.text(`- ${addendum.name}${date}`, MARGIN, { size: 10, color: '#374151', lineGap: 4 });
    }
  }

  sectionTitle(pdf, 'Scope of Work');
  pdf.text(scopeLanguage, MARGIN, { size: 10, color: '#374151', lineGap: 4 });

  sectionTitle(pdf, 'Exclusions / Clarifications');
  pdf.text(PROTECTION_LANGUAGE, MARGIN, { size: 10, color: '#374151', lineGap: 4 });

  sectionTitle(pdf, isDetailed ? 'Pricing Breakdown' : 'Pricing');
  if (isDetailed) {
    pricingLine(pdf, 'Base Cleaning', snapshot.base.crewCost);
    pricingLine(pdf, 'Wax', snapshot.services.waxingCost, `${snapshot.services.waxingSqft.toLocaleString()} sq ft`);
    pricingLine(pdf, 'Carpet', snapshot.services.carpetCost, `${snapshot.services.carpetSqft.toLocaleString()} sq ft`);
    pricingLine(pdf, 'Windows', snapshot.services.windowCost, `${snapshot.services.windowCount.toLocaleString()} windows`);
    pricingLine(pdf, 'Aerial Lift', snapshot.services.aerialLiftCost);
    pricingLine(pdf, 'Pressure Washing', snapshot.services.pressureWashingCost);
    pricingLine(pdf, 'Travel', snapshot.base.travelCost, `${snapshot.base.travelDistance} mi`);
  }
  totalBox(pdf, snapshot);

  const blob = pdf.output();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildProposalPdfFilename(bid.projectName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
