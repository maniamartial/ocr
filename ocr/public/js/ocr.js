frappe.ui.form.on('Sales Order', {
  refresh: function(frm) {
    setTimeout(() => {
      let $grid_wrapper = frm.fields_dict.items.grid.wrapper;

      
      let $footer_buttons = $($grid_wrapper).find('.grid-footer .grid-buttons');

      if ($footer_buttons.length && $footer_buttons.find('.upload-pdf-button').length === 0) {
        const $btn = $(`
          <button class="btn btn-xs btn-secondary upload-pdf-button" style="float: right;position: absolute;
            right: 0;margin-right: 160px;">
            Upload PDF
          </button>
        `);

        $btn.on('click', function () {
          const file_input = $('<input type="file" accept="application/pdf" style="display:none">');

          file_input.on('change', function (e) {
            const file = e.target.files[0];

            if (file && file.type === "application/pdf") {
              frappe.show_alert({
                message: "Processing PDF, please wait...",
                indicator: 'blue'
              });

              const reader = new FileReader();

              reader.onload = function (event) {
                const result = event.target.result;
                const base64Data = result.split(',')[1];

                frappe.call({
                  method: "ocr.ocr.read_pdf.read_pdf.read_pdf_fetch_data",
                  args: {
                    doctype: frm.doc.doctype,
                    docname: frm.doc.name,
                    filename: file.name,
                    filedata: base64Data,
                    is_private: 0
                  },
                  callback: function (r) {
                    if (!r.exc && r.message) {
                      const items = r.message.data || [];
                      frm.clear_table("items");

                      let added = 0;

                      items.forEach(row => {
                        try {
                          frm.add_child("items", {
                            item_code: row["SKU"],
                            item_name: row["Product"],
                            qty: row["Qty"],
                            rate: row["Unit Cost"],
                            amount: row["Amount Excl. VAT"],
                            uom: "Box"
                          });
                          added++;
                        } catch (e) {
                          console.warn("Invalid row skipped:", row);
                        }
                      });

                      frm.refresh_field("items");
                      frappe.show_alert({ message: `Added ${added} items!`, indicator: 'green' });
                    } else {
                      frappe.show_alert({ message: "No items parsed.", indicator: 'orange' });
                    }
                  },
                  error: function () {
                    frappe.show_alert({ message: "Server error.", indicator: 'red' });
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

        $footer_buttons.append($btn);
      }
    }, 300);
  }
});
