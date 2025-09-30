const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupTempUsers() {
  try {
    console.log('Cleaning up temporary users...')
    
    // Delete users with temporary emails
    const { data, error } = await supabase
      .from('users')
      .delete()
      .like('email', 'microsoft-user-%@temp.com')
      .select()

    if (error) {
      console.error('Error cleaning up users:', error)
    } else {
      console.log(`Cleaned up ${data?.length || 0} temporary users`)
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

cleanupTempUsers()



