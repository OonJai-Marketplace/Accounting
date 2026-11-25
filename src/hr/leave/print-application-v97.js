  function leaveRequestHtml459(data={},employee={}) {
    const text=value=>escape(String(value??'')).replace(/\r\n?|\n/g,'<br>');
    const date=value=>value?formatAppDate(value):'';
    const kind=data.type==='minorSick'?'sick':data.type;
    const reason=kind==='personal'?['Personal leave',data.notes].filter(Boolean).join(' — '):data.notes;
    const rule='border-bottom:1px solid #535c56;box-sizing:border-box;min-width:0;overflow-wrap:anywhere;white-space:pre-wrap';
    const label=value=>'<strong style="font-size:13pt;font-weight:700">'+value.toUpperCase()+'</strong>';
    const valueLine=value=>'<span style="flex:1;min-height:6mm;padding:0 1mm;'+rule+'">'+text(value)+'</span>';
    const row=(name,body)=>'<div style="display:flex;align-items:baseline;gap:3mm;margin:7mm 0">'+label(name)+body+'</div>';
    const tick=(checked,caption)=>'<span style="white-space:nowrap"><span style="display:inline-block;width:4.5mm;height:4.5mm;box-sizing:border-box;border:1px solid #344038;text-align:center;vertical-align:middle;line-height:4mm;font-family:Arial;font-size:11pt">'+(checked?'✓':'')+'</span> '+caption+'</span>';
    const yesNo=value=>'<span style="display:flex;gap:5mm;align-items:baseline;font-weight:700">'+tick(value==='yes','Yes')+tick(value==='no','No')+'</span>';
    const declaration=(message,value)=>'<div style="display:flex;align-items:baseline;gap:4mm;margin:4mm 0;font-weight:700"><span style="flex:1">'+message+'</span>'+yesNo(value)+'</div>';
    const writing=(name,value,extra=true)=>'<div style="margin:7mm 0">'+label(name)+'<div style="min-height:10mm;padding:1mm 0;'+rule+'">'+text(value)+'</div>'+(extra?'<div style="min-height:9mm;'+rule+'"></div>':'')+'</div>';
    const signature=(name,signedDate)=>'<div style="display:flex;align-items:baseline;gap:3mm;margin:2mm 0">'+label(name)+'<span style="flex:1;min-height:18mm;'+rule+'"></span>'+label('Date:')+'<span style="width:32mm;min-height:6mm;'+rule+'">'+text(date(signedDate))+'</span></div>';
    const types=[['Sick',kind==='sick'],['Vacation',kind==='vacation'],['Time without pay',['absent','unpaid'].includes(kind)],['Bereavement',kind==='bereavement'],['Other',['personal','other'].includes(kind)]];
    return '<div data-leave-form-page="1" style="font-family:Arial;font-size:12pt;line-height:1.3;color:#151715;overflow-wrap:anywhere">'+
      '<div style="text-align:left;font-family:Georgia;font-size:34pt;line-height:1.1;margin:0 0 9mm"><strong>Leave Request Form</strong></div>'+
      row('Employee’s name:',valueLine(employee.name))+
      row('Dates requested:',label('From:')+valueLine(date(data.from))+label('To:')+valueLine(date(data.to)))+
      label('Type of absence:')+'<div style="display:flex;justify-content:space-between;gap:2mm;margin:4mm 0;font-weight:700">'+types.map(([caption,checked])=>tick(checked,caption)).join('')+'</div>'+
      writing('Reason for leave:',reason)+writing('Time off accrued / used:',data.timeOff459||(data.days?data.days+' day(s) requested':''),false)+
      declaration('I have checked with my supervisor and there is sufficient coverage for my absence.',data.coverage459)+
      declaration('I have enough leave time for the dates requested.',data.enoughTime459)+
      signature('Employee’s Signature:',data.employeeDate459)+signature('Supervisor Signature:',data.supervisorDate459)+
      row('Approved:',yesNo(data.status==='approved'?'yes':data.rejected?'no':''))+writing('Comments:',data.supervisorComments459)+'</div>';
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
    return window.openDocumentEditor105({title:'Leave Request Form',category:'Human Resources',employeeId:data.employeeId||'',printPreview:true,leaveRequest459:true,source:'hr-leave',reportSignatories275:{reportSignatories275:true,enabled:false,signers:[]},html:leaveRequestHtml459(data,employee),settings:{paper:'A4',orientation:'portrait',font:'Times New Roman',size:10.5,line:1.24,top:13,right:10,bottom:12,left:10,headerGap:2,footerGap:2,showBusinessName:false,pageNumbers:false,headerPlacement:'none',footerPlacement:'none',applyHeader:false,applyFooter:false,headerImage:'',footerImage:''}});
  }
