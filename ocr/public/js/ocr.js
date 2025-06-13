frappe.ui.form.on('Sales Order', {
  refresh: function(frm) {
    setTimeout(() => {
      let $toolbar = $(frm.fields_dict.items.grid.grid_buttons);
      if ($toolbar.find('.upload-pdf-button').length === 0) {
        let $btn = $(
          '<button class="btn btn-xs btn-primary upload-pdf-button" style="margin-left: 10px;">' +
          'Upload PDF (Debug)' +
          '</button>'
        );

        $btn.on('click', function() {
          const file_input = $('<input type="file" accept="application/pdf" style="display:none">');

          file_input.on('change', function(e) {
            const file = e.target.files[0];

            if (file && file.type === "application/pdf") {
              // Show loading message
              frappe.show_alert({ 
                message: "Processing PDF, please wait...", 
                indicator: 'blue' 
              });

              const reader = new FileReader();

              reader.onload = function(event) {
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
                  callback: function(r) {
                    console.log("Full response:", r);
                    
                    if (!r.exc && r.message) {
                      const response = r.message;
                      const items = response.data || [];
                      const debug_info = response.debug_info || {};

                      // Add items if any were found
                      if (items.length > 0) {
                        let added_count = 0;
                        items.forEach(row => {
                          try {
                            const child = frm.add_child("items", {
                              item_code: row["SKU"],
                              item_name: row["Product"],
                              qty: row["Qty"],
                              rate: row["Unit Cost"],
                              amount: row["Amount Excl. VAT"]
                            });
                            added_count++;
                          } catch (e) {
                            console.error("Error adding item:", row, e);
                          }
                        });
                        
                        frm.refresh_field("items");
                        
                        frappe.show_alert({ 
                          message: `Added ${added_count} items!`, 
                          indicator: 'green' 
                        });
                      } else {
                        frappe.show_alert({ 
                          message: "No items parsed - check debug info", 
                          indicator: 'orange' 
                        });
                      }
                      
                    } else {
                      frappe.show_alert({ 
                        message: "Error processing PDF", 
                        indicator: 'red' 
                      });
                      
                      console.error("PDF processing error:", r);
                    }
                  },
                  error: function(err) {
                    frappe.show_alert({ 
                      message: "Error processing PDF", 
                      indicator: 'red' 
                    });
                    console.error("PDF processing error:", err);
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