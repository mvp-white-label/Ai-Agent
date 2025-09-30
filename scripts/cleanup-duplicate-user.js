const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '../.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase URL or Service Role Key is missing. Please check your .env.local file.')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

async function cleanupDuplicateUser() {
  console.log('Cleaning up duplicate user: A.chatterjee@mechlintech.com')
  try {
    // First, let's see all users with this email
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'A.chatterjee@mechlintech.com')

    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return
    }

    console.log(`Found ${users.length} users with email A.chatterjee@mechlintech.com:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Created: ${user.created_at}`)
    })

    if (users.length > 1) {
      // Keep the first one, delete the rest
      const usersToDelete = users.slice(1)
      console.log(`Deleting ${usersToDelete.length} duplicate users...`)
      
      for (const user of usersToDelete) {
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', user.id)

        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError)
        } else {
          console.log(`Deleted user ${user.id}`)
        }
      }
    } else {
      console.log('No duplicates found')
    }
  } catch (error) {
    console.error('Error in cleanupDuplicateUser:', error)
  }
}

cleanupDuplicateUser()



