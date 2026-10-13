const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint for structuring note (Rule-based / Fallback clinical parser)
  if (req.url === '/api/parse-note' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { text, bed } = JSON.parse(body || '{}');
        const sbar = parseMedicalSpeech(text || '', bed || 'ไม่ระบุเตียง');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, sbar }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

// Helper parser to turn spoken Thai nurse voice into SBAR structure
function parseMedicalSpeech(rawText, bed) {
  let s = `${bed}: รับรายงานเหตุการณ์ระหว่างเวร`;
  let b = "สัญญาณชีพและอาการทั่วไปทรงตัว";
  let a = "ดูแลตามแผนการรักษา";
  let r = "ติดตามอาการอย่างต่อเนื่องในเวรถัดไป";

  // Check for common patterns
  if (/bp.*(ดรอป|ตก|ต่ำ)|ความดัน.*(ดรอป|ตก|ต่ำ)/i.test(rawText)) {
    s = `${bed}: มีภาวะความดันโลหิตลดต่ำลง (Hypotension / BP Drop)`;
  } else if (/เหนื่อย|หอบ|dyspnea|o2.*(ตก|ดรอป)/i.test(rawText)) {
    s = `${bed}: ผู้ป่วยมีอาการเหนื่อย หายใจเร็ว หรือ SpO2 ลดต่ำลง`;
  } else if (/ไข้|fever|t.*(สูง|38|39)/i.test(rawText)) {
    s = `${bed}: ผู้ป่วยมีไข้ อุณหภูมิกายสูง`;
  }

  // Extract BP readings if found (e.g., 85/50, 120/80)
  const bpMatch = rawText.match(/(\d{2,3}\/\d{2,3})/g);
  if (bpMatch && bpMatch.length > 0) {
    b = `บันทึกสัญญาณชีพ BP: ${bpMatch.join(', ')} mmHg`;
  }

  // Extract O2 / Saturation
  const o2Match = rawText.match(/(o2\s*sat|spo2|sat)\s*(\d{2,3})%?/i);
  if (o2Match) {
    b += ` | SpO2: ${o2Match[2]}%`;
  }

  // Actions (NSS, โหลด, ยา, oxygen)
  const actionList = [];
  if (/โหลด.*nss|nss.*(โหลด|500|1000)/i.test(rawText)) {
    actionList.push("รายงานแพทย์ ได้รับคำสั่ง IV Fluid Loading (NSS)");
  }
  if (/cannula|mask|oxygen|ออกซิเจน/i.test(rawText)) {
    actionList.push("ปรับเพิ่ม/ดูแลการให้ออกซิเจนบำบัด");
  }
  if (/dtx|เจาะน้ำตาล/i.test(rawText)) {
    actionList.push("เจาะตรวจ DTX ติดตามระดับน้ำตาลในเลือด");
  }
  if (actionList.length > 0) {
    a = actionList.join(", ");
  } else if (rawText) {
    a = `การพยาบาล: ${rawText.slice(0, 120)}...`;
  }

  // Recommendations / Follow up
  const planList = [];
  if (/urine|ปัสสาวะ/i.test(rawText)) {
    planList.push("ติดตาม Urine Output ทุก 1-2 ชั่วโมง");
  }
  if (/เวรดึก|เวรถัดไป|ฝาก/i.test(rawText)) {
    planList.push("ฝากเวรถัดไปประเมินสัญญาณชีพซ้ำและเฝ้าระวังอาการเปลี่ยนแปลง");
  }
  if (planList.length > 0) {
    r = planList.join(", ");
  }

  return { s, b, a, r, rawText };
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`The Note Nurse running on http://localhost:${PORT}`);
});

