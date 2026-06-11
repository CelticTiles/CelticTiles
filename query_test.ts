import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gtzkxrsbygandkycckhe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0emt4cnNieWdhbmRreWNja2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTQwMjIsImV4cCI6MjA4NDQ5MDAyMn0.EE_NN5i0rmm-fA6cX1TEs4MQV9ghCmXSaSqHdZhwGFw'
);

async function run() {
  const { data: categories, error } = await supabase.from('categories').select('id, name, slug, parent_id');
  console.log('Categories:', categories?.length);
  const tilesCat = categories?.find(c => c.slug === 'tiles');
  console.log('Tiles category:', tilesCat);

  const { data: childCategories } = await supabase.from('categories').select('id, name, slug').eq('parent_id', tilesCat?.id);
  console.log('Child Categories for tiles:', childCategories);

  const { data: allCategories } = await supabase.from('categories').select('id, name, slug, parent_id');
  
  // Find all descendants
  const getAllDescendants = (parentId) => {
    let descendants = [];
    const children = allCategories.filter(c => c.parent_id === parentId);
    for (const child of children) {
      descendants.push(child);
      descendants = descendants.concat(getAllDescendants(child.id));
    }
    return descendants;
  };

  const descendants = getAllDescendants(tilesCat?.id);
  console.log('All descendants for tiles:', descendants);

  const catIds = [tilesCat?.id, ...descendants.map(c => c.id)];

  const { data: products } = await supabase.from('products').select('id, name, category_id, status').in('category_id', catIds);
  console.log('Products under tiles (all descendants):', products?.length);

  const { data: directProducts } = await supabase.from('products').select('id, name, category_id, status').in('category_id', [tilesCat?.id, ...(childCategories?.map(c => c.id) || [])]);
  console.log('Products under tiles (direct + 1 level):', directProducts?.length);

}
run();
