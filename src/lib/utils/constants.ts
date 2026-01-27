export const APP_NAME = 'VitaFit AI'

export const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Cafe da Manha', emoji: '🌅' },
  { value: 'MORNING_SNACK', label: 'Lanche da Manha', emoji: '🍎' },
  { value: 'LUNCH', label: 'Almoco', emoji: '🍽️' },
  { value: 'AFTERNOON_SNACK', label: 'Lanche da Tarde', emoji: '🥤' },
  { value: 'DINNER', label: 'Jantar', emoji: '🌙' },
  { value: 'EVENING_SNACK', label: 'Ceia', emoji: '🌜' },
] as const

export const PREGNANCY_WEEKS = Array.from({ length: 42 }, (_, i) => i + 1)

export const TRIMESTER_INFO = {
  1: { name: '1o Trimestre', weeks: '1-13', color: 'primary' },
  2: { name: '2o Trimestre', weeks: '14-26', color: 'secondary' },
  3: { name: '3o Trimestre', weeks: '27-40', color: 'accent' },
} as const

export const EXERCISE_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediario' },
  { value: 'advanced', label: 'Avancado' },
] as const

export const DIETARY_RESTRICTIONS = [
  'Vegetariana',
  'Vegana',
  'Sem Gluten',
  'Sem Lactose',
  'Low Carb',
  'Diabetica',
  'Hipertensa',
] as const

export const USER_PHASES = [
  { value: 'PREGNANT', label: 'Gestante', emoji: '🤰' },
  { value: 'POSTPARTUM', label: 'Pos-parto', emoji: '🤱' },
  { value: 'ACTIVE', label: 'Mulher Ativa', emoji: '💪' },
] as const
