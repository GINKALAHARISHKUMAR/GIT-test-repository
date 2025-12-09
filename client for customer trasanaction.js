/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(["N/url"], function(url) {

    // function pageInit(context) {
        
    // }

    // function saveRecord(context) {
        
    // }

    // function validateField(context) {
        
    // }

   function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        var fieldId = context.fieldId;

        if (fieldId === 'custpage_customer') {
            var customerId = currentRecord.getValue('custpage_customer');

            if (customerId) {
                var suiteletUrl = url.resolveScript({
                    scriptId: 'customscript3232',
                    deploymentId: 'customdeploy1',
                    params: {
                        type: customerId  // only customer ID
                    }
                });

                window.location.href = suiteletUrl;
            }
        }
    }

    // function postSourcing(context) {
        
    // }

    // function lineInit(context) {
        
    // }

    // function validateDelete(context) {
        
    // }

    // function validateInsert(context) {
        
    // }

    // function validateLine(context) {
        
    // }

    // function sublistChanged(context) {
        
    // }
  function ButtonClick(context){
    //alert("button triggered")
     var file = url.resolveScript({
                    scriptId: 'customscript3232',
                    deploymentId: 'customdeploy1',
                    params: {
                        file1: true  // only customer ID
                    }
                });
    window.open(file, '_self');
  }

    return {
        // pageInit: pageInit,
        // saveRecord: saveRecord,
        // validateField: validateField,
        fieldChanged: fieldChanged,
      ButtonClick:ButtonClick
        // postSourcing: postSourcing,
        // lineInit: lineInit,
        // validateDelete: validateDelete,
        // validateInsert: validateInsert,
        // validateLine: validateLine,
        // sublistChanged: sublistChanged
    }
});
