"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Cliente para uso em componentes do lado do cliente
export const supabase = createClientComponentClient()
