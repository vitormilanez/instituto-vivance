// Trecho para tests/isolation.test.ts — entra junto com a migration, quando
// ela for aprovada. Usa os helpers existentes (asUser, switchActor, denied,
// startClinical) e a mesma forma de gerar medidas do teste de medidas.
test("não visto é por profissional, idempotente e segue o vínculo de cuidado", async () => {
  await asUser("doctor", async () => {
    await startClinical("2100-02-01T12:00:00Z", "2100-02-01T12:30:00Z");
    await db.exec("reset role");
    await db.query(
      "insert into public.patient_accounts(tenant_id,patient_id,user_id) values($1,$2,$3)",
      [a, pa, users.patient.id],
    );
    await switchActor("patient");
    await db.query(
      "select public.submit_patient_measurements($1,70.1,null,null,current_date,$2,true)",
      [a, randomUUID()],
    );
    await switchActor("doctor");
    const item = (
      await db.query<{ id: string }>(
        "select id from public.patient_measurements where tenant_id=$1 and patient_id=$2 limit 1",
        [a, pa],
      )
    ).rows[0].id;

    // Marcar duas vezes guarda uma linha só, com a data da primeira leitura.
    await db.query("select public.mark_patient_item_read($1,'measurements',$2)", [a, item]);
    const first = (
      await db.query<{ read_at: string }>(
        "select read_at from public.patient_item_reads where item_id=$1",
        [item],
      )
    ).rows;
    await db.query("select public.mark_patient_item_read($1,'measurements',$2)", [a, item]);
    const second = (
      await db.query<{ read_at: string }>(
        "select read_at from public.patient_item_reads where item_id=$1",
        [item],
      )
    ).rows;
    assert.equal(first.length, 1);
    assert.deepEqual(second, first);

    // Id inventado, tipo errado e tipo desconhecido falham fechados.
    await denied("select public.mark_patient_item_read($1,'measurements',$2)", [a, randomUUID()]);
    await denied("select public.mark_patient_item_read($1,'documents',$2)", [a, item]);
    await denied("select public.mark_patient_item_read($1,'qualquer',$2)", [a, item]);
    // Outra clínica: o item não existe lá.
    await denied("select public.mark_patient_item_read($1,'measurements',$2)", [b, item]);
    // Ninguém forja autoria nem apaga a leitura.
    await denied(
      "insert into public.patient_item_reads(tenant_id,user_id,item_kind,item_id,patient_id) values($1,$2,'measurements',$3,$4)",
      [a, users.nurse.id, item, pa],
    );
    await denied("update public.patient_item_reads set read_at=now()");
    await denied("delete from public.patient_item_reads");

    // A enfermagem sem vínculo não marca e não vê a leitura do médico.
    await switchActor("nurse");
    await denied("select public.mark_patient_item_read($1,'measurements',$2)", [a, item]);
    assert.equal(
      (await db.query("select 1 from public.patient_item_reads")).rows.length,
      0,
    );
    // O paciente não lê cursores de ninguém.
    await switchActor("patient");
    await denied("select public.mark_patient_item_read($1,'measurements',$2)", [a, item]);
    assert.equal(
      (await db.query("select 1 from public.patient_item_reads")).rows.length,
      0,
    );

    // Revogado o vínculo, a leitura some da vista do próprio médico.
    await db.exec("reset role");
    await db.query(
      "update public.care_relationships set status='revoked',expected_version=version where tenant_id=$1 and patient_id=$2 and professional_id=$3",
      [a, pa, users.doctor.id],
    );
    await switchActor("doctor");
    assert.equal(
      (await db.query("select 1 from public.patient_item_reads")).rows.length,
      0,
    );
  });
});
