import { supabase } from './src/supabaseClient.js';

async function checkData() {
  console.log("--- ORGANIZATIONS ---");
  const { data: orgs, error: err1 } = await supabase.from('organizations').select('*');
  console.log("Orgs:", orgs || err1);

  console.log("\n--- ORGANIZATION MEMBERS ---");
  const { data: members, error: err2 } = await supabase.from('organization_members').select('*');
  console.log("Members:", members || err2);

  console.log("\n--- LEADS ---");
  const { data: leads, error: err3 } = await supabase.from('leads').select('*');
  if (leads) {
    console.log(`Total Leads: ${leads.length}`);
    leads.forEach(l => {
      console.log(`- Lead: id=${l.id}, name=${l.namaLengkap}, org_id=${l.organization_id}, user_id=${l.user_id}`);
    });
  } else {
    console.log("Leads error:", err3);
  }
}

checkData().catch(console.error);
