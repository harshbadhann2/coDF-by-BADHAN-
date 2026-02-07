import sys
from pdf2docx import Converter

def convert_pdf_to_docx(pdf_file, docx_file):
    cv = Converter(pdf_file)
    cv.convert(docx_file)
    cv.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_docx.py <input_pdf> <output_docx>")
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    try:
        convert_pdf_to_docx(input_pdf, output_docx)
        print(f"Successfully converted {input_pdf} to {output_docx}")
    except Exception as e:
        print(f"Error converting {input_pdf}: {e}")
        sys.exit(1)
