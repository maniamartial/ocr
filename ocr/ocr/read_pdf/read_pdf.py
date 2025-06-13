import frappe
import base64
import io
import openpyxl
import pdfplumber

@frappe.whitelist()
def read_pdf_fetch_data(doctype=None, docname=None, filename=None, filedata=None, is_private=0):
    """Main function to handle PDF to Excel conversion"""
    if not filedata:
        frappe.throw("File data not received.")

    try:
        pdf_io = _get_pdf_io(filedata)
        wb, data_rows = _extract_pdf_data(pdf_io)
        file_doc = _save_excel_file(wb, filename, doctype, docname, is_private)
        structured_items = _structure_item_data(data_rows)
        
        return {
            "message": "PDF converted and parsed.",
            "file_url": file_doc.file_url,
            "data": structured_items
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PDF Excel Conversion Error")
        frappe.throw(f"Error processing file: {str(e)}")

def _get_pdf_io(filedata):
    """Convert base64 filedata to PDF IO stream"""
    pdf_bytes = base64.b64decode(filedata)
    return io.BytesIO(pdf_bytes)

def _extract_pdf_data(pdf_io):
    """Extract tables from PDF and return workbook with data"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Item Table"
    
    start_found = False
    headers = []
    data_rows = []

    with pdfplumber.open(pdf_io) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()

            for table_index, table in enumerate(tables):
                if page_num == 0 and table_index == 0:
                    continue  

                for row in table:
                    if not any(row):
                        continue

                    row = [(cell or "").strip() for cell in row]
                    
                    # Header detection
                    if not start_found and row[0].lower().startswith("no"):
                        headers = row
                        ws.append(headers)
                        start_found = True
                        continue  

                    processed_row = _process_data_row(row)
                    if processed_row:
                        ws.append(processed_row)
                        data_rows.append(processed_row)

    if not headers or not data_rows:
        frappe.throw("No valid item table found in the PDF.")

    return wb, data_rows

def _process_data_row(row):
    """Clean and validate a single data row"""
    if not row[0].isdigit() and len(row) > 1 and row[1].isdigit():
        row = row[1:]  

    if len(row) >= 12:
        return row[:12]
    frappe.log_error(f"Skipping malformed row: {row}", "PDF Table Row Alignment Issue")
    return None

def _save_excel_file(wb, filename, doctype, docname, is_private):
    """Save Excel workbook to ERPNext File"""
    excel_io = io.BytesIO()
    wb.save(excel_io)
    excel_io.seek(0)

    xlsx_filename = filename.replace(".pdf", ".xlsx")
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": xlsx_filename,
        "attached_to_doctype": doctype,
        "attached_to_name": docname,
        "is_private": is_private,
        "content": excel_io.read()
    })
    file_doc.save()
    frappe.db.commit()
    return file_doc

def _structure_item_data(data_rows):
    """Convert raw data rows to structured items"""
    structured_items = []
    for row in data_rows:
        try:
            structured_items.append({
                "No": row[0],
                "SKU": row[1],
                "Barcode": row[3],
                "Product": row[4],
                "Qty": float(row[5]),
                "Unit Cost": float(row[6]),
                "Disc Amt": float(row[7]),
                "Amount Excl. VAT": float(row[8]),
                "VAT %": row[9],
                "VAT Amt": float(row[10]),
                "Amount Incl. VAT": float(row[11]),
            })
        except Exception:
            continue
    return structured_items

