import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gtzkxrsbygandkycckhe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emt4cnNieWdhbmRreWNja2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTQwMjIsImV4cCI6MjA4NDQ5MDAyMn0.EE_NN5i0rmm-fA6cX1TEs4MQV9ghCmXSaSqHdZhwGFw'
);

async function run() {
  const { data: tilesCat } = await supabase.from('categories').select('id, name, slug').eq('slug', 'tiles').single();
  const { data: childCategories } = await supabase.from('categories').select('id').eq('parent_id', tilesCat?.id);
  
  const catIds = [tilesCat?.id, ...(childCategories?.map(c => c.id) || [])];

  const { data: products } = await supabase.from('products').select('id, status').in('category_id', catIds);
  console.log('Total products:', products?.length);
  console.log('Active products:', products?.filter(p => p.status === 'active')?.length);
  console.log('Draft products:', products?.filter(p => p.status === 'draft')?.length);

}
run();
