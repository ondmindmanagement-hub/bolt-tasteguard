import { buildTasteQuery } from "../src/qloo.mjs";
const brief={audience:"design-conscious indie music fans in their 20s and 30s",seed:"Rosalía and A24",location:"Copenhagen",objective:"choose culturally coherent partners for a small launch event",type:"urn:entity:place"};
console.log(JSON.stringify(buildTasteQuery(brief),null,2));
