const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateCertificateWithPDF(userName, outputPath) {
  try {
    console.log(`📄 Generating certificate for: ${userName}`);
    
    // Get current date
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Load the PDF template
    const pdfPath = path.join(__dirname, 'certificate-template.pdf');
    
    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
      console.log('⚠️ certificate-template.pdf not found, using fallback');
      return generateFallbackCertificate(userName, outputPath);
    }
    
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Get page dimensions
    const { width, height } = firstPage.getSize();
    
    console.log(`📐 Page: ${width} x ${height} points`);
    
    // Embed fonts
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    
    // --- Position the name in the blank space ---
    // The blank space is where the name should appear (around 52-55% down)
    const nameText = userName.toUpperCase();
    const fontSize = 36;
    const textWidth = boldFont.widthOfTextAtSize(nameText, fontSize);
    const padding = 50;
    const rectWidth = textWidth + padding * 2;
    const rectHeight = 55;
    const centerX = width / 2;
    
    // Position at 53% of page height (adjust as needed)
    const nameY = height * 0.53;
    const rectX = (width - rectWidth) / 2;
    const rectY = nameY - rectHeight / 2;
    
    console.log(`📍 Placing name at Y: ${nameY} (${Math.round(nameY/height * 100)}% of page)`);
    
    // Draw white rectangle background for name
    firstPage.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectWidth,
      height: rectHeight,
      color: rgb(1, 1, 1),
      opacity: 0.92,
    });
    
    // Draw the name in BLACK
    firstPage.drawText(nameText, {
      x: (width - textWidth) / 2,
      y: nameY - 14,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Serialize the PDF
    const pdfBytesModified = await pdfDoc.save();
    
    // Write to output path
    fs.writeFileSync(outputPath, pdfBytesModified);
    
    console.log(`✅ Certificate generated: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error('❌ Error generating certificate with PDF:', error);
    console.log('⚠️ Using fallback certificate generation...');
    return generateFallbackCertificate(userName, outputPath);
  }
}

// Fallback certificate using canvas
async function generateFallbackCertificate(userName, outputPath) {
  const { createCanvas } = require('canvas');
  const { jsPDF } = require('jspdf');
  
  try {
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const canvas = createCanvas(3508, 2480);
    const ctx = canvas.getContext('2d');
    
    // Create certificate background
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, 3508, 2480);
    
    // Border
    ctx.strokeStyle = '#C89A28';
    ctx.lineWidth = 15;
    ctx.strokeRect(50, 50, 3408, 2380);
    
    ctx.strokeStyle = '#123A78';
    ctx.lineWidth = 3;
    ctx.strokeRect(70, 70, 3368, 2340);
    
    // Republic of Rwanda text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.fillStyle = '#123A78';
    ctx.fillText('REPUBLIC OF RWANDA', 1754, 120);
    
    ctx.font = '28px "Times New Roman", serif';
    ctx.fillStyle = '#333';
    ctx.fillText('KIGALI CITY', 1754, 170);
    ctx.fillText('KICUKIRO DISTRICT', 1754, 210);
    
    // Title
    ctx.font = 'bold 72px "Times New Roman", serif';
    ctx.fillStyle = '#123A78';
    ctx.fillText('CERTIFICATE', 1754, 350);
    
    // Subtitle
    ctx.font = 'bold 48px "Times New Roman", serif';
    ctx.fillStyle = '#C89A28';
    ctx.fillText('OF APPRECIATION', 1754, 430);
    
    // Gold line
    ctx.strokeStyle = '#C89A28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(1400, 470);
    ctx.lineTo(2108, 470);
    ctx.stroke();
    
    // "This certificate is proudly presented to"
    ctx.font = 'italic 32px "Times New Roman", serif';
    ctx.fillStyle = '#333';
    ctx.fillText('This certificate is proudly presented to', 1754, 560);
    
    // Name - positioned in the blank space
    const nameY = 640;
    ctx.font = 'bold 44px "Times New Roman", serif';
    const metrics = ctx.measureText(userName.toUpperCase());
    const textWidth = metrics.width;
    const padding = 50;
    const textHeight = 55;
    const x = 1754;
    const y = nameY;
    
    // White background for name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    const rectX = x - textWidth/2 - padding;
    const rectY = y - textHeight/2 - 4;
    const rectW = textWidth + padding * 2;
    const rectH = textHeight + 8;
    ctx.fillRect(rectX, rectY, rectW, rectH);
    
    // Name in BLACK
    ctx.font = 'bold 44px "Times New Roman", serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(userName.toUpperCase(), x, y);
    
    // Message
    ctx.font = '26px "Times New Roman", serif';
    ctx.fillStyle = '#333';
    ctx.fillText('In recognition of your active participation in', 1754, 820);
    ctx.fillText('tremendous activities in Kicukiro District', 1754, 880);
    ctx.fillText('in the fiscal year 2025/2026;', 1754, 940);
    ctx.fillText('Your commitment and valuable contribution to strengthening partnership', 1754, 1020);
    ctx.fillText('and promoting inclusive and sustainable development in Kicukiro District', 1754, 1080);
    ctx.fillText('are highly appreciated.', 1754, 1140);
    
    // Date
    ctx.font = '26px "Times New Roman", serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Issued at Kicukiro, on ' + dateStr, 1754, 1280);
    
    // Signature
    ctx.font = '20px "Times New Roman", serif';
    ctx.fillStyle = '#123A78';
    ctx.fillText('District Executive Administrator', 1754, 1500);
    ctx.font = '16px "Times New Roman", serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Kicukiro District', 1754, 1540);
    
    // JADF footer
    ctx.font = 'bold 18px "Times New Roman", serif';
    ctx.fillStyle = '#123A78';
    ctx.fillText('JADF', 1754, 1750);
    ctx.font = '16px "Times New Roman", serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Kicukiro District', 1754, 1790);
    ctx.font = '14px "Times New Roman", italic';
    ctx.fillStyle = '#888';
    ctx.fillText('We build Partnership Towards Sustainable Development', 1754, 1840);
    
    // Generate PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
    pdf.save(outputPath);
    
    console.log(`✅ Fallback certificate generated: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error('❌ Fallback certificate generation failed:', error);
    throw error;
  }
}

module.exports = { generateCertificateWithPDF };
