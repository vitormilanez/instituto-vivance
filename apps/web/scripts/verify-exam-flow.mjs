// Explicitly synthetic integration QA. Credentials are read from an ignored
// local vault; stdout contains only counts/statuses, never sessions or exams.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const base = process.env.VIVANCE_QA_BASE_URL ?? "http://localhost:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const patientEmail = process.env.VIVANCE_EXAMS_QA_PATIENT_EMAIL;
const doctorEmail = process.env.VIVANCE_TEST_DOCTOR_EMAIL;
const password = process.env.VIVANCE_TEST_DOCTOR_PASSWORD;
assert.equal(process.env.VIVANCE_EXAMS_QA_CONFIRMED, "1", "Confirm synthetic QA explicitly");
assert.equal(url, "https://oxuwrdjojsmgxoljqkuk.supabase.co");
assert.ok(key && patientEmail && doctorEmail && password, "Missing local QA configuration");
const exercise = process.argv.includes("--exercise-review");

async function account(email) {
  let jar = [];
  const client = createServerClient(url,key,{ auth:{autoRefreshToken:false},cookies:{
    getAll:()=>jar, setAll:values=>{for(const value of values){jar=jar.filter(c=>c.name!==value.name);jar.push(value);}},
  }});
  const login = await client.auth.signInWithPassword({email,password});
  assert.ok(!login.error,"QA authentication failed");
  const storage = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:`Bearer ${login.data.session.access_token}`}}});
  const call = async (path, method="GET", body) => {
    const response = await fetch(`${base}${path}`,{method,headers:{Origin:base,"Content-Type":"application/json",
      Cookie:jar.map(c=>`${c.name}=${c.value}`).join("; ")},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
    const value = await response.json();
    return {status:response.status,value};
  };
  return {client,storage,call,userId:login.data.user.id};
}

const patient = await account(patientEmail), doctor = await account(doctorEmail);
try {
  const records = await patient.client.from("patient_accounts").select("tenant_id,patient_id").eq("user_id",patient.userId);
  assert.ok(!records.error && records.data?.length===1,"Expected one synthetic patient membership");
  const {tenant_id:tenant,patient_id:patientId}=records.data[0];
  const root=`/api/v1/clinics/${tenant}`, p=`${root}/patients/${patientId}`;
  assert.equal((await patient.call(`${p}/exam-summary`)).status,403);
  assert.equal((await patient.call(`${root}/exam-library`)).status,403);
  const quota = await patient.call(`${p}/exam-quota`);
  assert.equal(quota.status,200);
  assert.equal(quota.value.received,4);

  const docs = await patient.client.from("patient_documents").select("id,storage_path,content_type,byte_size,original_filename,duplicate_of")
    .eq("tenant_id",tenant).eq("patient_id",patientId).eq("status","available").eq("attached_to","documents").is("duplicate_of",null);
  assert.ok(!docs.error && docs.data.length===4,"Expected four original test PDFs");
  if(exercise) {
    // Exercise duplicate detection with the same bytes and another filename.
    const original = docs.data[0];
    const binary = await patient.storage.storage.from("vivance-documents").download(original.storage_path);
    assert.ok(!binary.error && binary.data.size===original.byte_size,"Original download failed");
    const reserved=await patient.call(`${root}/documents`,"POST",{patient_id:patientId,filename:"qa-reenvio-identico.pdf",content_type:original.content_type,byte_size:original.byte_size,category:"exam",visibility:"shared"});
    assert.equal(reserved.status,201);
    const upload=await patient.storage.storage.from("vivance-documents").uploadToSignedUrl(reserved.value.uploadPath,reserved.value.uploadToken,binary.data,{contentType:original.content_type});
    assert.ok(!upload.error,"Signed duplicate upload failed");
    const completed=await patient.call(`${root}/documents/${reserved.value.documentId}/complete`,"POST",{confirmed:true});
    assert.equal(completed.status,200);assert.equal(completed.value.duplicate,true);
    assert.equal((await patient.call(`${p}/exam-quota`)).value.received,4);

    // This medical review is a test action authorized by the user, with an
    // explicit QA note. It is never evidence of actual clinical acceptance.
    const overview=await doctor.call(`${p}/exam-summary`);
    assert.equal(overview.status,200);
    for(const document of docs.data) {
      const validations=await doctor.call(`${root}/documents/${document.id}/exam-validation`);
      assert.equal(validations.status,200);
      const state=validations.value.sourceState;
      assert.equal(state.jobStatus,"completed","Wait for extraction to complete");
      const items=await doctor.client.from("exam_result_items").select("id,page_number,source_excerpt,source_start,source_end")
        .eq("tenant_id",tenant).eq("patient_id",patientId).eq("extraction_run_id",state.runId);
      const pages=await doctor.client.from("document_extracted_pages").select("page_number,extracted_text")
        .eq("tenant_id",tenant).eq("extraction_run_id",state.runId);
      assert.ok(!items.error && !pages.error,"Unable to verify source provenance");
      const source=new Map(pages.data.map(page=>[page.page_number,page.extracted_text]));
      for(const item of items.data) {
        assert.equal(source.get(item.page_number)?.slice(item.source_start,item.source_end),item.source_excerpt,"Source offset mismatch");
      }
      const reviews=await doctor.client.from("exam_result_item_reviews").select("item_id,version").eq("tenant_id",tenant).in("item_id",items.data.map(item=>item.id));
      assert.ok(!reviews.error,"Unable to load review versions");
      const reviewed=new Set(reviews.data.map(review=>review.item_id));
      const pending=items.data.filter(item=>!reviewed.has(item.id));
      for(let index=0;index<pending.length;index+=3) {
        await Promise.all(pending.slice(index,index+3).map(async item=>{
          const saved=await doctor.call(`${root}/documents/${document.id}/extraction/review`,"POST",{
            itemId:item.id,requestId:randomUUID(),expectedVersion:0,decision:"confirmed",
            note:"QA automatizado autorizado: integridade da transcrição e origem conferidas. Não representa aceite clínico real.",
          });
          assert.equal(saved.status,201,"Unable to save synthetic transcription review");
        }));
      }
      const current=await doctor.call(`${root}/documents/${document.id}/exam-validation`);
      const adjudicated=await doctor.call(`${root}/documents/${document.id}/exam-validation`,"POST",{
        decision:"reviewed",expectedVersion:current.value.version,requestId:randomUUID(),
        excludedPages:current.value.sourceState.unresolvedPages,
        note:"QA de fluxo autorizado em documentos de teste. Fontes e estados conferidos; páginas incertas ficam explicitamente excluídas. Sem aceite clínico real.",
      });
      assert.equal(adjudicated.status,200,"Unable to conclude synthetic document review");
    }
  }

  const view=await doctor.call(`${p}/exam-summary`);
  assert.equal(view.status,200);
  if(exercise) {
    assert.equal(view.value.manifest.coverage.complete,true);
    assert.ok(view.value.manifest.facts.length>0);
    const generated=await doctor.call(`${p}/exam-summary`,"POST");assert.equal(generated.status,200);
    const cached=await doctor.call(`${p}/exam-summary`,"POST");assert.equal(cached.status,200);assert.equal(cached.value.cached,true);assert.equal(cached.value.summaryId,generated.value.summaryId);
  }
  const final=await doctor.call(`${p}/exam-summary`);assert.equal(final.status,200);
  console.log(JSON.stringify({synthetic:true,patientApiDenied:true,libraryApiDenied:true,
    originalFiles:docs.data.length,quotaReceived:(await patient.call(`${p}/exam-quota`)).value.received,
    reviewedFacts:final.value.manifest.facts.length,coverageComplete:final.value.manifest.coverage.complete,
    summaryStatus:final.value.summary?.status ?? null,summaryClaims:final.value.summary?.claims?.length ?? 0,
    clinicalPossibilities:final.value.summary?.possibilities?.length ?? 0},null,2));
} finally {
  await patient.client.auth.signOut({scope:"local"});await doctor.client.auth.signOut({scope:"local"});
}
