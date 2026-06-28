require('dotenv').config({ path: 'c:/Users/LENOVO/OneDrive/Desktop/New folder/ecommerce/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const { data: products, error: pErr } = await supabase.from('products').select('name, stock');
    if (pErr) console.error('Products error:', pErr);
    else {
      console.log('Products count in DB:', products.length);
      products.forEach(p => console.log(`Product: ${p.name} | Stock: ${p.stock}`));
    }
  } catch (err) {
    console.error(err);
  }
}

test();
