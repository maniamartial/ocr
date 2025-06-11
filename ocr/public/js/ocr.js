frappe.ui.form.on('Sales Order', {
  refresh: function(frm) {
    setTimeout(() => {
      let $toolbar = $(frm.fields_dict.items.grid.grid_buttons);
      if ($toolbar.find('.upload-pdf-button').length === 0) {
        let $btn = $(`
          <button class="btn btn-xs btn-primary upload-pdf-button" style="margin-left: 10px;">
            Upload PDF
          </button>
        `);

        $btn.on('click', function() {
          const file_input = $('<input type="file" accept="application/pdf" style="display:none">');

          file_input.on('change', function(e) {
            const file = e.target.files[0];

            if (file && file.type === "application/pdf") {
              const reader = new FileReader();

              reader.onload = function(event) {
                const result = event.target.result;
                const base64Data = result.split(',')[1]; // Strip off "data:application/pdf;base64,"

                // Make the frappe call here
                frappe.call({
                  method: "ocr.ocr.read_pdf.read_pdf.read_pdf_fetch_data",  // change path as needed
                  args: {
                    doctype: frm.doc.doctype,
                    docname: frm.doc.name,
                    filename: file.name,
                    filedata: base64Data,
                    is_private: 0
                  },
                  callback: function(r) {
                    if (!r.exc && r.message && r.message.data && r.message.data.length > 0) {
                      const items = r.message.data;
                      items.forEach(row => {
                        const child = frm.add_child("items", {
                          item_code: row["SKU"],
                          qty: row["Qty"],
                          rate: row["Unit Cost"],
                          amount: row["Amount Excl. VAT"]
                        });
                    });
                      frm.refresh_field("items");
                      frappe.show_alert({ message: "PDF uploaded!", indicator: 'green' });
                    }
                  }
                });
              };
              reader.readAsDataURL(file);
            } else {
              frappe.msgprint("Please select a valid PDF file.");
            }
          });

          file_input.trigger('click');
        });

        $toolbar.prepend($btn);
      }
    }, 300);
  }
});
