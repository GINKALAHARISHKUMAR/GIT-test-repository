/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/https', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/task'], function (https, record, search, format, runtime, task) {

    function createLog(id, quote, stordId) {
        var recordId = ''
        let result = search.create({
            type: "customrecord_order_log",
            filters:
                [
                    ["custrecord_externalid", "is", id]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        }).run().getRange(0, 1)
        if (result.length > 0) {
            recordId = result[0].getValue("internalid")
            return recordId
        } else {
            var recObj = record.create({ type: "customrecord_order_log", isDynamic: true })
            recObj.setValue("custrecord_externalid", id)
            recObj.setValue("custrecord_quote", quote)
            recObj.setValue("custrecord_stores", stordId)
            recordId = recObj.save()
            return recordId
        }

    }
    function createSalesOrder(header, lines, errObj,class_, loc,store) {
        try {
            // log.debug("Creating sales order")
            var otheritem = header.order_fees_attributes
            var salestax = header.sales_tax
            var subtotal = header.order_subtotal
            var discount = header.discount
            var customerid = getCustomer(header)
            var soRec = record.create({
                type: record.Type.SALES_ORDER,
                isDynamic: true
            })
            soRec.setValue("entity", customerid)
            soRec.setValue("class", class_)
            soRec.setValue("orderstatus", "B")
            soRec.setValue("location", loc)
            soRec.setValue("trandate", getDateSO(header.invoice_date))
            soRec.setText("custbody_printavo_status", header.orderstatus.name.toUpperCase());
            soRec.setValue("custbody_printavo_sales_tax", header.sales_tax)
            soRec.setValue("custbody_printavo_discount_as_per", header.discount_as_percentage)
            soRec.setValue("custbody_printavo_total_untaxed", header.total_untaxed)
            soRec.setValue("custbody_printavo_orderstatus_id", header.orderstatus_id)
            soRec.setValue("custbody_printavo_quote_no", '#' + header.visual_id)
            soRec.setValue("otherrefnum", header.visual_po_number)
            soRec.setValue("custbody_externalid", header.id)
            soRec.setValue("custbody_created_at", getDate(header.created_at))
            soRec.setValue("custbody_updated_at", getDate(header.updated_at))

            for (var j = 0; j < lines.length; j++) {
                soRec.selectNewLine({ sublistId: 'item' });
                var itemName = lines[j].category
                log.debug("Item Name", itemName)
                if (!itemName) {
                    itemName = "Missing Printavo Category"
                }
                var description = lines[j].style_description
                if (description) {
                    description = description.substring(0, 298)
                }
                soRec.setCurrentSublistText({ sublistId: 'item', fieldId: 'item', text: itemName.trim() });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: lines[j].total_quantities });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: lines[j].unit_cost });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_item', value: lines[j].style_number });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_color', value: lines[j].color });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_description', value: description });
                //soRec.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_rxd_printavo_size_xs',value: lines[j].total_quantities});
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_size_s', value: lines[j].size_s });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_size_m', value: lines[j].size_m });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_size_l', value: lines[j].size_l });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_size_xl', value: lines[j].size_xl });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_size_2xl', value: lines[j].size_2xl });
                soRec.commitLine({ sublistId: 'item' })
            }
            if (otheritem.length != 0 || otheritem != '') {
                soRec.selectNewLine({ sublistId: 'item' });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 72423 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_rxd_printavo_description', value: otheritem[0].description });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: otheritem[0].amount });


                soRec.commitLine({ sublistId: 'item' })

            }
            if (salestax > 0) {
                var acc = 1326987
                if(store == 3){
                    acc = 1326986
                }
                var taxtotal = (subtotal * salestax) / 100;
                soRec.selectNewLine({ sublistId: 'item' });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: Number(acc) });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: taxtotal });

                soRec.commitLine({ sublistId: 'item' })
            }
            if (discount > 0) {
                soRec.selectNewLine({ sublistId: 'item' });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 75164 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
                soRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: discount * -1 });

                soRec.commitLine({ sublistId: 'item' })
            }
            try {
                var so = soRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                log.debug("Sales order Created", so)
                if (so) {
                    record.submitFields({
                        type: 'customrecord_order_log',
                        id: errObj,
                        values: {
                            'custrecord_printavo_status': '2',
                            'custrecord_error_message': '',
                            'custrecord_so_id': so
                        }
                    });
                }
            } catch (e) {
                log.debug("error", e)
                var otherId = record.submitFields({
                    type: 'customrecord_order_log',
                    id: errObj,
                    values: {
                        'custrecord_printavo_status': '1',
                        'custrecord_error_message': e.message
                    }
                });
            }
            if (so) {
                var objInvoice = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: so,
                    toType: record.Type.INVOICE,
                    isDynamic: true
                });
                objInvoice.setValue('otherrefnum', header.visual_po_number)
                objInvoice.setValue('custbody_externalid', header.id)
                objInvoice.setValue("trandate", getDateSO(header.invoice_date))
                var invId = objInvoice.save();
                log.debug("Invoice Id", invId)
                if (invId) {
                    record.submitFields({
                        type: 'customrecord_order_log',
                        id: errObj,
                        values: {
                            'custrecord_printavo_status': '2',
                            'custrecord_error_message': '',
                            'custrecord_invoice_id': invId
                        }
                    });
                }
            }
        } catch (e) {
            log.debug("Create Sales Order:Error", e)
            var otherId = record.submitFields({
                type: 'customrecord_order_log',
                id: errObj,
                values: {
                    'custrecord_printavo_status': '1',
                    'custrecord_error_message': e.message
                }
            });
        }
    }

    function getCustomer(data, errObj) {
        var email = data.customer.email
        var company = data.customer.company
        var filter = []
        if (company == "") {
            filter.push(["email", "is", email])
        }
        else {
            filter.push(["companyname", "startswith", company.trim()])
            filter.push("AND")
            filter.push(["isperson", "is", "F"])
        }

        var customerSearchObj = search.create({
            type: "customer",
            filters:filter,
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" }),
                    search.createColumn({ name: "altname", label: "Name" }),
                    search.createColumn({ name: "custentity_printavo_cust_id", label: "Printavo Customer ID " })
                ]
        });
        var ser = customerSearchObj.run().getRange(0, 1)
        if (ser.length != 0) {
            return ser[0].getValue('internalid')
        } else {
            return;
        }

    }

    function createCustomer(data, errObj) {
        try {
            var company = data.customer.company
            log.debug("data", data)
            // log.debug("id", data.order_addresses_attributes[0].country)
            var customerec = record.create({
                type: 'customer',
                isDynamic: true
            });
            customerec.setValue('custentity_printavo_cust_id', data.customer_id)
            customerec.setValue('entityid', data.customer_id)
            //customerec.setValue('category', 5)
            customerec.setValue('custentity_rxd_sales_channel', 2)
            if (company == "") {
                var email = data.customer.email
                if (email) {
                    email = email.split(',')[0]
                }
                customerec.setValue('firstname', data.customer.first_name);
                customerec.setValue('lastname', data.customer.last_name);
                customerec.setValue('isperson', 'T');
                customerec.setValue('email', email);
            } else {
                customerec.setValue('companyname', company);
                customerec.setValue('isperson', 'F');
            }
            customerec.setValue('entitystatus', 13);
            //customerec.setText('subsidiary', '01-Skylo Technologies Inc');
          
           
            customerec.setValue('subsidiary', 1);

            customerec.selectNewLine({
                sublistId: 'addressbook'

            })

            customerec.setCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'defaultbilling',
                value: true
            });

            customerec.setCurrentSublistValue({
                sublistId: 'addressbook',
                fieldId: 'defaultshipping',
                value: true
            });

            var addrSubrecord = customerec.getCurrentSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress'

            })

            addrSubrecord.setValue('country', data.order_addresses_attributes[0].country);
            addrSubrecord.setValue('addr1', data.order_addresses_attributes[0].address1);
            addrSubrecord.setValue('addr2', data.order_addresses_attributes[0].address2);
            addrSubrecord.setText('city', data.order_addresses_attributes[0].city);
            addrSubrecord.setText('state', data.order_addresses_attributes[0].state);
            addrSubrecord.setValue('zip', data.order_addresses_attributes[0].zip);

            customerec.commitLine({
                sublistId: 'addressbook'
            })

            var customerid = customerec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug("Cutomer ID", customerid)
        } catch (e) {
            log.debug("CreateCustomer:Err", e)
            var otherId = record.submitFields({
                type: 'customrecord_order_log',
                id: errObj,
                values: {
                    'custrecord_printavo_status': '1',
                    'custrecord_error_message': e.message
                }
            });
        }

    }

    function getDate(date) {
        var dd = date.substring(8, 10);
        var mm = date.substring(5, 7);
        var yyyy = date.substring(0, 4);
        var time = date.substring(11, 19);
        var fulldate = mm + '/' + dd + '/' + yyyy + ' ' + time
        return fulldate
    }

    function getDateSO(date) {
        var dd = date.substring(8, 10);
        var mm = date.substring(5, 7);
        var yyyy = date.substring(0, 4);

        var fulldate = mm + '/' + dd + '/' + yyyy
        //log.debug("fulldate",fulldate)
        var parsedDate = format.parse({
            value: fulldate,
            type: format.Type.DATE
        });
        return parsedDate
    }

    return {
        createSalesOrder:createSalesOrder,
        getDate:getDate,
        createCustomer:createCustomer,
        getCustomer:getCustomer,
        getDateSO:getDateSO,
        createLog:createLog
    }

})