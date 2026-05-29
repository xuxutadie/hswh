import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / ".vendor"))

import pdfplumber


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "src" / "data"

JUDGE_OPTIONS = {
    "A": "正确",
    "B": "错误",
}


def normalize_line(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\u00a0", " ")).strip()


def normalize_multiline(text: str) -> str:
    lines = [normalize_line(line) for line in (text or "").splitlines()]
    return "\n".join(line for line in lines if line)


def parse_section_type(header_row) -> str | None:
    header_text = " ".join(normalize_line(cell or "") for cell in header_row if cell)
    if "单选" in header_text:
        return "single"
    if "多选" in header_text:
        return "multiple"
    if "判断" in header_text:
        return "judge"
    return None


def parse_selection_content(content: str):
    lines = [normalize_line(line) for line in content.splitlines() if normalize_line(line)]
    question_lines = []
    options: dict[str, str] = {}
    current_key = None

    for line in lines:
        option_match = re.match(r"^([A-D])\.\s*(.*)$", line)
        if option_match:
            current_key = option_match.group(1)
            options[current_key] = option_match.group(2).strip()
            continue

        if current_key:
            options[current_key] = f"{options[current_key]} {line}".strip()
        else:
            question_lines.append(line)

    return " ".join(question_lines).strip(), options


def finalize_question(buffer, grade: str, id_counter: int):
    content = "\n".join(part for part in buffer["content_parts"] if part).strip()
    explanation = "\n".join(part for part in buffer["explanation_parts"] if part).strip()

    if buffer["section"] == "judge":
        answer_raw = normalize_line(buffer["answer_raw"])
        answer = ["A" if answer_raw == "√" else "B"]
        return {
            "id": f"{grade}_{id_counter}",
            "grade": grade,
            "type": "judge",
            "question": " ".join(content.split()),
            "options": JUDGE_OPTIONS,
            "answer": answer,
            "explanation": " ".join(explanation.split()) if explanation else None,
        }

    answer = list(re.sub(r"[^A-D]", "", normalize_line(buffer["answer_raw"])))
    question, options = parse_selection_content(content)

    return {
        "id": f"{grade}_{id_counter}",
        "grade": grade,
        "type": "multiple" if len(answer) > 1 else "single",
        "question": question,
        "options": options,
        "answer": answer,
    }


def parse_pdf(pdf_name: str, grade: str):
    pdf_path = DATA_DIR / pdf_name
    questions = []
    current_section = None
    current_buffer = None
    id_counter = 1

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                if not table:
                    continue

                section = parse_section_type(table[0])
                if section:
                    current_section = section
                    rows = table[1:]
                else:
                    rows = table

                if not current_section:
                    continue

                for row in rows:
                    cells = [normalize_multiline(cell or "") for cell in row]
                    if not any(cells):
                        continue

                    seq = normalize_line(cells[0]) if len(cells) > 0 else ""
                    content = cells[1] if len(cells) > 1 else ""
                    answer = cells[2] if len(cells) > 2 else ""
                    explanation = cells[3] if len(cells) > 3 else ""

                    if seq.isdigit():
                        if current_buffer:
                            question = finalize_question(current_buffer, grade, id_counter)
                            if question["question"] and question["answer"]:
                                questions.append(question)
                                id_counter += 1

                        current_buffer = {
                            "section": current_section,
                            "content_parts": [content] if content else [],
                            "answer_raw": answer,
                            "explanation_parts": [explanation] if explanation else [],
                        }
                        continue

                    if not current_buffer:
                        continue

                    if content:
                        current_buffer["content_parts"].append(content)
                    if answer:
                        current_buffer["answer_raw"] = f"{current_buffer['answer_raw']} {answer}".strip()
                    if explanation:
                        current_buffer["explanation_parts"].append(explanation)

    if current_buffer:
        question = finalize_question(current_buffer, grade, id_counter)
        if question["question"] and question["answer"]:
            questions.append(question)

    return questions


def main():
    p13 = parse_pdf("小学1-3年级.pdf", "primary_1_3")
    p46 = parse_pdf("小学高年级组.pdf", "primary_4_6")
    junior = parse_pdf("初中组.pdf", "junior_high")
    all_questions = [*p13, *p46, *junior]

    (DATA_DIR / "p13_questions.json").write_text(
        json.dumps(p13, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (DATA_DIR / "parsed_questions.json").write_text(
        json.dumps(all_questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Parsed {len(p13)} primary_1_3 questions")
    print(f"Parsed {len(p46)} primary_4_6 questions")
    print(f"Parsed {len(junior)} junior_high questions")
    print(f"Parsed total {len(all_questions)} questions")


if __name__ == "__main__":
    main()
