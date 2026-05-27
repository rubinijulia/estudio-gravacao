import { createClient } from '@/lib/supabase'

export async function getUserProfile(userId: string) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error in getUserProfile:', err)
    return null
  }
}
