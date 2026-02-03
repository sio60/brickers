import { jsPDF } from "jspdf";

export interface PartInfo {
    id: string; // e.g. "3001.dat" -> "3001"
    color: number;
    count: number;
    name?: string; // Optional: can be retrieved from LDraw library if available, but ID is enough for now
}

export interface StepBOM {
    stepIndex: number;
    parts: PartInfo[];
}

/**
 * LDR 텍스트를 파싱하여 스텝별 부품 목록을 추출합니다.
 */
export function parseBOM(ldrText: string): StepBOM[] {
    const lines = ldrText.replace(/\r\n/g, "\n").split("\n");
    const steps: StepBOM[] = [];
    let currentParts: Map<string, PartInfo> = new Map();
    let stepIndex = 1; // 1-based step index

    // Helper to flush current step
    const flushStep = () => {
        if (currentParts.size > 0) {
            steps.push({
                stepIndex: stepIndex,
                parts: Array.from(currentParts.values())
            });
        } else {
            // 부품이 없는 스텝(회전 등)도 있을 수 있음. 빈 배열 추가
            steps.push({
                stepIndex: stepIndex,
                parts: []
            });
        }
        currentParts = new Map();
        stepIndex++;
    };

    for (const raw of lines) {
        const line = raw.trim();

        // Step 구분
        if (/^0\s+(STEP|ROTSTEP)\b/i.test(line)) {
            flushStep();
            continue;
        }

        // 부품 라인 파싱 (Type 1)
        // 1 <colour> x y z a b c d e f g h i <file>
        if (line.startsWith('1 ')) {
            const tokens = line.split(/\s+/);
            if (tokens.length >= 15) {
                const color = parseInt(tokens[1]);
                const file = tokens.slice(14).join(" "); // 파일명에 공백이 있을 수 있음

                // 파일명에서 확장자 제거 및 간소화
                const partId = file.toLowerCase().replace('.dat', '').replace('.ldr', '');
                const key = `${partId}_${color}`;

                if (currentParts.has(key)) {
                    currentParts.get(key)!.count++;
                } else {
                    currentParts.set(key, {
                        id: partId,
                        color: color,
                        count: 1
                    });
                }
            }
        }
    }
    // 마지막 스텝 처리
    flushStep();

    return steps;
}

/**
 * 캡처된 이미지들과 BOM 정보를 받아 PDF를 생성하고 다운로드합니다.
 * images: [Step1_View1, Step1_View2, Step1_View3, Step2_View1, ...]
 */
export function savePDF(
    images: string[],
    bomData: StepBOM[],
    filename: string = "instructions.pdf"
) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Title Page (Optional)
    doc.setFontSize(24);
    doc.text("Assembly Instructions", pageWidth / 2, 40, { align: "center" });
    doc.setFontSize(16);
    doc.text(filename.replace(".pdf", ""), pageWidth / 2, 55, { align: "center" });

    // Add first page if images exist
    if (images.length > 0) {
        doc.addPage();
    }

    const IMAGES_PER_STEP = 3; // 3 views per step
    const totalSteps = Math.floor(images.length / IMAGES_PER_STEP);

    for (let i = 0; i < totalSteps; i++) {
        if (i > 0) doc.addPage();

        const stepNum = i + 1;
        const bom = bomData[i] || { parts: [] };

        // Header
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(`Step ${stepNum}`, margin, margin + 10);

        // Images
        // Layout: Main (View1) Top-Left, Sub1 (View2) Top-Right, Sub2 (View3) Bottom-Right?
        // Or Main Big Top, Sub small bottom?

        // Let's try:
        // Main View (View 1 - 쿼터뷰): Large, Top Center
        // Sub View 1 (View 2 - 반대/탑): Small, Bottom Left
        // Sub View 2 (View 3 - 후면): Small, Bottom Right

        const img1 = images[i * IMAGES_PER_STEP + 0]; // Main
        const img2 = images[i * IMAGES_PER_STEP + 1]; // Left/Top
        const img3 = images[i * IMAGES_PER_STEP + 2]; // Back

        // Main Image
        const mainW = pageWidth - margin * 2;
        const mainH = 120; // Fixed height area
        if (img1) {
            doc.addImage(img1, 'PNG', margin, 30, mainW, mainH, undefined, 'FAST');
        }

        // Sub Images
        const subW = (pageWidth - margin * 3) / 2;
        const subH = 80;
        const subY = 30 + mainH + 10;

        if (img2) {
            doc.addImage(img2, 'PNG', margin, subY, subW, subH, undefined, 'FAST');
            doc.setFontSize(10);
            doc.text("Left/Top View", margin + 2, subY - 2);
        }

        if (img3) {
            doc.addImage(img3, 'PNG', margin + subW + margin, subY, subW, subH, undefined, 'FAST');
            doc.text("Back View", margin + subW + margin + 2, subY - 2);
        }

        // BOM List (Overlay or Separate area)
        // Let's put BOM in the empty space or overlay on Main Image top-right
        const bomX = pageWidth - margin - 50;
        const bomY = 40;

        doc.setFontSize(12);
        doc.setFillColor(255, 255, 255);
        doc.rect(bomX - 5, bomY - 5, 55, 10 + (bom.parts.length * 6), 'F'); // Background box
        doc.text("Parts Needed:", bomX, bomY);

        doc.setFontSize(10);
        bom.parts.forEach((part, idx) => {
            const lineY = bomY + 6 + (idx * 6);
            // Color mapping is hard without palette, just show ID
            doc.text(`${part.count}x ${part.id} (Col:${part.color})`, bomX, lineY);
        });
    }

    doc.save(filename);
}
