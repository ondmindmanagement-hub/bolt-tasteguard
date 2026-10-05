const form=document.querySelector("#brief");
const result=document.querySelector("#result");
const list=document.querySelector("#recommendations");
const status=document.querySelector("#status");
const query=document.querySelector("#query");
const decision=document.querySelector("#decision");
form.addEventListener("submit",async event=>{
  event.preventDefault();status.textContent="Asking Qloo…";decision.textContent="";
  const body=Object.fromEntries(new FormData(form));
  try{
    const response=await fetch("/api/taste-brief",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Request failed");
    query.textContent=data.request.query;list.innerHTML="";
    for(const rec of data.recommendations){
      const li=document.createElement("li");
      const affinity=rec.affinity==null?"":" · affinity "+rec.affinity;
      li.innerHTML="<strong>"+rec.name+"</strong><span>"+(rec.type||"")+affinity+"</span>";
      list.appendChild(li);
    }
    result.classList.remove("hidden");status.textContent=data.recommendations.length+" Qloo recommendations";
  }catch(error){status.textContent=error.message;result.classList.add("hidden");}
});
document.querySelector("#approve").addEventListener("click",()=>{decision.textContent="Approved by human · no external side effect executed.";});
