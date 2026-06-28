require('dotenv').config({ path: 'c:/Users/LENOVO/OneDrive/Desktop/New folder/ecommerce/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearProducts() {
  try {
    console.log('Deleting all products from Supabase...');
    const { data, error } = await supabase.from('products').delete().neq('id', 0); // deletes all rows
    if (error) {
      console.error('Error deleting products:', error);
    } else {
      console.log('Successfully deleted all products. Response data:', data);
    }
  } catch (err) {
    console.error('Exception during deletion:', err);
  }
}

clearProducts();
