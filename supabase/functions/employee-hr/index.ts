import { hashPassword, verifyPassword } from 'npm:@better-auth/utils@0.5.1/password';
import { administrator,createClient } from '../_shared/security14320.ts';

import { ClockError, clockRpc, signedClockPhoto, submitClock, validId } from './clock.ts';
import { portalBalances } from './portal-ledger.js';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://oonjai-marketplace.github.io','https://hub.oonjai.invalid','https://hr.oonjai.invalid','https://accounting.oonjai.invalid',
  ...(Deno.env.get('APP_ORIGINS')||Deno.env.get('APP_ORIGIN')||'').split(',').map(v=>v.trim())]);
const hex=(v:Uint8Array)=>Array.from(v,b=>b.toString(16).padStart(2,'0')).join('');
async function digest(v:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));}
const uuid=(v:unknown)=>typeof v==='string'&&/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v);
const email=(v:unknown)=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(v);
const missingHash='0'.repeat(32)+':'+'0'.repeat(128);
const denied='Email or password is incorrect, or HR access is unavailable.';
async function body(req:Request){
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')||!req.body)throw Error();
  const reader=req.body.getReader(),decoder=new TextDecoder();let n=0,s='';
  for(;;){const {done,value}=await reader.read();if(done)break;n+=value.length;
    if(n>16384){await reader.cancel();throw Error();}s+=decoder.decode(value,{stream:true});}
  const b=JSON.parse(s+decoder.decode());if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;
}
Deno.serve(async req=>{
  const origin=req.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    'Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:'null','Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-attendance'};
  const send=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!origins.has(origin))return send(403,{error:'Origin not permitted.'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return send(405,{error:'Use POST.'});
  const bearer=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  const hr=/^hr1_[0-9a-f]{64}$/.test(bearer);
  try{
    if(new URL(req.url).searchParams.get('action')==='clockSubmit'){
      if(!hr)return send(401,{error:'Sign in to HR before registering attendance.'});
      return send(200,await submitClock(db,req,await digest(bearer)));
    }
    let b;try{b=await body(req);}catch{return send(400,{error:'Invalid request.'});}
    if(['clockBegin','clockReceipt','clockCancel'].includes(b.action)){
      if(!hr)return send(401,{error:'Sign in to HR before registering attendance.'});
      const d=b.data;
      if(!d || !validId(d.submission) || Object.keys(d).some(k=>!(k==='submission'||(k==='type'&&b.action==='clockBegin'))) ||
        (b.action==='clockBegin'&&!['clock-in','clock-out'].includes(d.type)))return send(400,{error:'Invalid attendance request.'});
      return send(200,await clockRpc(db,await digest(bearer),b.action,d));
    }
    if(b.action==='login'||b.action==='logout'||b.action==='me'){
      if(b.action!=='login'||hr){
        if(!hr)return send(401,{error:'Sign in to HR.'});
        const result=await db.rpc('employee_hr_session',{p_digest:await digest(bearer),p_action:b.action==='me'?'me':'logout'});
        if(result.error)throw result.error;
        if(b.action!=='login')return result.data?send(200,result.data):send(401,{error:'Sign in to HR.'});
      }
      if(!email(b.email)||typeof b.password!=='string'||!b.password.length||b.password.length>256)return send(401,{error:denied});
      const originIp=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
      const lookup=await db.rpc('employee_hr_challenge',{p_email:b.email.toLowerCase(),p_source:parseInt((await digest(originIp)).slice(0,4),16)});
      if(lookup.error)throw lookup.error;
      if(lookup.data?.limited)return send(429,{error:'Too many attempts. Try again in ten minutes.'});
      if(!await verifyPassword(lookup.data?.hash||missingHash,b.password)||!lookup.data?.id)return send(401,{error:denied});
      const token='hr1_'+hex(crypto.getRandomValues(new Uint8Array(32)));
      const issued=await db.rpc('employee_hr_session',{p_action:'issue',p_digest:await digest(token),p_employee:lookup.data.id,p_revision:lookup.data.revision});
      if(issued.error)throw issued.error;return issued.data?send(200,{token,employee:issued.data}):send(401,{error:denied});
    }
    if(['dashboard','leave','leaveHistory','attendance','submit'].includes(b.action)){
      if(!hr)return send(401,{error:'Your HR session has ended. Sign in again.'});
      const fields=b.data??{};
      if(!fields || typeof fields!=='object' || Array.isArray(fields) ||
        (b.action==='attendance' && !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(fields.month)) ||
        (b.action!=='submit' && Object.keys(fields).some(k=>b.action!=='attendance'||k!=='month')))
        return send(400,{error:'Invalid portal request.'});
      const result=await db.rpc('employee_hr_portal',{p_digest:await digest(bearer),p_action:b.action,p_data:fields});
      if(result.error){
        if(result.error.message==='Too many requests in one hour')return send(429,{error:'Too many leave requests. Retry in one hour.'});
        if(['P0001','23505','22007','22008','22P02'].includes(result.error.code))return send(400,{error:'Check the request details and try again.'});
        throw result.error;
      }
      if(result.data===null)return send(401,{error:'Your HR session expired or access changed. Sign in again.'});
      if(b.action==='leave'||b.action==='leaveHistory')return send(200,{balances:portalBalances(result.data),
        probationary:result.data.employee.data.employmentStatus==='probationary',today:result.data.today,history:result.data.history});
      if(b.action==='dashboard'){
        const clock=await clockRpc(db,await digest(bearer),'today',{});
        return send(200,{...result.data,clock,serverNow:new Date().toISOString()});
      }
      if(b.action==='attendance'){
        const clocks=await clockRpc(db,await digest(bearer),'month',fields);
        const byDate=new Map<string,Record<string,unknown>>();
        for(const row of [...result.data,...clocks])byDate.set(row.date,{...byDate.get(row.date),...row});
        return send(200,Array.from(byDate.values()).sort((a,b)=>String(b.date).localeCompare(String(a.date))));
      }
      return send(200,result.data);
    }
    if(!['list','save','history','clockPhoto'].includes(b.action))return send(400,{error:'Unknown operation.'});
    if(!bearer||hr)return send(403,{error:'Active Accounting administrator required.'});
    let actor;try{actor=await administrator(req);}catch{return send(403,{error:'Active Accounting administrator required.'});}
    const claims=JSON.parse(atob(bearer.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    if(!uuid(claims.session_id))return send(403,{error:'Sign in again.'});
    if(b.action==='clockPhoto')return send(200,await signedClockPhoto(db,actor.user.id,claims.session_id,b.eventId));
    const data:Record<string,unknown>={};
    if(b.action!=='list'){if(!uuid(b.id))return send(400,{error:'Choose an employee.'});data.id=b.id;}
    if(b.action==='save'){
      if(!email(b.email)||!['enabled','suspended','disabled'].includes(b.access)||!Number.isSafeInteger(b.revision)||b.revision<0)
        return send(400,{error:'Check the email and access status.'});
      Object.assign(data,{email:b.email.toLowerCase(),access:b.access,revision:b.revision});
      if(b.password!==undefined||!b.revision){
        if(typeof b.password!=='string'||[...b.password].length<8||b.password.length>256)return send(400,{error:'Use a password of 8 to 256 characters.'});
        data.hash=await hashPassword(b.password);
      }
    }
    const result=await db.rpc('employee_hr_admin',{p_actor:actor.user.id,p_sid:claims.session_id,p_action:b.action,p_data:data});
    if(!result.error)return send(200,result.data);
    if(result.error.code==='23505')return send(409,{error:'This email already belongs to an HR account.'});
    if(result.error.code==='42501')return send(403,{error:'Active Accounting administrator required.'});
    if(result.error.message==='Account changed. Refresh before retrying.')return send(409,{error:result.error.message});
    throw result.error;
  }catch(err){if(err instanceof ClockError)return send(err.status,{error:err.message});return send(503,{error:'HR accounts are temporarily unavailable. Refresh before retrying a save.'});}
});
