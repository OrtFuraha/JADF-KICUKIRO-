const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Ensure certificates directory exists
const certDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

async function generateCertificate(userName, outputPath) {
  console.log(`📄 Generating certificate for: ${userName}`);
  
  // Get current date
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Create HTML with the certificate image and name overlay
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          margin: 0; 
          padding: 0; 
          background: white;
          width: 297mm;
          height: 210mm;
          overflow: hidden;
        }
        .certificate-container {
          width: 297mm;
          height: 210mm;
          position: relative;
          overflow: hidden;
          background: #ffffff;
        }
        .certificate-bg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .certificate-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 25mm 30mm 20mm 30mm;
        }
        .cert-title {
          font-family: 'Times New Roman', serif;
          font-size: 42px;
          font-weight: 700;
          color: #123A78;
          text-align: center;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 2mm;
          text-shadow: 0 0 30px rgba(255,255,255,0.8);
        }
        .cert-subtitle {
          font-family: 'Times New Roman', serif;
          font-size: 32px;
          font-weight: 600;
          color: #C89A28;
          text-align: center;
          letter-spacing: 2px;
          margin-bottom: 4mm;
          text-shadow: 0 0 30px rgba(255,255,255,0.8);
        }
        .cert-divider {
          width: 80mm;
          height: 2px;
          background: #C89A28;
          margin: 0 auto 4mm;
        }
        .presented-text {
          font-family: 'Times New Roman', serif;
          font-size: 20px;
          color: #333;
          text-align: center;
          margin-bottom: 3mm;
          font-style: italic;
          text-shadow: 0 0 20px rgba(255,255,255,0.9);
        }
        .recipient-name {
          font-family: 'Times New Roman', serif;
          font-size: 44px;
          font-weight: 700;
          color: #000000;
          text-align: center;
          letter-spacing: 2px;
          margin-bottom: 5mm;
          padding: 8px 30px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          display: inline-block;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          text-shadow: none;
        }
        .cert-message {
          font-family: 'Times New Roman', serif;
          font-size: 16px;
          color: #333;
          text-align: center;
          line-height: 1.6;
          max-width: 200mm;
          margin: 0 auto 3mm;
          text-shadow: 0 0 20px rgba(255,255,255,0.9);
        }
        .cert-date {
          font-family: 'Times New Roman', serif;
          font-size: 16px;
          color: #555;
          text-align: center;
          margin-bottom: 5mm;
          text-shadow: 0 0 20px rgba(255,255,255,0.9);
        }
        .signature-section {
          display: flex;
          justify-content: center;
          width: 100%;
          max-width: 160mm;
          margin-top: 2mm;
        }
        .signature-block {
          text-align: center;
          flex: 1;
        }
        .signature-line {
          width: 60mm;
          height: 1px;
          background: #333;
          margin: 0 auto 2mm;
        }
        .signature-name {
          font-family: 'Times New Roman', serif;
          font-size: 14px;
          font-weight: 600;
          color: #123A78;
        }
        .signature-title {
          font-family: 'Times New Roman', serif;
          font-size: 11px;
          color: #555;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        <img src="file://${path.join(__dirname, 'certificate-background.jpg')}" class="certificate-bg" />
        <div class="certificate-content">
          <div class="cert-title">CERTIFICATE</div>
          <div class="cert-subtitle">OF PARTICIPATION</div>
          <div class="cert-divider"></div>
          <div class="presented-text">This certificate is proudly presented to</div>
          <div class="recipient-name">${userName.toUpperCase()}</div>
          <div class="cert-message">
            In recognition of your active participation in<br />
            tremendous activities in Kicukiro District in the fiscal year 2025/2026;
          </div>
          <div class="cert-message">
            Your commitment and valuable contribution to strengthening partnership<br />
            and promoting inclusive and sustainable development in Kicukiro District<br />
            are highly appreciated.
          </div>
          <div class="cert-date">Issued at Kicukiro, on ${dateStr}</div>
          <div class="signature-section">
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">District Executive Administrator</div>
              <div class="signature-title">Kicukiro District</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Set the HTML content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      },
      scale: 1
    });

    console.log(`✅ Certificate generated: ${outputPath}`);
    return outputPath;

  } catch (error) {
    console.error('❌ Error generating certificate:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Export for use in other modules
module.exports = { generateCertificate };

// If run directly, generate a sample certificate
if (require.main === module) {
  const sampleName = 'FURAHA HERVE ORTEGA';
  const outputFile = path.join(certDir, `Certificate_${sampleName.replace(/\s/g, '_')}.pdf`);
  generateCertificate(sampleName, outputFile)
    .then(() => {
      console.log(`📁 Certificate saved to: ${outputFile}`);
    })
    .catch(error => {
      console.error('❌ Failed to generate certificate:', error);
    });
}
