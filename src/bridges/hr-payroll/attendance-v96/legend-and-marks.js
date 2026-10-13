function legends(){return ApplicationSettings.payroll.attendanceLegend95||structuredClone(legendDefaults)}
function number(v,label){const n=Number(v??0);if(!Number.isFinite(n)||n<0)throw Error(label+' must be zero or a positive number.');return n}
function mark(a){return String(a?.mark95??a?.late??0).trim().toUpperCase()||'0'}
function parseMark(value,rules=legends()){
 const v=String(value).trim().toUpperCase()||'0';if(/^\d+(?:\.\d+)?$/.test(v)){const minutes=Number(v);if(minutes>1440)throw Error('Late minutes cannot exceed 1,440 per day.');return {minutes,rule:null}}
 const [code,mins,...rest]=v.split(':');const rule=rules.find(r=>r.code===code);if(!rule||rest.length||mins!==undefined&&!/^\d+(?:\.\d+)?$/.test(mins))throw Error('Use minutes or a configured code, such as H, MTT or EX:60.');const minutes=Number(mins||0);if(minutes>1440)throw Error('Late minutes cannot exceed 1,440 per day.');return {minutes,rule};
}
