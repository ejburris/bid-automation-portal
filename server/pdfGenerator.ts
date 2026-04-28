/**
 * PDF Generator for Clean World Maintenance bid proposals
 * Generates PDFs matching the Info Sheet format with automatic cost calculations
 */

import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { COMPANY_IDENTITY } from '../shared/companyIdentity';

export interface ProposalData {
  projectName: string;
  date: Date;
  company: string;
  street: string;
  contactName: string;
  contactPhone: string;
  cityState: string;
  officePhone: string;
  cellPhone: string;
  notes: string;
  finalCleaningCost: number;
  travelCost?: number;
  aerialLiftCost?: number;
  totalCost: number;
  wageType: 'private' | 'prevailing';
  costBreakdown: {
    laborCost: number;
    travelCost: number;
    aerialLiftCost: number;
    otherCosts: number;
  };
}

export function generateProposalPDF(data: ProposalData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'letter',
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header with company branding
    doc.fontSize(20).font('Helvetica-Bold').text(COMPANY_IDENTITY.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`${COMPANY_IDENTITY.phone} - ${COMPANY_IDENTITY.tollFree} - ${COMPANY_IDENTITY.email}`, { align: 'center' });
    doc.fontSize(8).text(COMPANY_IDENTITY.address, { align: 'center' });
    doc.fontSize(8).text(`WA Contractor License: ${COMPANY_IDENTITY.waContractorLicense}`, { align: 'center' });
    doc.fontSize(8).text(`OMWBE Certification Number: ${COMPANY_IDENTITY.omwbeCertificationNumber}`, { align: 'center' });

    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    doc.moveDown(15);

    // Project Information Section
    doc.fontSize(11).font('Helvetica-Bold').text('Project Information', { underline: true });
    doc.moveDown(8);

    const leftCol = 50;
    const rightCol = 300;
    const lineHeight = 18;
    let currentY = doc.y;

    doc.fontSize(10).font('Helvetica-Bold').text('Project:', leftCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.projectName, leftCol + 80, currentY);
    doc.fontSize(10).font('Helvetica-Bold').text('Date:', rightCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.date.toLocaleDateString(), rightCol + 50, currentY);

    currentY += lineHeight;
    doc.fontSize(10).font('Helvetica-Bold').text('Company:', leftCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.company, leftCol + 80, currentY);
    doc.fontSize(10).font('Helvetica-Bold').text('Office Phone:', rightCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.officePhone, rightCol + 80, currentY);

    currentY += lineHeight;
    doc.fontSize(10).font('Helvetica-Bold').text('Street:', leftCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.street, leftCol + 80, currentY);
    doc.fontSize(10).font('Helvetica-Bold').text('Contact:', rightCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.contactName, rightCol + 50, currentY);

    currentY += lineHeight;
    doc.fontSize(10).font('Helvetica-Bold').text('City & State:', leftCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.cityState, leftCol + 80, currentY);
    doc.fontSize(10).font('Helvetica-Bold').text('Cell Phone:', rightCol, currentY);
    doc.fontSize(10).font('Helvetica').text(data.cellPhone, rightCol + 50, currentY);

    doc.moveDown(25);

    // Notes Section
    doc.fontSize(11).font('Helvetica-Bold').text('Notes:', { underline: true });
    doc.moveDown(8);
    doc.fontSize(10).font('Helvetica').text(data.notes, { align: 'left', width: 500 });
    doc.moveDown(15);

    // Pricing Section
    doc.fontSize(11).font('Helvetica-Bold').text('Final Cleaning Cost: $' + data.finalCleaningCost.toFixed(2), { underline: true });
    doc.moveDown(8);

    // Cost breakdown table
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 350;
    const rowHeight = 20;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Cost Breakdown', col1, tableTop);
    doc.text('Amount', col2, tableTop);

    let tableY = tableTop + rowHeight;
    doc.fontSize(10).font('Helvetica');

    // Labor Cost
    doc.text('Labor Cost', col1, tableY);
    doc.text('$' + data.costBreakdown.laborCost.toFixed(2), col2, tableY);
    tableY += rowHeight;

    // Travel Cost
    if (data.costBreakdown.travelCost > 0) {
      doc.text('Travel Cost', col1, tableY);
      doc.text('$' + data.costBreakdown.travelCost.toFixed(2), col2, tableY);
      tableY += rowHeight;
    }

    // Aerial Lift Cost
    if (data.costBreakdown.aerialLiftCost > 0) {
      doc.text('Aerial Lift Cost', col1, tableY);
      doc.text('$' + data.costBreakdown.aerialLiftCost.toFixed(2), col2, tableY);
      tableY += rowHeight;
    }

    // Other Costs
    if (data.costBreakdown.otherCosts > 0) {
      doc.text('Other Costs', col1, tableY);
      doc.text('$' + data.costBreakdown.otherCosts.toFixed(2), col2, tableY);
      tableY += rowHeight;
    }

    // Total
    doc.moveTo(col1, tableY - 5).lineTo(col2 + 100, tableY - 5).stroke();
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL', col1, tableY);
    doc.text('$' + data.totalCost.toFixed(2), col2, tableY);

    doc.moveDown(30);

    // Wage Type Note
    doc.fontSize(9).font('Helvetica-Italic');
    doc.text(
      `This proposal is based on ${data.wageType === 'prevailing' ? 'prevailing wage' : 'private wage'} rates.`,
      { align: 'left', width: 500 },
    );

    doc.moveDown(15);

    // Footer
    doc.fontSize(9).font('Helvetica');
    doc.text('Final Cleaning pricing is based on one standard post-construction final clean prior to Substantial Completion.', {
      align: 'left',
      width: 500,
    });
    doc.text(
      'Any additional cleaning required due to inspections, punch work, phased turnover, trade access, or post-clean re-soiling per drawings, specifications, or addenda will be treated as additional service.',
      { align: 'left', width: 500 },
    );

    doc.moveDown(20);
    doc.fontSize(12).font('Helvetica-Bold').text('Estimating Dept.', { align: 'left' });

    doc.end();
  });
}

/**
 * Generate PDF as stream for direct response
 */
export function generateProposalPDFStream(data: ProposalData): any {
  const doc = new PDFDocument({
    size: 'letter',
    margin: 50,
  });

  // Header with company branding
  doc.fontSize(20).font('Helvetica-Bold').text(COMPANY_IDENTITY.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`${COMPANY_IDENTITY.phone} - ${COMPANY_IDENTITY.tollFree} - ${COMPANY_IDENTITY.email}`, { align: 'center' });
  doc.fontSize(8).text(COMPANY_IDENTITY.address, { align: 'center' });
  doc.fontSize(8).text(`WA Contractor License: ${COMPANY_IDENTITY.waContractorLicense}`, { align: 'center' });
  doc.fontSize(8).text(`OMWBE Certification Number: ${COMPANY_IDENTITY.omwbeCertificationNumber}`, { align: 'center' });

  doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
  doc.moveDown(15);

  // Project Information Section
  doc.fontSize(11).font('Helvetica-Bold').text('Project Information', { underline: true });
  doc.moveDown(8);

  const leftCol = 50;
  const rightCol = 300;
  const lineHeight = 18;
  let currentY = doc.y;

  doc.fontSize(10).font('Helvetica-Bold').text('Project:', leftCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.projectName, leftCol + 80, currentY);
  doc.fontSize(10).font('Helvetica-Bold').text('Date:', rightCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.date.toLocaleDateString(), rightCol + 50, currentY);

  currentY += lineHeight;
  doc.fontSize(10).font('Helvetica-Bold').text('Company:', leftCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.company, leftCol + 80, currentY);
  doc.fontSize(10).font('Helvetica-Bold').text('Office Phone:', rightCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.officePhone, rightCol + 80, currentY);

  currentY += lineHeight;
  doc.fontSize(10).font('Helvetica-Bold').text('Street:', leftCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.street, leftCol + 80, currentY);
  doc.fontSize(10).font('Helvetica-Bold').text('Contact:', rightCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.contactName, rightCol + 50, currentY);

  currentY += lineHeight;
  doc.fontSize(10).font('Helvetica-Bold').text('City & State:', leftCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.cityState, leftCol + 80, currentY);
  doc.fontSize(10).font('Helvetica-Bold').text('Cell Phone:', rightCol, currentY);
  doc.fontSize(10).font('Helvetica').text(data.cellPhone, rightCol + 50, currentY);

  doc.moveDown(25);

  // Notes Section
  doc.fontSize(11).font('Helvetica-Bold').text('Notes:', { underline: true });
  doc.moveDown(8);
  doc.fontSize(10).font('Helvetica').text(data.notes, { align: 'left', width: 500 });
  doc.moveDown(15);

  // Pricing Section
  doc.fontSize(11).font('Helvetica-Bold').text('Final Cleaning Cost: $' + data.finalCleaningCost.toFixed(2), { underline: true });
  doc.moveDown(8);

  // Cost breakdown table
  const tableTop = doc.y;
  const col1 = 50;
  const col2 = 350;
  const rowHeight = 20;

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Cost Breakdown', col1, tableTop);
  doc.text('Amount', col2, tableTop);

  let tableY = tableTop + rowHeight;
  doc.fontSize(10).font('Helvetica');

  // Labor Cost
  doc.text('Labor Cost', col1, tableY);
  doc.text('$' + data.costBreakdown.laborCost.toFixed(2), col2, tableY);
  tableY += rowHeight;

  // Travel Cost
  if (data.costBreakdown.travelCost > 0) {
    doc.text('Travel Cost', col1, tableY);
    doc.text('$' + data.costBreakdown.travelCost.toFixed(2), col2, tableY);
    tableY += rowHeight;
  }

  // Aerial Lift Cost
  if (data.costBreakdown.aerialLiftCost > 0) {
    doc.text('Aerial Lift Cost', col1, tableY);
    doc.text('$' + data.costBreakdown.aerialLiftCost.toFixed(2), col2, tableY);
    tableY += rowHeight;
  }

  // Other Costs
  if (data.costBreakdown.otherCosts > 0) {
    doc.text('Other Costs', col1, tableY);
    doc.text('$' + data.costBreakdown.otherCosts.toFixed(2), col2, tableY);
    tableY += rowHeight;
  }

  // Total
  doc.moveTo(col1, tableY - 5).lineTo(col2 + 100, tableY - 5).stroke();
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('TOTAL', col1, tableY);
  doc.text('$' + data.totalCost.toFixed(2), col2, tableY);

  doc.moveDown(30);

  // Wage Type Note
  doc.fontSize(9).font('Helvetica-Italic');
  doc.text(
    `This proposal is based on ${data.wageType === 'prevailing' ? 'prevailing wage' : 'private wage'} rates.`,
    { align: 'left', width: 500 },
  );

  doc.moveDown(15);

  // Footer
  doc.fontSize(9).font('Helvetica');
  doc.text('Final Cleaning pricing is based on one standard post-construction final clean prior to Substantial Completion.', {
    align: 'left',
    width: 500,
  });
  doc.text(
    'Any additional cleaning required due to inspections, punch work, phased turnover, trade access, or post-clean re-soiling per drawings, specifications, or addenda will be treated as additional service.',
    { align: 'left', width: 500 },
  );

  doc.moveDown(20);
  doc.fontSize(12).font('Helvetica-Bold').text('Estimating Dept.', { align: 'left' });

  doc.end();

  return doc;
}
