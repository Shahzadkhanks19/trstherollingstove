import {headers} from "next/headers";
export async function getRequestMetadata(){const h=await headers();return{ipAddress:h.get("x-forwarded-for")?.split(",")[0]?.trim()||h.get("x-real-ip")||"",userAgent:h.get("user-agent")||""}}
