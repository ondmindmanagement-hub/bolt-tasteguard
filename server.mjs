import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { recommendTaste, normalizeRecommendations, buildTasteQuery } from "./src/qloo.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 8080);
const contentTypes = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};

function sendJson(res,status,body){
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(body));
}
async function readBody(req){
  let body="";
  for await(const chunk of req){body+=chunk;if(body.length>20000)throw new Error("request too large");}
  return JSON.parse(body||"{}");
}
async function handleApi(req,res){
  if(req.method==="GET"&&req.url==="/api/status"){
    sendJson(res,200,{project:"BOLT TasteGuard",qlooConfigured:Boolean(process.env.QLOO_API_KEY),mode:process.env.QLOO_API_KEY?"live":"waiting-for-qloo-key"});
    return true;
  }
  if(req.method==="POST"&&req.url==="/api/taste-brief"){
    try{
      const input=await readBody(req);
      const request=buildTasteQuery(input);
      const raw=await recommendTaste(input);
      const recommendations=normalizeRecommendations(raw);
      sendJson(res,200,{source:"Qloo",request,recommendations,approval_required:true,approval_reason:"Taste recommendations are evidence for a human decision, not permission to publish or spend."});
    }catch(error){
      if(error.code==="QLOO_KEY_MISSING")sendJson(res,503,{error:"Qloo API key is not configured yet.",status:"waiting_for_qloo_key"});
      else sendJson(res,400,{error:error.message});
    }
    return true;
  }
  return false;
}
async function serveStatic(req,res){
  const url=new URL(req.url,"http://"+req.headers.host);
  const rel=url.pathname==="/"?"index.html":url.pathname.replace(/^\/+/,"");
  const file=path.join(PUBLIC,rel);
  if(!file.startsWith(PUBLIC)){res.writeHead(403);res.end("Forbidden");return;}
  try{
    const data=await fs.readFile(file);
    res.writeHead(200,{"content-type":contentTypes[path.extname(file)]||"application/octet-stream","cache-control":rel==="index.html"?"no-store":"public, max-age=3600"});
    res.end(data);
  }catch{res.writeHead(404);res.end("Not found");}
}
const server=http.createServer(async(req,res)=>{const handled=await handleApi(req,res);if(!handled)await serveStatic(req,res);});
server.listen(PORT,()=>console.log("BOLT TasteGuard listening on http://localhost:"+PORT));
