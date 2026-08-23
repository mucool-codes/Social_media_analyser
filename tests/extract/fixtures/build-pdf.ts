// Hand-rolled minimal PDF writer for tests. No PDF-generation library is installed in
// this project (pdf-parse only *reads* PDFs), so fixtures are built directly as valid
// PDF byte streams: a Catalog, a Pages tree, one Page + content stream per page, and a
// shared Helvetica font — enough structure for pdf-parse (pdfjs-dist under the hood) to
// parse real files rather than mocked ones.

function escapePdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildContentStream(lines: string[]): string {
  if (lines.length === 0) return "";
  const ops: string[] = ["BT", "/F1 12 Tf", "72 750 Td"];
  lines.forEach((line, i) => {
    if (i > 0) ops.push("0 -16 Td");
    ops.push(`(${escapePdfString(line)}) Tj`);
  });
  ops.push("ET");
  return ops.join("\n");
}

/** Builds a syntactically valid, unencrypted PDF with one page per entry in `pages`
 * (each entry is that page's lines of text, rendered top-to-bottom). An empty page
 * (`[]`) yields a real page with no text-showing operators at all. */
export function buildTestPdf(pages: string[][]): Buffer {
  const n = Math.max(pages.length, 1);
  const FONT = 3;
  const firstPage = 4;
  const firstContent = firstPage + n;
  const highestObj = firstContent + n - 1;

  interface Obj {
    num: number;
    body: string;
  }
  const objs: Obj[] = [];

  objs.push({ num: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" });

  const kids = Array.from({ length: n }, (_, i) => `${firstPage + i} 0 R`).join(" ");
  objs.push({ num: 2, body: `<< /Type /Pages /Kids [${kids}] /Count ${n} >>` });

  objs.push({ num: FONT, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" });

  for (let i = 0; i < n; i++) {
    objs.push({
      num: firstPage + i,
      body: `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${FONT} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${firstContent + i} 0 R >>`,
    });
  }

  for (let i = 0; i < n; i++) {
    const stream = buildContentStream(pages[i] ?? []);
    const streamBytes = Buffer.byteLength(stream, "latin1");
    objs.push({
      num: firstContent + i,
      body: `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    });
  }

  objs.sort((a, b) => a.num - b.num);

  const header = Buffer.from("%PDF-1.4\n", "latin1");
  const chunks: Buffer[] = [header];
  const offsets = new Map<number, number>();
  let cursor = header.length;

  for (const obj of objs) {
    offsets.set(obj.num, cursor);
    const buf = Buffer.from(`${obj.num} 0 obj\n${obj.body}\nendobj\n`, "latin1");
    chunks.push(buf);
    cursor += buf.length;
  }

  const xrefOffset = cursor;
  const size = highestObj + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let num = 1; num <= highestObj; num++) {
    const off = offsets.get(num);
    xref += off === undefined ? "0000000000 00000 f \n" : `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  chunks.push(Buffer.from(xref + trailer, "latin1"));
  return Buffer.concat(chunks);
}
