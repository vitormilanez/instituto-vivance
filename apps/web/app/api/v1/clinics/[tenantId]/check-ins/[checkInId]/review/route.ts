import { reviewCheckIn } from "@/modules/check-ins/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
export async function POST(request:Request,{params}:{params:Promise<{tenantId:string;checkInId:string}>}){
  if(!sameOrigin(request))return json({error:"Origem da solicitação não permitida."},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Use JSON."},415);
  try{const p=await params;return json(await reviewCheckIn(p.tenantId,p.checkInId,await boundedJson(request,6000)),201);}catch(e){return apiError(e);}
}
