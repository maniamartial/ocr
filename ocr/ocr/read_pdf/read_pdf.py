import frappe
import base64
import io
from PyPDF2 import PdfReader

@frappe.whitelist()
def read_pdf_fetch_data(doctype=None, docname=None, filename=None, filedata=None, is_private=0):
    if not filedata:
        frappe.throw("File data not received. Please try again.")

    try:
        file_content = base64.b64decode(filedata)

        # Save the file (optional)
        _file = frappe.get_doc({
            "doctype": "File",
            "file_name": filename,
            "attached_to_doctype": doctype,
            "attached_to_name": docname,
            "is_private": is_private,
            "content": file_content,
        })
        _file.save()
        frappe.db.commit()

        # Extract PDF text
        reader = PdfReader(io.BytesIO(file_content))
        text = ''
        for page in reader.pages:
            text += page.extract_text() or ''
        
        lines = [line.strip() for line in text.splitlines() if line.strip().isdigit() or line.strip() != ""]
        
        data = []
        i = 0
        while i < len(lines):
            if lines[i].isdigit():  # starts with No.
                try:
                    item = {
                        "No": int(lines[i]),
                        "SKU": lines[i+1],
                        "Barcode": lines[i+2],
                        "Product": lines[i+3] + " " + lines[i+4],
                        "Qty": int(lines[i+5]),
                        "Unit Cost": float(lines[i+6]),
                        "Cost": float(lines[i+7]),
                        "Amount Excl. VAT": float(lines[i+8]),
                        "Discount": lines[i+9],
                        "VAT Amount": float(lines[i+10]),
                        "Amount Incl. VAT": float(lines[i+11])
                    }
                    data.append(item)
                    i += 12
                except Exception as e:
                    frappe.log_error(frappe.get_traceback(), "PDF Item Parsing Error")
                    i += 1  # skip and move on to prevent infinite loop
            else:
                i += 1  # skip unrecognized lines

        return {
            "message": "PDF uploaded and parsed.",
            "text": text,
            "file_url": _file.file_url,
            "data": data
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PDF Processing Error")
        frappe.throw(f"Error processing PDF: {str(e)}")