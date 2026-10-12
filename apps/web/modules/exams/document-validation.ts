import "server-only";
import { DomainError } from "@/lib/errors";
import { tenantId } from "@/lib/validation";
import { requireClinic } from "@/modules/identity/service";
export type ExamDocumentValidationView = {
 version:number; stale:boolean;
 sourceState:{documentId:string;sourceHash:string|null;runId:string|null;runStatus:string|null;jobStatus:string|null;pageCount:number|null;pendingItems:number;qualityNotes:string[];unresolvedPages:number[];pages:{page:number;status:string}[];itemReviews:{id:string;decision:string|null}[]};
 validation:null|{id:string;version:number;decision:"reviewed"|"excluded";excluded_pages:number[];note:string|null;reviewed_at:string};
};
export class ExamDocumentValidationError extends DomainError {}
type Rpc={rpc(name:"get_exam_document_validation"|"review_exam_document_validation",args:Record<string,unknown>):PromiseLike<{data:unknown;error:null|{code?:string}}>} ;
async function clinic(t:string,d:string){const tenant=tenantId(t),document=tenantId(d);const {client}=await requireClinic(tenant,["doctor"]);return{tenant,document,rpc:client as unknown as Rpc};}
function check(error:null|{code?:string}){if(error)throw new ExamDocumentValidationError(error.code==="23514"?"Confira todos os resultados e justifique as notas de qualidade ou páginas excluídas antes de concluir.":error.code==="40001"?"A conferência mudou. Atualize o estado antes de salvar.":error.code==="22023"?"Confira a justificativa (10 a 2.000 caracteres) e os números das páginas.":"Não foi possível conferir este documento com seu vínculo atual.",error.code==="42501"?403:error.code==="40001"||error.code==="23514"?409:error.code==="22023"?400:503);}
export async function getExamDocumentValidation(t:string,d:string){const {tenant,document,rpc}=await clinic(t,d);const result=await rpc.rpc("get_exam_document_validation",{target_tenant:tenant,target_document:document});check(result.error);return result.data as ExamDocumentValidationView;}
export async function saveExamDocumentValidation(t:string,d:string,input:unknown){
 if(!input||typeof input!=="object")throw new ExamDocumentValidationError("Conferência inválida.",400);
 const {decision,note,excludedPages,expectedVersion,requestId}=input as Record<string,unknown>;
 if(!["reviewed","excluded"].includes(String(decision))||typeof expectedVersion!=="number"||!Number.isInteger(expectedVersion)||expectedVersion<0||typeof requestId!=="string"||typeof note!=="string"||note.length>2000||!Array.isArray(excludedPages)||excludedPages.length>1000||excludedPages.some(n=>!Number.isInteger(n)||n<1||n>1000))throw new ExamDocumentValidationError("Conferência inválida.",400);
 const {tenant,document,rpc}=await clinic(t,d);
 const result=await rpc.rpc("review_exam_document_validation",{target_tenant:tenant,target_document:document,target_request:tenantId(requestId),expected_version:expectedVersion,validation_decision:decision,validation_note:note.trim()||null,excluded_page_numbers:excludedPages});check(result.error);return{saved:true,id:result.data};
}
