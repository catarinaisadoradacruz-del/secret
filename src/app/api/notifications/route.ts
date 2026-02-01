import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const action = req.nextUrl.searchParams.get('action') || 'list'

    if (action === 'list') {
      const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const { count: unreadCount } = await supabase
        .from('notification_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      return NextResponse.json({ notifications: data || [], unreadCount: unreadCount || 0 })
    }

    if (action === 'scheduled') {
      const { data } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('scheduled_time', { ascending: true })

      return NextResponse.json({ scheduled: data || [] })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, action } = body

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    if (action === 'markRead') {
      const { notificationId } = body
      if (notificationId) {
        await supabase
          .from('notification_history')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_id', userId)
      } else {
        await supabase
          .from('notification_history')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false)
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'create') {
      const { title, body: notifBody, type, data: notifData } = body
      const { data, error } = await supabase
        .from('notification_history')
        .insert({
          user_id: userId,
          title,
          body: notifBody,
          type: type || 'general',
          data: notifData || {},
          read: false
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, notification: data })
    }

    if (action === 'schedule') {
      const { title, body: notifBody, type, scheduledTime, repeatType } = body
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .insert({
          user_id: userId,
          title,
          body: notifBody,
          type: type || 'reminder',
          scheduled_time: scheduledTime,
          repeat_type: repeatType || 'once',
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, scheduled: data })
    }

    if (action === 'deleteScheduled') {
      const { scheduleId } = body
      await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', userId)
      return NextResponse.json({ success: true })
    }

    if (action === 'registerToken') {
      const { token, platform } = body
      
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', token)
        .single()

      if (!existing) {
        await supabase.from('push_tokens').insert({
          user_id: userId,
          token,
          platform: platform || 'web',
          is_active: true
        })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
