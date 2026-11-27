// One in-memory instance per open portal. Clearing the view is synchronous, before
// any network request. A retired bearer is usable only for retrying logout.
export function employeeSession(endpoint,clearPrivateView,transport=fetch) {
  let token='',retired='',generation=0,queue=Promise.resolve(),controller=new AbortController();
  async function request(action,bearer,fields={},signal){
    const response=await transport(endpoint,{method:'POST',credentials:'omit',cache:'no-store',signal,
      headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},
      body:JSON.stringify({action,...fields})});
    const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'HR request failed.'),{status:response.status});return data;
  }
  function clear(){generation++;controller.abort();controller=new AbortController();clearPrivateView();}
  function change(credentials){
    clear();const epoch=generation;retired=token||retired;token='';
    queue=queue.catch(()=>{}).then(async()=>{
      if(retired){await request('logout',retired);retired='';}
      if(!credentials||epoch!==generation)return;
      const signed=await request('login','',credentials);
      if(epoch!==generation){retired=signed.token;await request('logout',retired);retired='';return;}
      token=signed.token;return signed.employee;
    });return queue;
  }
  return {signIn:(email,password)=>change({email,password}),signOut:()=>change(null),
    async currentEmployee(){
      if(!token)throw Error('Sign in to HR.');const epoch=generation;
      try{const employee=await request('me',token,{},controller.signal);if(epoch!==generation)throw Error('Employee changed.');return employee;}
      catch(e){if(e.status===401&&epoch===generation){token='';clear();}throw e;}
    }};
}
