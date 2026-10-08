const form=document.querySelector("#brief");
const result=document.querySelector("#result");
const list=document.querySelector("#recommendations");
const status=document.querySelector("#status");
const query=document.querySelector("#query");
const decision=document.querySelector("#decision");
form.addEventListener("submit",async event=>{
  event.preventDefault();
  status.textContent="Asking Qloo…";
  decision.textContent="";
  const body=Object.fromEntries(new FormData(form));
  try{
    const response=await fetch("/api/taste-brief",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Request failed");
    query.textContent=data.request.query;
    list.replaceChildren();
    for(const rec of data.recommendations){
      const li=document.createElement("li");
      const heading=document.createElement("strong");
      const detail=document.createElement("span");
      heading.textContent=String(rec.name||"Unknown");
      const affinity=rec.affinity==null?"":" · affinity "+String(rec.affinity);
      detail.textContent=(rec.type||"")+affinity;
      li.append(heading,detail);
      list.appendChild(li);
    }
    result.classList.remove("hidden");
    status.textContent=data.recommendations.length+
      " Qloo recommendations. Results are NOT filtered to your market or city.";
  }catch(error){
    status.textContent=error.message;
    result.classList.add("hidden");
  }
});
document.querySelector("#approve").addEventListener("click",()=>{
  decision.textContent="Approved by human · no external side effect executed.";
});
