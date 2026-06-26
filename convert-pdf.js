const path = require('path');
const { convertPDF } = require('pdf-poppler');

async function convertPDFToImage() {
  try {
    const pdfPath = path.join(__dirname, 'certificate-template.pdf');
    const outputDir = __dirname;
    
    const opts = {
      format: 'jpeg',
      out_dir: outputDir,
      out_prefix: 'certificate',
      page: null, // Convert all pages
      resolution: 300 // High quality
    };
    
    console.log('🔄 Converting PDF to image...');
    await convertPDF(pdfPath, opts);
    console.log('✅ PDF converted to image successfully!');
    console.log('📁 File saved as: certificate-1.jpg');
  } catch (error) {
    console.error('❌ Error converting PDF:', error.message);
    console.log('💡 Using fallback method...');
    
    // If conversion fails, create a simple certificate
    const fs = require('fs');
    const { createCanvas } = require('canvas');
    
    const canvas = createCanvas(3508, 2480);
    const ctx = canvas.getContext('2d');
    
    // Create a simple certificate background
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, 3508, 2480);
    
    // Border
    ctx.strokeStyle = '#C89A28';
    ctx.lineWidth = 20;
    ctx.strokeRect(50, 50, 3408, 2380);
    
    ctx.strokeStyle = '#123A78';
    ctx.lineWidth = 4;
    ctx.strokeRect(70, 70, 3368, 2340);
    
    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 72px "Times New Roman", serif';
    ctx.fillStyle = '#123A78';
    ctx.fillText('CERTIFICATE', 1754, 400);
    
    ctx.font = 'bold 48px "Times New Roman", serif';
    ctx.fillStyle = '#C89A28';
    ctx.fillText('OF PARTICIPATION', 1754, 500);
    
    // Line
    ctx.strokeStyle = '#C89A28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(1500, 550);
    ctx.lineTo(2008, 550);
    ctx.stroke();
    
    // Presented to
    ctx.font = 'italic 36px "Times New Roman", serif';
    ctx.fillStyle = '#333';
    ctx.fillText('This certificate is proudly presented to', 1754, 700);
    
    // Name placeholder
    ctx.font = 'bold 56px "Times New Roman", serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('[RECIPIENT NAME]', 1754, 850);
    
    // Message
    ctx.font = '28px "Times New Roman", serif';
    ctx.fillStyle = '#333';
    ctx.fillText('In recognition of your active participation in', 1754, 1050);
    ctx.fillText('tremendous activities in Kicukiro District', 1754, 1120);
    ctx.fillText('in the fiscal year 2025/2026;', 1754, 1190);
    ctx.fillText('Your commitment and valuable contribution to strengthening partnership', 1754, 1300);
    ctx.fillText('and promoting inclusive and sustainable development in Kicukiro District', 1754, 1370);
    ctx.fillText('are highly appreciated.', 1754, 1440);
    
    // Date
    ctx.font = '28px "Times New Roman", serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Issued at Kicukiro, on [DATE]', 1754, 1650);
    
    // Signature
    ctx.font = '22px "Times New Roman", serif';
    ctx.fillStyle = '#123A78';
    ctx.fillText('District Executive Administrator', 1754, 1950);
    ctx.font = '18px "Times New Roman", serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Kicukiro District', 1754, 2000);
    
    // Save the image
    const out = fs.createWriteStream(path.join(__dirname, 'certificate-1.jpg'));
    const stream = canvas.createJPEGStream({ quality: 0.95 });
    stream.pipe(out);
    out.on('finish', () => {
      console.log('✅ Fallback certificate image created: certificate-1.jpg');
    });
  }
}

convertPDFToImage();
