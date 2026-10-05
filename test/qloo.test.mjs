import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeBrief,buildTasteQuery,normalizeRecommendations } from "../src/qloo.mjs";
test("brief requires core fields",()=>assert.throws(()=>sanitizeBrief({audience:"",seed:"A24",objective:"event"})));
test("unknown type fails closed to place",()=>{const x=sanitizeBrief({audience:"indie fans",seed:"A24",objective:"event",type:"bad"});assert.equal(x.type,"urn:entity:place")});
test("query carries audience seed location and objective",()=>{const x=buildTasteQuery({audience:"indie fans",seed:"A24",objective:"event",location:"Copenhagen",type:"urn:entity:brand"}).query;assert.match(x,/indie fans/);assert.match(x,/A24/);assert.match(x,/Copenhagen/);assert.match(x,/event/)});
test("normalizer handles Qloo entity shape",()=>{const out=normalizeRecommendations({results:{entities:[{id:"1",name:"Example",type:"urn:entity:brand",affinity:.82}]}});assert.equal(out[0].name,"Example");assert.equal(out[0].affinity,.82)});
test("normalizer bounds output to eight",()=>{const entities=Array.from({length:12},(_,i)=>({id:String(i),name:"E"+i}));assert.equal(normalizeRecommendations({results:{entities}}).length,8)});
