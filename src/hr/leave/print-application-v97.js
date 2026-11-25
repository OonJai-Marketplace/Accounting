  function leaveRequestHtml459(data={},employee={}) {
    const esc=escape,line=(value='',width='100%')=>'<span style="display:inline-block;min-height:6mm;border-bottom:1px solid #555;box-sizing:border-box;max-width:100%;width:'+width+';vertical-align:bottom;padding:0 2mm">'+esc(String(value||''))+'</span>';
    const tick=yes=>'<span style="display:inline-block;border:1px solid #444;width:3mm;height:3mm;line-height:3mm;text-align:center;font-family:Arial;font-size:9pt;vertical-align:middle">'+(yes?'✓':'')+'</span>';
    const yn=value=>tick(value==='yes')+' Y &nbsp; '+tick(value==='no')+' N';
    const date=value=>value?formatAppDate(value):'';
    const kind=data.type==='minorSick'?'sick':data.type;
    const other=['personal','other'].includes(kind),unpaid=kind==='absent'||kind==='unpaid';
    const detail=other&&kind==='personal'?'Personal leave'+(data.notes?' — '+data.notes:''):data.notes||'';
    const row=(label,value)=>'<div style="display:flex;align-items:baseline;gap:4mm;margin-bottom:3mm"><strong style="width:43mm;flex-shrink:0">'+label+'</strong><div style="flex:1">'+value+'</div></div>';
    const signature=(label,dateValue)=>'<div style="display:flex;align-items:baseline;gap:3mm;margin-top:6mm"><strong>'+label+'</strong><span style="flex:1;border-bottom:1px solid #555;min-height:7mm"></span><strong style="margin-left:12mm">Date:</strong>'+line(date(dateValue),'32mm')+'</div>';
    const header=typeof PrintSettings!=='undefined'&&PrintSettings.headerImage?'':'<div style="text-align:center;color:#287b69;margin:0 0 3mm"><strong style="font:700 24pt Arial">OON JAI FOUNDATION</strong><p style="font:10pt Arial;margin:2mm 0">Where Health, Education, and Farming create a sustainable tomorrow.</p></div>';
    return '<div data-leave-form-page="1" style="overflow-wrap:anywhere;font-family:Times New Roman;font-size:10.5pt;line-height:1.24;color:#222">'+header+'<h1 style="text-align:center;font-family:Times New Roman;font-size:17pt;margin:3mm 0 5mm">LEAVE REQUEST FORM</h1>'+row('Employee’s Name:',line(employee.name))+row('Dates Requested','<div style="display:flex;gap:3mm"><strong>From:</strong>'+line(date(data.from))+'</div><div style="display:flex;gap:8mm;margin-top:4mm"><strong>To:</strong>'+line(date(data.to))+'</div>')+'<p style="margin:4mm 0 4mm"><strong>Type of Absence Requested:</strong></p><div style="display:flex;justify-content:space-between;gap:3mm">'+[['Sick',kind==='sick'],['Vacation',kind==='vacation'],['Time without pay',unpaid],['Bereavement',kind==='bereavement'],['Other',other]].map(([label,checked])=>'<span>'+tick(checked)+' '+label+'</span>').join('')+'</div><div style="margin-top:5mm"><strong>Reason for leave:</strong> '+line(detail)+'<div style="min-height:6mm;border-bottom:1px solid #555"></div></div><div style="display:flex;gap:3mm;margin:4mm 0"><strong style="white-space:nowrap">Time off accrued/used:</strong>'+line(data.timeOff459||(data.days?data.days+' day(s) requested':''))+'</div><p style="margin:4mm 0">I have checked with my supervisor and there’s sufficient coverage for my absence. &nbsp; '+yn(data.coverage459)+'</p><p style="margin:4mm 0">I have enough time for the time I have requested. &nbsp; '+yn(data.enoughTime459)+'</p>'+signature('Employee’s Signature:',data.employeeDate459)+signature('Supervisor Signature:',data.supervisorDate459)+'<p style="margin:1mm 0 4mm"><strong>Approved:</strong> '+yn(data.status==='approved'?'yes':data.rejected?'no':'')+'</p><strong>Comments:</strong>'+line(data.supervisorComments459||'')+Array.from({length:2},()=>'<div style="min-height:5mm;border-bottom:1px solid #555"></div>').join('')+'</div>';
  }
  window.leaveRequestHtml459=leaveRequestHtml459;
  function printLeaveApplication(id) {
    const record=(Work82.leaves||[]).find(item=>item.id===id),data=record?.data||{};
    const employee=Work82.employees.find(item=>item.id===data.employeeId)?.data||{};
    return openLeavePrint(data,employee);
  }
  window.printHubLeaveRequest=function(r){
    const data={...r.form_details,employeeId:r.employee_id,type:r.kind,from:r.starts,to:r.ends,days:1+(Date.parse(r.ends)-Date.parse(r.starts))/86400000,notes:r.reason,status:'pending'};
    return openLeavePrint(data,{name:r.submitted_name});
  };
  function openLeavePrint(data,employee){
    return window.openDocumentEditor105({title:'Leave Request Form',category:'Human Resources',employeeId:data.employeeId||'',printPreview:true,leaveRequest459:true,source:'hr-leave',reportSignatories275:{reportSignatories275:true,enabled:false,signers:[]},html:leaveRequestHtml459(data,employee),settings:{paper:'A4',orientation:'portrait',font:'Times New Roman',size:10.5,line:1.24,top:9,right:14,bottom:9,left:14,headerGap:2,footerGap:2,showBusinessName:false,pageNumbers:false,headerPlacement:'first',footerPlacement:'all',applyHeader:true,applyFooter:true}});
  }
