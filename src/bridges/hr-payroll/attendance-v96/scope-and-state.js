/* Payroll groups, attendance legend and day-level exceptions. */
(function(){
'use strict';
function payrollOrder14337(a,b){const rank=c=>c==='USD'?0:c==='LAK'?2:1;return rank(a.employee?.currency||a.currency)-rank(b.employee?.currency||b.currency)||String(a.employee?.currency||a.currency).localeCompare(String(b.employee?.currency||b.currency))||Number(b.employee?.salary||b.contract||0)-Number(a.employee?.salary||a.contract||0)||String(a.employee?.name).localeCompare(String(b.employee?.name));}
const esc=esc82, money=money82;
const ui={open:{},drafts:{},leaveOpen:false,leaveDirty:false,leaveDraft:null,leaveTimer:null,search:'',owner:null};
const legendDefaults=[
 {code:'H',description:'Paid holiday',method:'percent',value:0,currency:'LAK',leaveType:'',lateMode:'exempt',color:'#166534'},
 {code:'L',description:'Paid leave',method:'percent',value:0,currency:'LAK',leaveType:'vacation',lateMode:'exempt',color:'#1d4ed8'},
 {code:'A',description:'Unpaid absence',method:'percent',value:100,currency:'LAK',leaveType:'',lateMode:'exempt',color:'#b91c1c'},
 {code:'MTT',description:'Reported missed time tracking',method:'fixed',value:5000,currency:'LAK',leaveType:'',lateMode:'exempt',color:'#92400e'},
 {code:'MMT',description:'Unreported missed time tracking',method:'fixed',value:10000,currency:'LAK',leaveType:'',lateMode:'exempt',color:'#b91c1c'},
 {code:'EX',description:'Excused late minutes',method:'percent',value:0,currency:'LAK',leaveType:'',lateMode:'exempt',color:'#166534'}
];
