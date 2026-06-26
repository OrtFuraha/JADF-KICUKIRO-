const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testPDF() {
  try {
    const pdfPath = path.join(__dirname, 'certificate-template.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ certificate-template.pdf not found!');
      console.log('📁 Please make sure the file exists.');
      return;
    }
    
    console.log('📄 Testing PDF: ' + pdfPath);
    
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    console.log('📐 Page dimensions:');
    console.log(`   Width: ${width} points`);
    console.log(`   Height: ${height} points`);
    console.log('');
    console.log('📍 Suggested name positions (Y coordinate from bottom):');
    console.log(`   Position 1 (55%): ${height * 0.55}`);
    console.log(`   Position 2 (50%): ${height * 0.50}`);
    console.log(`   Position 3 (58%): ${height * 0.58}`);
    console.log(`   Position 4 (60%): ${height * 0.60}`);
    console.log('');
    console.log('📍 X coordinate (center): ' + width / 2);
    console.log('');
    console.log('💡 The name should be placed where the blank line is.');
    console.log('   Try different Y positions to find the right spot.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPDF();
