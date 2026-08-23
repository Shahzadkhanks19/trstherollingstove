export function getPagination(s:URLSearchParams){const page=Math.max(1,Number(s.get("page"))||1),limit=Math.min(100,Math.max(1,Number(s.get("limit"))||20));return{page,limit,skip:(page-1)*limit}}
