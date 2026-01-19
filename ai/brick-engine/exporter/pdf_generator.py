"""
PDF 조립설명서 생성기

BOM 데이터를 받아서 PDF로 출력
fpdf2 라이브러리 사용
"""

import os
from datetime import datetime
from typing import Optional, List
from fpdf import FPDF


class BomPDF(FPDF):
    """BOM PDF 생성 클래스"""

    def __init__(self, model_name: str, mode: str = "pro"):
        super().__init__()
        self.model_name = model_name
        self.mode = mode
        self.set_auto_page_break(auto=True, margin=15)

        # 한글 폰트 설정 (Windows 맑은고딕)
        font_path = "C:/Windows/Fonts/malgun.ttf"
        if os.path.exists(font_path):
            self.add_font("Malgun", "", font_path)
            self.add_font("Malgun", "B", "C:/Windows/Fonts/malgunbd.ttf")
            self.korean_font = "Malgun"
        else:
            self.korean_font = "Helvetica"

    def header(self):
        """페이지 헤더"""
        self.set_font(self.korean_font, "B", 16 if self.mode == "pro" else 20)
        self.cell(0, 10, self.model_name, align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font(self.korean_font, "", 10)
        self.cell(0, 5, "조립 설명서 - 부품 목록", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        """페이지 푸터"""
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Brick CoScientist | {datetime.now().strftime('%Y-%m-%d')}", align="C")


def generate_bom_pdf(
    model_name: str,
    bom_entries: list,
    total_parts: int,
    color_summary: dict,
    output_path: str,
    mode: str = "pro",
    age_group: Optional[str] = None
) -> str:
    """
    BOM PDF 생성

    Args:
        model_name: 모델 이름
        bom_entries: BOM 항목 리스트
        total_parts: 총 부품 수
        color_summary: 색상별 요약
        output_path: 출력 파일 경로
        mode: "pro" 또는 "kids"
        age_group: Kids 모드일 때 연령대 (예: "4-6")

    Returns:
        생성된 파일 경로
    """
    pdf = BomPDF(model_name, mode)
    pdf.add_page()

    # 폰트 크기 설정
    title_size = 14 if mode == "pro" else 18
    text_size = 10 if mode == "pro" else 14
    table_size = 9 if mode == "pro" else 12

    font = pdf.korean_font

    # Kids 모드 안내 메시지
    if mode == "kids" and age_group:
        pdf.set_fill_color(255, 243, 205)  # 노란 배경
        pdf.set_font(font, "B", 12)
        pdf.cell(0, 10, f"{age_group}세 - 어른과 함께 만들어요!", fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    # 요약 정보 박스
    pdf.set_fill_color(248, 249, 250)
    pdf.set_font(font, "B", title_size)
    pdf.cell(0, 10, "요약", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font(font, "", text_size)
    pdf.set_fill_color(248, 249, 250)
    pdf.cell(60, 8, f"총 부품 수: {total_parts}개", fill=True, new_x="RIGHT")
    pdf.cell(60, 8, f"부품 종류: {len(bom_entries)}종", fill=True, new_x="RIGHT")
    pdf.cell(0, 8, f"모드: {'Kids' if mode == 'kids' else 'Pro'}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # BOM 테이블
    pdf.set_font(font, "B", title_size)
    pdf.cell(0, 10, "부품 목록 (BOM)", new_x="LMARGIN", new_y="NEXT")

    # 테이블 헤더
    pdf.set_font(font, "B", table_size)
    pdf.set_fill_color(231, 76, 60)  # 빨간색
    pdf.set_text_color(255, 255, 255)

    col_widths = [80, 50, 30] if mode == "pro" else [70, 50, 40]
    pdf.cell(col_widths[0], 8, "파츠", border=1, fill=True, align="C")
    pdf.cell(col_widths[1], 8, "색상", border=1, fill=True, align="C")
    pdf.cell(col_widths[2], 8, "수량", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

    # 테이블 내용
    pdf.set_font(font, "", table_size)
    pdf.set_text_color(0, 0, 0)

    for i, entry in enumerate(bom_entries):
        # 줄 번갈아 배경색
        if i % 2 == 0:
            pdf.set_fill_color(255, 255, 255)
        else:
            pdf.set_fill_color(248, 249, 250)

        part_name = entry.get('part_name', entry.get('partName', 'Unknown'))
        color_name = entry.get('color_name', entry.get('colorName', 'Unknown'))
        count = entry.get('count', entry.get('qty', 0))

        pdf.cell(col_widths[0], 7, part_name, border=1, fill=True)
        pdf.cell(col_widths[1], 7, color_name, border=1, fill=True, align="C")
        pdf.cell(col_widths[2], 7, f"{count}개", border=1, fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(10)

    # 색상별 요약
    pdf.set_font(font, "B", title_size)
    pdf.cell(0, 10, "색상별 요약", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font(font, "", text_size)
    sorted_colors = sorted(color_summary.items(), key=lambda x: -x[1])

    for color, count in sorted_colors:
        pdf.cell(80, 6, f"  {color}:", new_x="RIGHT")
        pdf.cell(30, 6, f"{count}개", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(10)

    # 조립 안내
    pdf.set_fill_color(232, 244, 248)
    pdf.set_font(font, "B", text_size)
    pdf.cell(0, 8, "조립 안내", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font(font, "", text_size - 1)
    pdf.multi_cell(0, 6,
        "1. LDR 파일을 Studio 2.0에서 열어 조립 순서를 확인하세요.\n"
        "2. Layer 0 (바닥)부터 시작해서 위로 쌓아 올리세요.\n"
        "3. STEP 표시를 따라 단계별로 조립하세요.",
        fill=True
    )

    # PDF 저장
    pdf.output(output_path)
    print(f"PDF 생성 완료: {output_path}")

    return output_path


def generate_pdf_from_bom_report(bom_report, output_path: str, mode: str = "pro", age_group: Optional[str] = None) -> str:
    """
    BomReport 객체에서 PDF 생성

    bom_generator.py의 BomReport 또는 dict 사용 가능
    """
    # dict인 경우
    if isinstance(bom_report, dict):
        return generate_bom_pdf(
            model_name=bom_report.get('model_name', 'Unknown Model'),
            bom_entries=bom_report.get('entries', []),
            total_parts=bom_report.get('total_parts', 0),
            color_summary=bom_report.get('color_summary', {}),
            output_path=output_path,
            mode=mode,
            age_group=age_group
        )

    # BomReport dataclass인 경우
    entries = []
    for e in bom_report.entries:
        entries.append({
            'part_name': e.part_name,
            'color_name': e.color_name,
            'count': e.count
        })

    return generate_bom_pdf(
        model_name=bom_report.model_name,
        bom_entries=entries,
        total_parts=bom_report.total_parts,
        color_summary=bom_report.color_summary,
        output_path=output_path,
        mode=mode,
        age_group=age_group
    )


# ============================================
# 테스트
# ============================================

if __name__ == "__main__":
    # 테스트용 BOM 데이터
    test_bom = {
        "model_name": "Simple Tower",
        "total_parts": 17,
        "entries": [
            {"part_name": "Brick 2x4", "color_name": "Red", "count": 5},
            {"part_name": "Brick 2x4", "color_name": "Light Gray", "count": 2},
            {"part_name": "Brick 1x4", "color_name": "Red", "count": 4},
            {"part_name": "Brick 1x2", "color_name": "Red", "count": 2},
            {"part_name": "Slope 45 2x2", "color_name": "Brown", "count": 6},
        ],
        "color_summary": {
            "Red": 11,
            "Brown": 6,
            "Light Gray": 2
        }
    }

    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)

    # Pro 모드
    output_path = os.path.join(output_dir, "test_bom_pro.pdf")
    generate_pdf_from_bom_report(test_bom, output_path, mode="pro")

    # Kids 모드
    output_path_kids = os.path.join(output_dir, "test_bom_kids.pdf")
    generate_pdf_from_bom_report(test_bom, output_path_kids, mode="kids", age_group="4-6")

    print("\n테스트 완료!")
    print(f"Pro PDF: {output_path}")
    print(f"Kids PDF: {output_path_kids}")
