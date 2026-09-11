import { requestCheckIn } from "@/modules/check-ins/service";
import { apiError, boundedJson, json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
export async function POST(request:Request,{params}:{params:Promise<{tenantId:string}>}){
  if(!sameOrigin(request))return json({error:"Origem da solicitação não permitida."},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Use JSON."},415);
  try{return json(await requestCheckIn((await params).tenantId,await boundedJson(request,6000)),201);}catch(e){return apiError(e);}
}
