import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '../assets/logo manuastro.jpg';
const COMPANY_DETAILS = {
    name: "MANUASTRO LLP",
    address: "Shop-6, Chandracharya Appartment, Kankhal - Haridwar, Uttarakhand - 249408",
    email: "hr@manuastro.com",
    website: "www.manuastro.com"
};

// ✅ Safe JPEG Logo
const LOGO_URL = logoImage;
export const generatePayslipBlob = (data) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    // Helper Utils
    const drawBox = (y, h) => doc.rect(margin, y, contentWidth, h);
    const numToWords = (n) => n?.toLocaleString('en-IN') + " Only"; // Formatting Number

    // --- 1. HEADER SECTION ---
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, margin, contentWidth, 30, 'F');
    try { doc.addImage(LOGO_URL, 'JPEG', margin + 5, margin + 5, 25, 20); } catch(e){}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(COMPANY_DETAILS.name, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_DETAILS.address, pageWidth / 2, 26, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP", pageWidth - 15, 20, { align: "right" });
    doc.setFontSize(10);
    // Month display logic
    doc.text(data.month || new Date().toISOString().slice(0, 7), pageWidth - 15, 26, { align: "right" });

    // --- 2. EMPLOYEE DETAILS GRID ---
    const detailsY = 45;
    const detailsH = 35;
    drawBox(detailsY, detailsH);
    
    doc.setFontSize(9);
    const col1 = margin + 5; const col2 = margin + 40;
    const col3 = pageWidth / 2 + 5; const col4 = pageWidth / 2 + 40;
    let dy = detailsY + 8;

    const addDetail = (lbl, val, xL, xV) => {
        doc.setFont("helvetica", "bold"); doc.text(lbl, xL, dy);
        doc.setFont("helvetica", "normal"); doc.text(String(val || "-"), xV, dy);
    };

    // Data Mapping (Handles keys from both Manual Entry & Database Record)
    addDetail("Name:", data.name || data.employeeName, col1, col2);
    addDetail("Designation:", data.designation, col3, col4);
    dy += 6;
    addDetail("Emp ID:", data.id || data.empCode, col1, col2);
    addDetail("Department:", data.department, col3, col4);
    dy += 6;
    addDetail("Bank Name:", data.bankName, col1, col2);
    addDetail("Bank A/c:", data.bank || data.bankAccount, col3, col4);
    dy += 6;
    addDetail("PAN No:", data.pan || data.panNo, col1, col2);
    addDetail("UAN:", data.uan || data.uanNo, col3, col4);
    dy += 6;
    // Settings handling
    const paidDays = data.settings?.paidDays ?? data.paidDays ?? 30;
    addDetail("Paid Days:", String(paidDays), col1, col2);
    addDetail("Date of Joining:", data.doj || "-", col3, col4);

    // --- 3. SALARY TABLE ---
    const tableY = detailsY + detailsH + 5;
    const fin = data.financials || {}; // Fallback if direct keys not present
    
    // Smart Getter: Checks 'financials' object first, then direct keys (for legacy records)
    const getVal = (key1, key2) => Number(fin[key1] ?? data[key2] ?? 0).toFixed(2);

    const earnings = [
        ['Basic Salary', getVal('basic', 'basicSalary')],
        ['HRA', getVal('hra', 'hra')],
        ['Special Allow.', getVal('special', 'specialAllowance')],
        ['Incentive', getVal('incentive', 'incentive')],
        ['Arrears', getVal('arrears', 'arrears')],
    ];
    const deductions = [
        ['Provident Fund', getVal('pf', 'pf')],
        ['ESIC', getVal('esic', 'esic')],
        ['Prof. Tax', getVal('pt', 'pt')],
        ['TDS', getVal('tds', 'tds')],
        ['Advance', getVal('advance', 'advanceSalary')],
    ];

    const tableBody = earnings.map((earn, i) => {
        const ded = deductions[i] || ['', ''];
        return [earn[0], earn[1], ded[0], ded[1]];
    });

    const gross = data.totals?.grossEarnings ?? data.grossEarnings ?? 0;
    const totalDed = data.totals?.totalDeductions ?? data.totalDeductions ?? 0;
    const net = data.totals?.netPay ?? data.netSalary ?? 0;

    tableBody.push([
        { content: 'Total Earnings', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: Number(gross).toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: Number(totalDed).toFixed(2), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
    ]);

    autoTable(doc, {
        startY: tableY,
        head: [['EARNINGS', 'AMOUNT', 'DEDUCTIONS', 'AMOUNT']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, lineColor: [0,0,0], lineWidth: 0.1, textColor: [0,0,0] },
        headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } },
        margin: { left: margin, right: margin }
    });

    // --- 4. NET PAY & FOOTER ---
    const finalY = doc.lastAutoTable.finalY + 5;
    doc.setDrawColor(0);
    doc.rect(margin, finalY, contentWidth, 30);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("NET SALARY PAYABLE:", margin + 5, finalY + 10);
    doc.setFontSize(16);
    doc.text(`Rs. ${Number(net).toLocaleString()}`, pageWidth - 15, finalY + 10, { align: "right" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Amount in words: ${numToWords(Number(net))}`, margin + 5, finalY + 20);

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is a computer-generated payslip and does not require a signature.", pageWidth/2, finalY + 26, { align: "center" });

    // Return Blob URL for viewing
    return doc.output('bloburl');
};