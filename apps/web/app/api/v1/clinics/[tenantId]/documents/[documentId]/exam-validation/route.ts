import { apiError,boundedJson,json } from "@/lib/api";
import { sameOrigin } from "@/lib/validation";
import {getExamDocumentValidation,saveExamDocumentValidation} from "@/modules/exams/document-validation";
type Context={params:Promise<{tenantId:string;documentId:string}>};
export async function GET(_request:Request,context:Context){try{const p=await context.params;return json(await getExamDocumentValidation(p.tenantId,p.documentId));}catch(e){return apiError(e);}}
export async function POST(request:Request,context:Context){if(!sameOrigin(request))return json({error:"Origem não permitida."},403);try{const p=await context.params;return json(await saveExamDocumentValidation(p.tenantId,p.documentId,await boundedJson(request,16000)));}catch(e){return apiError(e);}}
