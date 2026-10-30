import { jsPDF } from 'jspdf';
import { PayrollRecord, Employee } from '../types';

interface PayslipGenerationOptions {
  record: PayrollRecord;
  employee?: Employee;
  companyName?: string;
  autoDownload?: boolean;
}

export function generatePayslipPDF({
  record,
  employee,
  autoDownload = true
}: PayslipGenerationOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Colors based on Official Salary Slip template
  const navyHeaderBlue = [30, 80, 160] as const; // #1E50A0
  const tableBorderColor = [40, 50, 70] as const; // Dark grid line
  const textDark = [20, 25, 35] as const;
  const textMuted = [90, 100, 115] as const;

  let currentY = 14;

  // 1. Company Header Box
  doc.setDrawColor(...tableBorderColor);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...navyHeaderBlue);
  doc.text('MODELA TECHNOLOGIES PVT. LTD.', pageWidth / 2, currentY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text('#W2, 11WS16, 11th Floor, West Block, Mani Casadona, Newtown, Kolkata - 700156', pageWidth / 2, currentY + 12, { align: 'center' });
  doc.text('www.modelatech.com', pageWidth / 2, currentY + 16.5, { align: 'center' });

  // GST Registration No Bar
  currentY += 24;
  doc.rect(margin, currentY, contentWidth, 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('GST Registration No.:', margin + 3, currentY + 4.8);
  doc.setFont('helvetica', 'bold');
  doc.text('19AAVCM0271D1ZB', margin + 42, currentY + 4.8);

  // 2. SALARY SLIP Blue Bar Header
  currentY += 7;
  doc.setFillColor(...navyHeaderBlue);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(...tableBorderColor);
  doc.rect(margin, currentY, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SALARY SLIP', pageWidth / 2, currentY + 5, { align: 'center' });

  // 3. Employee Metadata Table (6 rows x 4 cells)
  currentY += 7;
  const colW1 = 36;
  const colW2 = 56;
  const colW3 = 38;
  const colW4 = contentWidth - (colW1 + colW2 + colW3);
  const rowH = 6;

  const lopDays = record.lopDays || 0;
  const paidDays = Math.max(0, +((30 - lopDays).toFixed(2)));
  const payPeriod = `${record.month.substring(0, 3)}-${String(record.year).substring(2)}`;

  // Default standard identifiers
  const pan = employee?.pan || record.pan || 'ITHPK8827F';
  const uan = employee?.uan || '';
  const bankAcc = employee?.bankAccount || record.bankAccount || '815801500344';
  const paymentDate = record.paymentDate || `1/${record.month === 'September' ? '10' : '11'}/${record.year}`;
  const doj = employee?.joiningDate || '20/07/2026';

  const metaRows: [string, string, string, string][] = [
    ['Employee Name', record.employeeName, 'Employee ID', record.employeeId],
    ['Designation', employee?.designation || 'SR. BIM Engineer', 'Department', employee?.department || 'MEP'],
    ['Pay Period', payPeriod, 'Date of Joining', doj],
    ['PAN', pan, 'UAN', uan],
    ['Bank A/C', bankAcc, 'Payment Date', paymentDate],
    ['Working Days', '30', 'Paid Days', String(paidDays)]
  ];

  metaRows.forEach((row, i) => {
    const y = currentY + i * rowH;
    doc.setDrawColor(...tableBorderColor);
    doc.rect(margin, y, contentWidth, rowH);
    doc.line(margin + colW1, y, margin + colW1, y + rowH);
    doc.line(margin + colW1 + colW2, y, margin + colW1 + colW2, y + rowH);
    doc.line(margin + colW1 + colW2 + colW3, y, margin + colW1 + colW2 + colW3, y + rowH);

    doc.setFontSize(8);
    // Col 1 label
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(row[0], margin + 2.5, y + 4.2);

    // Col 2 val
    doc.setFont('helvetica', 'normal');
    doc.text(row[1], margin + colW1 + 2.5, y + 4.2);

    // Col 3 label
    doc.setFont('helvetica', 'bold');
    doc.text(row[2], margin + colW1 + colW2 + 2.5, y + 4.2);

    // Col 4 val
    doc.setFont('helvetica', 'normal');
    doc.text(row[3], margin + colW1 + colW2 + colW3 + 2.5, y + 4.2);
  });

  currentY += metaRows.length * rowH;

  // 4. Section: EARNINGS & DEDUCTIONS Header
  doc.setFillColor(...navyHeaderBlue);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setDrawColor(...tableBorderColor);
  doc.rect(margin, currentY, contentWidth, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EARNINGS & DEDUCTIONS', margin + 3, currentY + 4.6);

  currentY += 6.5;

  // Subheader: EARNINGS | MONTHLY (Rs.) | DEDUCTIONS | MONTHLY (Rs.)
  const halfW = contentWidth / 2;

  doc.setFillColor(240, 243, 248);
  doc.rect(margin, currentY, contentWidth, 6, 'FD');
  doc.line(margin + halfW, currentY, margin + halfW, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('EARNINGS', margin + 3.5, currentY + 4.2);
  doc.text('MONTHLY (Rs.)', margin + halfW - 3.5, currentY + 4.2, { align: 'right' });
  doc.text('DEDUCTIONS', margin + halfW + 3.5, currentY + 4.2);
  doc.text('MONTHLY (Rs.)', margin + contentWidth - 3.5, currentY + 4.2, { align: 'right' });

  currentY += 6;

  // Values calculation
  const basicAmt = record.basicSalary || 0;
  const hra = record.allowanceBreakdown?.hra ?? Math.round(record.allowances * 0.4);
  const medical = record.allowanceBreakdown?.medical ?? Math.round(record.allowances * 0.15);
  const special = record.allowanceBreakdown?.special ?? Math.round(record.allowances * 0.35);
  const internet = record.allowanceBreakdown?.internet ?? Math.max(0, record.allowances - (hra + medical + special));
  const otAmount = Number(record.otAmount) || 0;
  const grossSalary = basicAmt + record.allowances + otAmount;

  const pt = record.deductionBreakdown?.professionalTax ?? 200;
  const pf = record.deductionBreakdown?.pfContribution ?? 1800;
  const healthInsurance = record.deductionBreakdown?.groupHealthInsurance ?? 1700;
  const standardDed = pt + pf + healthInsurance;

  const baseNet = (basicAmt + record.allowances) - standardDed;
  const lopAmount = record.lopAmount !== undefined ? record.lopAmount : +((baseNet / 30) * lopDays).toFixed(2);
  const totalDeductions = record.deductions || (standardDed + lopAmount);
  const netPayable = +(grossSalary - totalDeductions).toFixed(2);

  const formatCurr = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const lineItems: [string, string, string, string][] = [
    ['Basic Salary', formatCurr(basicAmt), 'Professional Tax', formatCurr(pt)],
    ['House Rent Allowance (HRA)', formatCurr(hra), 'Employee PF Contribution', formatCurr(pf)],
    ['Medical Allowance', formatCurr(medical), 'Group Health Insurance', formatCurr(healthInsurance)],
    ['Special Allowance', formatCurr(special), 'LOP', formatCurr(lopAmount)],
    ['Internet Allowance', formatCurr(internet), '', ''],
    ['OT', formatCurr(otAmount), '', '']
  ];

  lineItems.forEach((item, idx) => {
    const y = currentY + idx * rowH;
    doc.setDrawColor(...tableBorderColor);
    doc.rect(margin, y, contentWidth, rowH);
    doc.line(margin + halfW, y, margin + halfW, y + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textDark);

    // Earnings item
    doc.text(item[0], margin + 3.5, y + 4.2);
    if (item[1]) doc.text(item[1], margin + halfW - 3.5, y + 4.2, { align: 'right' });

    // Deductions item
    doc.text(item[2], margin + halfW + 3.5, y + 4.2);
    if (item[3]) doc.text(item[3], margin + contentWidth - 3.5, y + 4.2, { align: 'right' });
  });

  currentY += lineItems.length * rowH;

  // Gross Salary & Total Deductions Row
  doc.setDrawColor(...tableBorderColor);
  doc.rect(margin, currentY, contentWidth, rowH);
  doc.line(margin + halfW, currentY, margin + halfW, currentY + rowH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...textDark);
  doc.text('Gross Salary', margin + 3.5, currentY + 4.2);
  doc.text(formatCurr(grossSalary), margin + halfW - 3.5, currentY + 4.2, { align: 'right' });

  doc.text('Total Deductions', margin + halfW + 3.5, currentY + 4.2);
  doc.text(formatCurr(totalDeductions), margin + contentWidth - 3.5, currentY + 4.2, { align: 'right' });

  currentY += rowH;

  // NET SALARY PAYABLE Row (Continuous highlighted banner without dividing line down the middle)
  doc.setFillColor(243, 248, 255);
  doc.rect(margin, currentY, contentWidth, 7.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...navyHeaderBlue);
  doc.text('NET SALARY PAYABLE', margin + 3.5, currentY + 5.2);
  doc.setTextColor(...textDark);
  doc.text(`Rs. ${formatCurr(netPayable)}`, margin + contentWidth - 3.5, currentY + 5.2, { align: 'right' });

  currentY += 7.5;

  // Clear vertical margin between Deductions table and Component section (prevents any overlapping)
  currentY += 4.5;

  // 5. EMPLOYER CONTRIBUTIONS & CTC INFORMATION Section (Component Section)
  doc.setFillColor(...navyHeaderBlue);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setDrawColor(...tableBorderColor);
  doc.rect(margin, currentY, contentWidth, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EMPLOYER CONTRIBUTIONS & CTC INFORMATION', margin + 3, currentY + 4.6);

  currentY += 6.5;

  // Subheader
  doc.setFillColor(240, 243, 248);
  doc.rect(margin, currentY, contentWidth, 6, 'FD');
  doc.line(margin + halfW, currentY, margin + halfW, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('Component', margin + 3.5, currentY + 4.2);
  doc.text('Monthly (Rs.)', margin + halfW - 3.5, currentY + 4.2, { align: 'right' });
  doc.text('Component', margin + halfW + 3.5, currentY + 4.2);
  doc.text('Monthly (Rs.)', margin + contentWidth - 3.5, currentY + 4.2, { align: 'right' });

  currentY += 6;

  const employerRows: [string, string, string, string][] = [
    ['Employer PF Contribution', formatCurr(pf), 'Group Health Insurance', '0'],
    ['Annual Bonus*', '0.00', '', ''],
    ['Total Additional Benefits', formatCurr(pf), '', '']
  ];

  employerRows.forEach((r, idx) => {
    const y = currentY + idx * rowH;
    doc.setDrawColor(...tableBorderColor);
    doc.rect(margin, y, contentWidth, rowH);
    doc.line(margin + halfW, y, margin + halfW, y + rowH);

    doc.setFont('helvetica', idx === 2 ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textDark);

    doc.text(r[0], margin + 3.5, y + 4.2);
    if (r[1]) doc.text(r[1], margin + halfW - 3.5, y + 4.2, { align: 'right' });

    doc.text(r[2], margin + halfW + 3.5, y + 4.2);
    if (r[3]) doc.text(r[3], margin + contentWidth - 3.5, y + 4.2, { align: 'right' });
  });

  currentY += employerRows.length * rowH;

  // Clear vertical margin between Component section and Leave Balance section
  currentY += 4.5;

  // 6. Leave Balance Section
  doc.setFillColor(...navyHeaderBlue);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setDrawColor(...tableBorderColor);
  doc.rect(margin, currentY, contentWidth, 6.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Leave Balance', margin + 3, currentY + 4.6);

  currentY += 6.5;

  const leaveRows: [string, string, string, string][] = [
    ['PL Enjoyed', '0', 'SL Enjoyed', '0'],
    ['PL Balance', '3', 'SL Balance', '3'],
    ['LOP', String(lopDays), '', '']
  ];

  leaveRows.forEach((lr, idx) => {
    const y = currentY + idx * rowH;
    doc.setDrawColor(...tableBorderColor);
    doc.rect(margin, y, contentWidth, rowH);
    doc.line(margin + halfW, y, margin + halfW, y + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textDark);

    doc.text(lr[0], margin + 3.5, y + 4.2);
    doc.text(lr[1], margin + halfW - 3.5, y + 4.2, { align: 'right' });

    doc.text(lr[2], margin + halfW + 3.5, y + 4.2);
    if (lr[3]) doc.text(lr[3], margin + contentWidth - 3.5, y + 4.2, { align: 'right' });
  });

  currentY += leaveRows.length * rowH;

  // Clear vertical margin before Footer
  currentY += 4.5;

  // 7. Footer Notice
  currentY += 3;
  doc.setDrawColor(...tableBorderColor);
  doc.rect(margin, currentY, contentWidth, 7);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...textDark);
  doc.text('This is a computer-generated salary slip and does not require a physical signature.', pageWidth / 2, currentY + 4.8, { align: 'center' });

  // 8. Signatory Box
  currentY += 7;
  doc.rect(margin, currentY, contentWidth, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('For Modela Technologies Pvt. Ltd. Authorized Signatory', pageWidth / 2, currentY + 7.5, { align: 'center' });

  // Trigger download if requested
  if (autoDownload) {
    const filename = `SalarySlip_${record.employeeName.replace(/\s+/g, '_')}_${record.month}_${record.year}.pdf`;
    doc.save(filename);
  }

  return doc;
}
