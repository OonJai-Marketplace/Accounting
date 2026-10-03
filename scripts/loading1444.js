/* One loading mark for sign-in, session restoration and workspace data. */
(()=>{'use strict';
window.loading1444={markup:()=>'<span class="loading-orbit1444" aria-hidden="true">'+Array.from({length:6},(_,i)=>'<i style="--i:'+i+'"><b></b></i>').join('')+'</span>'};
const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1));
if(!q.has('password-recovery')&&q.get('type')!=='recovery'&&h.get('type')!=='recovery'&&!q.has('error_description')&&!h.has('error_description'))document.documentElement.classList.add('session-checking1444');
})();
