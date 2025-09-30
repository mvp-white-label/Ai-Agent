import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create Supabase client for server-side operations (with service role key)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// User interface matching the database schema
export interface User {
  id: string
  email: string
  name: string
  password_hash: string
  created_at: string
  approved: boolean
}

// Database operations
export class UserService {
  /**
   * Create a new user in the database
   */
  static async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  }

  /**
   * Create a new user with password
   */
  static async createUserWithPassword(email: string, name: string, password: string): Promise<User | null> {
    try {
      const bcrypt = await import('bcryptjs')
      const password_hash = await bcrypt.hash(password, 12)

      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([{
          email,
          name,
          password_hash,
          approved: false
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating user with password:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating user with password:', error)
      return null
    }
  }

  /**
   * Verify user password
   */
  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmail(email)
      if (!user) {
        return null
      }

      const bcrypt = await import('bcryptjs')
      const isValid = await bcrypt.compare(password, user.password_hash)
      
      if (!isValid) {
        return null
      }

      return user
    } catch (error) {
      console.error('Error verifying password:', error)
      return null
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        // If no user found, this is not an error - just return null
        if (error.code === 'PGRST116') {
          console.log('No user found with email:', email)
          return null
        }
        console.error('Error fetching user:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  /**
   * Update user approval status
   */
  static async updateUserApproval(id: string, approved: boolean): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ approved })
        .eq('id', id)

      if (error) {
        console.error('Error updating user approval:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating user approval:', error)
      return false
    }
  }

  /**
   * Update user profile information
   */
  static async updateUser(id: string, updates: { name?: string; email?: string }): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user by ID:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all users:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching all users:', error)
      return []
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting user:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }
}
