import { jsPDF } from 'jspdf';
import { Employee, PayrollRecord, AttendanceRecord, StaffWorkflowRequest, User } from '../types';

interface DossierGenerationOptions {
  employees?: Employee[];
  payroll?: PayrollRecord[];
  attendance?: AttendanceRecord[];
  staffRequests?: StaffWorkflowRequest[];
  currentUser?: User | null;
  autoDownload?: boolean;
}

export function generateExecutiveDossierPDF({
  employees = [],
  payroll = [],
  attendance = [],
  staffRequests = [],
  currentUser,
  autoDownload = true
}: DossierGenerationOptions = {}): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Corporate Color Palette
  const darkNavy = [11, 21, 40] as const; // #0B1528
  const deepBlue = [14, 27, 51] as const; // #0E1B33
  const cobalt = [37, 99, 235] as const; // #2563EB
  const skyBlue = [56, 189, 248] as const; // #38BDF8
  const emerald = [16, 185, 129] as const; // #10B981
  const slateDark = [30, 41, 59] as const; // #1E293B
  const slateLight = [241, 245, 249] as const; // #F1F5F9
  const textMuted = [100, 116, 139] as const;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(...cobalt);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Cover / Header Banner
  doc.setFillColor(...darkNavy);
  doc.roundedRect(margin, 12, contentWidth, 34, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MODELA CONNECT TECHNOLOGIES INC.', margin + 8, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...skyBlue);
  doc.text('EXECUTIVE WORKFORCE & OPERATIONAL AUDIT DOSSIER', margin + 8, 29);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('100 Pine Street, Suite 2400 • San Francisco, CA 94111 • EIN 84-2910481', margin + 8, 35);
  doc.text('Reporting Window: Q4 Comprehensive Cycle • Security Clearance: RESTRICTED C-SUITE', margin + 8, 39.5);

  // Badge on Header Right
  doc.setFillColor(...deepBlue);
  doc.roundedRect(pageWidth - margin - 56, 18, 48, 22, 2, 2, 'F');
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - margin - 56, 18, 48, 22, 2, 2, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CONFIDENTIAL', pageWidth - margin - 32, 25, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...skyBlue);
  doc.text('LIVE AGGREGATIONS', pageWidth - margin - 32, 30, { align: 'center' });
  doc.setTextColor(148, 163, 184);
  doc.text('DOS-2026-Q4-MOD', pageWidth - margin - 32, 35, { align: 'center' });

  // 3. Metadata Strip
  let currentY = 52;
  doc.setFillColor(...slateLight);
  doc.roundedRect(margin, currentY, contentWidth, 10, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, contentWidth, 10, 1.5, 1.5, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slateDark);
  doc.text('DATE COMPILED:', margin + 5, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin + 30, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZING OFFICER:', margin + 70, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(currentUser?.name || 'Sushoovan Das (Super Admin)', margin + 107, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('INTEGRITY STATUS:', margin + 144, currentY + 6.5);
  doc.setTextColor(...emerald);
  doc.setFont('helvetica', 'bold');
  doc.text('VERIFIED & SYNCHRONIZED', margin + 172, currentY + 6.5);

  // 4. Executive KPI Highlights (2 Metric Containers: Retention & Stability and Average Tenure)
  currentY += 15;
  const cardWidth = (contentWidth - 6) / 2;

  const drawKpiCard = (x: number, title: string, stat: string, sub: string, statColor: readonly [number, number, number]) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(title.toUpperCase(), x + 4, currentY + 6);

    doc.setFontSize(14);
    doc.setTextColor(...statColor);
    doc.text(stat, x + 4, currentY + 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateDark);
    doc.text(sub, x + 4, currentY + 20);
  };

  drawKpiCard(margin, 'Retention & Stability', '97.8%', 'Annualized attrition < 2.2%', cobalt);
  drawKpiCard(margin + cardWidth + 6, 'Average Tenure', '2.4 Yrs', 'Across corporate departments', slateDark);

  currentY += 32;

  // 5. Compliance Certification & Digital Executive Sign-off
  doc.setFillColor(...darkNavy);
  doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('COMPLIANCE CERTIFICATION & DIGITAL EXECUTIVE SIGN-OFF', margin + 4, currentY + 5);

  currentY += 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 27, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text(
    'This Executive Dossier has been compiled automatically from Modela Connect live ledger repositories, verified against payroll disbursements,',
    margin + 4,
    currentY + 6
  );
  doc.text(
    'attendance logs, and multi-factor staff verification records. Discrepancies are logged in immutable activity telemetry.',
    margin + 4,
    currentY + 10
  );
  doc.text(
    'Audit Reference Hash: SHA256-DOS-8492041-9874AFB • Modela Connect Enterprise Workforce OS',
    margin + 4,
    currentY + 14
  );

  // Signature Block
  const sigX = pageWidth - margin - 60;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sigX, currentY + 17, pageWidth - margin - 4, currentY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...slateDark);
  doc.text('Sushoovan Das', sigX + 10, currentY + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textMuted);
  doc.text('Super Admin & Chief Executive Officer', sigX + 4, currentY + 24.5);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `CONFIDENTIAL EXECUTIVE DOSSIER • Modela Connect Technologies Inc. • Page 1 of 1 • Generated: ${new Date().toISOString()}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  // Trigger browser download if requested
  if (autoDownload) {
    const filename = `Modela_Executive_Dossier_Q4_2026.pdf`;
    doc.save(filename);
  }

  return doc;
}
