export type UserPhase = 'PREGNANT' | 'POSTPARTUM' | 'ACTIVE'
export type MealType = 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'AFTERNOON_SNACK' | 'DINNER' | 'EVENING_SNACK'

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  birth_date?: string
  phone?: string
  phase: UserPhase
  last_menstrual_date?: string
  due_date?: string
  is_first_pregnancy?: boolean
  baby_birth_date?: string
  is_breastfeeding?: boolean
  delivery_type?: string
  goals: string[]
  dietary_restrictions: string[]
  exercise_level: string
  height?: number
  current_weight?: number
  target_weight?: number
  cycle_length?: number
  last_period_date?: string
  notifications_enabled: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Meal {
  id: string
  user_id: string
  type: MealType
  name?: string
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  total_fiber: number
  image_url?: string
  ai_analysis?: MealAnalysis
  date: string
  notes?: string
  created_at: string
}

export interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface MealAnalysis {
  foods: FoodItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  isSafeForPregnancy: boolean
  warnings: string[]
  suggestions: string[]
}

export interface Workout {
  id: string
  user_id: string
  name: string
  description?: string
  type?: string
  duration?: number
  exercises: Exercise[]
  completed: boolean
  started_at?: string
  completed_at?: string
  calories_burned?: number
  rating?: number
  notes?: string
  created_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  rest: number
  notes?: string
}

export interface ChatSession {
  id: string
  user_id: string
  title?: string
  messages: ChatMessage[]
  summary?: string
  message_count: number
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface Progress {
  id: string
  user_id: string
  date: string
  weight?: number
  bust?: number
  waist?: number
  hips?: number
  belly?: number
  photo_url?: string
  notes?: string
  mood?: string
  energy_level?: number
  symptoms: string[]
  created_at: string
}
