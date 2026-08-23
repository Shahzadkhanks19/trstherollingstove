import {createHash,randomBytes} from "node:crypto";
export const generateOpaqueToken=(bytes=32)=>randomBytes(bytes).toString("hex");
export const hashOpaqueToken=(token:string)=>createHash("sha256").update(token).digest("hex");
