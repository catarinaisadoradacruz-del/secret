'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, Pause, RotateCcw, Timer, Flame, Trophy, 
  ChevronRight, ArrowLeft, Check, X, Dumbbell,
  Heart, Sparkles, Clock, Target, Calendar, Filter
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Exercise {
  id: string
  name: string
  duration: number
  reps?: number
  sets?: number
  restTime: number
  description: string
  icon: string
  muscleGroup: string
}

interface Workout {
  id: string
  name: string
  description: string
  duration: number
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado'
  calories: number
  exercises: Exercise[]
  color: string
  icon: string
  forPregnant: boolean
  category: string
}

const WORKOUTS: Workout[] = [
  // TREINOS PARA GESTANTES
  {
    id: 'prenatal-beginner',
    name: 'Gestante Iniciante',
    description: 'Treino leve e seguro para gestantes',
    duration: 15,
    difficulty: 'Iniciante',
    calories: 80,
    color: 'from-pink-400 to-rose-500',
    icon: '🤰',
    forPregnant: true,
    category: 'Gestante',
    exercises: [
      { id: '1', name: 'Respiração diafragmática', duration: 120, restTime: 30, description: 'Inspire pelo nariz, expire pela boca, sentindo a barriga expandir', icon: '🌬️', muscleGroup: 'Respiração' },
      { id: '2', name: 'Marcha leve', duration: 120, restTime: 30, description: 'Caminhe no lugar elevando suavemente os joelhos', icon: '🚶‍♀️', muscleGroup: 'Pernas' },
      { id: '3', name: 'Agachamento com apoio', duration: 45, reps: 10, sets: 2, restTime: 45, description: 'Segure em uma cadeira e agache suavemente', icon: '🪑', muscleGroup: 'Pernas e glúteos' },
      { id: '4', name: 'Elevação lateral de braços', duration: 45, reps: 12, sets: 2, restTime: 30, description: 'Braços ao lado do corpo, eleve até a altura dos ombros', icon: '💪', muscleGroup: 'Ombros' },
      { id: '5', name: 'Alongamento suave', duration: 180, restTime: 0, description: 'Alongue pescoço, ombros e pernas suavemente', icon: '🧘‍♀️', muscleGroup: 'Corpo todo' },
    ]
  },
  {
    id: 'prenatal-yoga',
    name: 'Yoga Pré-Natal',
    description: 'Relaxamento e flexibilidade para gestantes',
    duration: 25,
    difficulty: 'Iniciante',
    calories: 100,
    color: 'from-purple-400 to-indigo-500',
    icon: '🧘',
    forPregnant: true,
    category: 'Gestante',
    exercises: [
      { id: '1', name: 'Postura da montanha', duration: 60, restTime: 15, description: 'Fique em pé, pés paralelos, braços ao lado', icon: '🏔️', muscleGroup: 'Postura' },
      { id: '2', name: 'Gato-vaca', duration: 90, restTime: 30, description: 'De quatro, alterne arqueando e arredondando as costas', icon: '🐱', muscleGroup: 'Coluna' },
      { id: '3', name: 'Postura da criança modificada', duration: 60, restTime: 30, description: 'Joelhos afastados, estenda os braços à frente', icon: '👶', muscleGroup: 'Costas e quadril' },
      { id: '4', name: 'Guerreiro II modificado', duration: 45, sets: 2, restTime: 30, description: 'Pernas afastadas, braços estendidos lateralmente', icon: '⚔️', muscleGroup: 'Pernas e braços' },
      { id: '5', name: 'Borboleta sentada', duration: 90, restTime: 30, description: 'Sentada, junte as solas dos pés, joelhos para fora', icon: '🦋', muscleGroup: 'Quadril' },
      { id: '6', name: 'Relaxamento final', duration: 180, restTime: 0, description: 'Deite de lado esquerdo, respire profundamente', icon: '😌', muscleGroup: 'Relaxamento' },
    ]
  },
  {
    id: 'prenatal-strength',
    name: 'Força para Gestantes',
    description: 'Fortalecimento seguro durante a gravidez',
    duration: 20,
    difficulty: 'Intermediário',
    calories: 120,
    color: 'from-teal-400 to-cyan-500',
    icon: '💪',
    forPregnant: true,
    category: 'Gestante',
    exercises: [
      { id: '1', name: 'Aquecimento articular', duration: 120, restTime: 30, description: 'Movimente todas as articulações suavemente', icon: '🔥', muscleGroup: 'Articulações' },
      { id: '2', name: 'Agachamento sumo', duration: 45, reps: 12, sets: 3, restTime: 45, description: 'Pés afastados, pontas para fora, agache', icon: '🦵', muscleGroup: 'Pernas e glúteos' },
      { id: '3', name: 'Remada com elástico', duration: 45, reps: 12, sets: 3, restTime: 45, description: 'Puxe o elástico em direção ao peito', icon: '🚣', muscleGroup: 'Costas' },
      { id: '4', name: 'Elevação pélvica', duration: 45, reps: 15, sets: 3, restTime: 30, description: 'Deitada, eleve o quadril contraindo glúteos', icon: '🍑', muscleGroup: 'Glúteos e core' },
      { id: '5', name: 'Rosca bíceps leve', duration: 45, reps: 12, sets: 2, restTime: 30, description: 'Com pesos leves ou garrafas de água', icon: '💪', muscleGroup: 'Bíceps' },
      { id: '6', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue todos os músculos trabalhados', icon: '🙆', muscleGroup: 'Corpo todo' },
    ]
  },
  // TREINOS INICIANTES
  {
    id: 'beginner-full',
    name: 'Full Body Iniciante',
    description: 'Treino completo para quem está começando',
    duration: 25,
    difficulty: 'Iniciante',
    calories: 150,
    color: 'from-green-400 to-emerald-500',
    icon: '🌱',
    forPregnant: false,
    category: 'Iniciante',
    exercises: [
      { id: '1', name: 'Aquecimento', duration: 180, restTime: 30, description: 'Polichinelos leves e rotações', icon: '🔥', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Agachamento', duration: 45, reps: 15, sets: 3, restTime: 45, description: 'Pés na largura dos ombros, desça controlado', icon: '🦵', muscleGroup: 'Pernas' },
      { id: '3', name: 'Flexão no joelho', duration: 45, reps: 10, sets: 3, restTime: 45, description: 'Apoie joelhos no chão', icon: '💪', muscleGroup: 'Peito' },
      { id: '4', name: 'Prancha', duration: 30, sets: 3, restTime: 30, description: 'Mantenha corpo reto', icon: '🧘', muscleGroup: 'Core' },
      { id: '5', name: 'Avanço alternado', duration: 45, reps: 10, sets: 3, restTime: 45, description: 'Dê um passo à frente e flexione', icon: '🚶', muscleGroup: 'Pernas' },
      { id: '6', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue todo o corpo', icon: '🙆', muscleGroup: 'Corpo todo' },
    ]
  },
  {
    id: 'beginner-lower',
    name: 'Pernas Iniciante',
    description: 'Foco em membros inferiores',
    duration: 20,
    difficulty: 'Iniciante',
    calories: 130,
    color: 'from-blue-400 to-cyan-500',
    icon: '🦵',
    forPregnant: false,
    category: 'Iniciante',
    exercises: [
      { id: '1', name: 'Aquecimento', duration: 120, restTime: 30, description: 'Marcha no lugar', icon: '🔥', muscleGroup: 'Pernas' },
      { id: '2', name: 'Agachamento', duration: 45, reps: 15, sets: 3, restTime: 45, description: 'Agachamento básico', icon: '🦵', muscleGroup: 'Quadríceps' },
      { id: '3', name: 'Elevação de panturrilha', duration: 45, reps: 20, sets: 3, restTime: 30, description: 'Na ponta dos pés', icon: '🦶', muscleGroup: 'Panturrilha' },
      { id: '4', name: 'Ponte de glúteos', duration: 45, reps: 15, sets: 3, restTime: 45, description: 'Eleve o quadril deitado', icon: '🍑', muscleGroup: 'Glúteos' },
      { id: '5', name: 'Abdução de quadril', duration: 45, reps: 12, sets: 3, restTime: 30, description: 'Deitada de lado, eleve a perna', icon: '🦿', muscleGroup: 'Glúteo médio' },
      { id: '6', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue pernas e glúteos', icon: '🙆', muscleGroup: 'Pernas' },
    ]
  },
  // TREINOS INTERMEDIÁRIOS
  {
    id: 'intermediate-hiit',
    name: 'HIIT 20 minutos',
    description: 'Treino intenso e rápido',
    duration: 20,
    difficulty: 'Intermediário',
    calories: 250,
    color: 'from-orange-400 to-red-500',
    icon: '🔥',
    forPregnant: false,
    category: 'Intermediário',
    exercises: [
      { id: '1', name: 'Aquecimento dinâmico', duration: 120, restTime: 30, description: 'Polichinelos e corrida no lugar', icon: '⚡', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Burpees', duration: 30, sets: 4, restTime: 30, description: '30 segundos máximo esforço', icon: '💥', muscleGroup: 'Corpo todo' },
      { id: '3', name: 'Mountain climbers', duration: 30, sets: 4, restTime: 30, description: 'Joelhos alternados rápido', icon: '🏔️', muscleGroup: 'Core' },
      { id: '4', name: 'Jump squats', duration: 30, sets: 4, restTime: 30, description: 'Agachamento com salto', icon: '🦘', muscleGroup: 'Pernas' },
      { id: '5', name: 'Prancha com toque ombro', duration: 30, sets: 4, restTime: 30, description: 'Alterne toques nos ombros', icon: '🤚', muscleGroup: 'Core e ombros' },
      { id: '6', name: 'High knees', duration: 30, sets: 4, restTime: 30, description: 'Joelhos altos correndo', icon: '🏃', muscleGroup: 'Cardio' },
      { id: '7', name: 'Desaquecimento', duration: 180, restTime: 0, description: 'Caminhada e alongamento', icon: '🚶', muscleGroup: 'Recuperação' },
    ]
  },
  {
    id: 'intermediate-core',
    name: 'Core Intenso',
    description: 'Abdômen e lombar definidos',
    duration: 25,
    difficulty: 'Intermediário',
    calories: 180,
    color: 'from-purple-400 to-violet-500',
    icon: '🎯',
    forPregnant: false,
    category: 'Intermediário',
    exercises: [
      { id: '1', name: 'Aquecimento core', duration: 120, restTime: 30, description: 'Rotações e mobilidade', icon: '🔥', muscleGroup: 'Core' },
      { id: '2', name: 'Prancha frontal', duration: 45, sets: 4, restTime: 30, description: 'Corpo reto, core contraído', icon: '🧘', muscleGroup: 'Abdômen' },
      { id: '3', name: 'Prancha lateral', duration: 30, sets: 3, restTime: 30, description: 'Cada lado', icon: '📐', muscleGroup: 'Oblíquos' },
      { id: '4', name: 'Bicicleta', duration: 45, reps: 20, sets: 3, restTime: 30, description: 'Cotovelo no joelho oposto', icon: '🚴', muscleGroup: 'Abdômen' },
      { id: '5', name: 'Canivete', duration: 45, reps: 15, sets: 3, restTime: 30, description: 'Mãos e pés se encontram', icon: '✂️', muscleGroup: 'Reto abdominal' },
      { id: '6', name: 'Superman', duration: 45, reps: 15, sets: 3, restTime: 30, description: 'Fortaleça a lombar', icon: '🦸', muscleGroup: 'Lombar' },
      { id: '7', name: 'Dead bug', duration: 45, reps: 12, sets: 3, restTime: 30, description: 'Braço e perna opostos', icon: '🐞', muscleGroup: 'Core profundo' },
      { id: '8', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue abdômen e costas', icon: '🙆', muscleGroup: 'Core' },
    ]
  },
  {
    id: 'intermediate-upper',
    name: 'Upper Body',
    description: 'Braços, peito e costas',
    duration: 30,
    difficulty: 'Intermediário',
    calories: 200,
    color: 'from-indigo-400 to-blue-500',
    icon: '💪',
    forPregnant: false,
    category: 'Intermediário',
    exercises: [
      { id: '1', name: 'Aquecimento', duration: 120, restTime: 30, description: 'Rotações de ombro e braço', icon: '🔥', muscleGroup: 'Ombros' },
      { id: '2', name: 'Flexão tradicional', duration: 45, reps: 12, sets: 4, restTime: 45, description: 'Desça até o peito quase tocar', icon: '💪', muscleGroup: 'Peito' },
      { id: '3', name: 'Flexão diamante', duration: 45, reps: 10, sets: 3, restTime: 45, description: 'Mãos formando diamante', icon: '💎', muscleGroup: 'Tríceps' },
      { id: '4', name: 'Pike push-up', duration: 45, reps: 10, sets: 3, restTime: 45, description: 'Quadril elevado, foco ombros', icon: '🔺', muscleGroup: 'Ombros' },
      { id: '5', name: 'Dips na cadeira', duration: 45, reps: 12, sets: 3, restTime: 45, description: 'Apoie nas mãos, flexione cotovelos', icon: '🪑', muscleGroup: 'Tríceps' },
      { id: '6', name: 'Remada invertida', duration: 45, reps: 12, sets: 3, restTime: 45, description: 'Use mesa ou barra baixa', icon: '🚣', muscleGroup: 'Costas' },
      { id: '7', name: 'Alongamento', duration: 180, restTime: 0, description: 'Alongue peito, costas e braços', icon: '🙆', muscleGroup: 'Superior' },
    ]
  },
  // TREINOS AVANÇADOS
  {
    id: 'advanced-full',
    name: 'Full Body Avançado',
    description: 'Treino completo de alta intensidade',
    duration: 40,
    difficulty: 'Avançado',
    calories: 400,
    color: 'from-red-500 to-rose-600',
    icon: '🏆',
    forPregnant: false,
    category: 'Avançado',
    exercises: [
      { id: '1', name: 'Aquecimento intenso', duration: 180, restTime: 30, description: 'Burpees leves e mobilidade', icon: '🔥', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Burpee com flexão', duration: 45, reps: 15, sets: 4, restTime: 45, description: 'Burpee completo com flexão', icon: '💥', muscleGroup: 'Corpo todo' },
      { id: '3', name: 'Pistol squat', duration: 45, reps: 8, sets: 3, restTime: 60, description: 'Agachamento unilateral', icon: '🔫', muscleGroup: 'Pernas' },
      { id: '4', name: 'Flexão arqueiro', duration: 45, reps: 8, sets: 3, restTime: 45, description: 'Desloque peso para um lado', icon: '🏹', muscleGroup: 'Peito' },
      { id: '5', name: 'L-sit hold', duration: 20, sets: 4, restTime: 45, description: 'Mantenha pernas paralelas ao chão', icon: '🔷', muscleGroup: 'Core' },
      { id: '6', name: 'Handstand hold', duration: 30, sets: 4, restTime: 60, description: 'Parada de mão na parede', icon: '🤸', muscleGroup: 'Ombros e core' },
      { id: '7', name: 'Box jumps', duration: 45, reps: 12, sets: 4, restTime: 45, description: 'Saltos em caixa ou step', icon: '📦', muscleGroup: 'Pernas' },
      { id: '8', name: 'Desaquecimento', duration: 300, restTime: 0, description: 'Alongamento profundo', icon: '🧘', muscleGroup: 'Recuperação' },
    ]
  },
  {
    id: 'advanced-tabata',
    name: 'Tabata Extremo',
    description: '4 minutos que valem por 40',
    duration: 25,
    difficulty: 'Avançado',
    calories: 350,
    color: 'from-yellow-500 to-orange-600',
    icon: '⚡',
    forPregnant: false,
    category: 'Avançado',
    exercises: [
      { id: '1', name: 'Aquecimento', duration: 180, restTime: 30, description: 'Prepare o corpo', icon: '🔥', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Tabata 1: Burpees', duration: 20, sets: 8, restTime: 10, description: '20s esforço, 10s descanso', icon: '💥', muscleGroup: 'Corpo todo' },
      { id: '3', name: 'Descanso ativo', duration: 60, restTime: 0, description: 'Caminhada leve', icon: '🚶', muscleGroup: 'Recuperação' },
      { id: '4', name: 'Tabata 2: Jump squats', duration: 20, sets: 8, restTime: 10, description: '20s esforço, 10s descanso', icon: '🦘', muscleGroup: 'Pernas' },
      { id: '5', name: 'Descanso ativo', duration: 60, restTime: 0, description: 'Caminhada leve', icon: '🚶', muscleGroup: 'Recuperação' },
      { id: '6', name: 'Tabata 3: Mountain climbers', duration: 20, sets: 8, restTime: 10, description: '20s esforço, 10s descanso', icon: '🏔️', muscleGroup: 'Core' },
      { id: '7', name: 'Desaquecimento', duration: 300, restTime: 0, description: 'Alongamento completo', icon: '🧘', muscleGroup: 'Recuperação' },
    ]
  },
  // TREINOS ESPECIAIS
  {
    id: 'morning-energy',
    name: 'Energia Matinal',
    description: 'Acorde seu corpo em 10 minutos',
    duration: 10,
    difficulty: 'Iniciante',
    calories: 60,
    color: 'from-amber-400 to-yellow-500',
    icon: '☀️',
    forPregnant: true,
    category: 'Especial',
    exercises: [
      { id: '1', name: 'Espreguiçar', duration: 60, restTime: 15, description: 'Estique todo o corpo na cama', icon: '🛏️', muscleGroup: 'Corpo todo' },
      { id: '2', name: 'Gato-vaca', duration: 60, restTime: 15, description: 'Mobilize a coluna', icon: '🐱', muscleGroup: 'Coluna' },
      { id: '3', name: 'Torção sentada', duration: 45, restTime: 15, description: 'Gire o tronco para cada lado', icon: '🔄', muscleGroup: 'Coluna' },
      { id: '4', name: 'Marcha no lugar', duration: 90, restTime: 15, description: 'Ative a circulação', icon: '🚶', muscleGroup: 'Pernas' },
      { id: '5', name: 'Respiração energizante', duration: 60, restTime: 0, description: '10 respirações profundas', icon: '🌬️', muscleGroup: 'Respiração' },
    ]
  },
  {
    id: 'night-relax',
    name: 'Relaxamento Noturno',
    description: 'Prepare-se para dormir bem',
    duration: 15,
    difficulty: 'Iniciante',
    calories: 40,
    color: 'from-indigo-500 to-purple-600',
    icon: '🌙',
    forPregnant: true,
    category: 'Especial',
    exercises: [
      { id: '1', name: 'Respiração 4-7-8', duration: 120, restTime: 30, description: 'Inspire 4s, segure 7s, expire 8s', icon: '🌬️', muscleGroup: 'Relaxamento' },
      { id: '2', name: 'Alongamento pescoço', duration: 60, restTime: 15, description: 'Incline a cabeça suavemente', icon: '🦒', muscleGroup: 'Pescoço' },
      { id: '3', name: 'Alongamento ombros', duration: 60, restTime: 15, description: 'Cruze um braço sobre o peito', icon: '💪', muscleGroup: 'Ombros' },
      { id: '4', name: 'Torção deitada', duration: 90, restTime: 30, description: 'Joelhos para um lado, olhe pro outro', icon: '🔄', muscleGroup: 'Coluna' },
      { id: '5', name: 'Pernas na parede', duration: 180, restTime: 30, description: 'Deite e apoie pernas na parede', icon: '🦵', muscleGroup: 'Pernas e circulação' },
      { id: '6', name: 'Relaxamento final', duration: 180, restTime: 0, description: 'Feche os olhos e relaxe', icon: '😴', muscleGroup: 'Mente' },
    ]
  },
  {
    id: 'desk-break',
    name: 'Pausa do Trabalho',
    description: 'Alivie a tensão do escritório',
    duration: 8,
    difficulty: 'Iniciante',
    calories: 30,
    color: 'from-cyan-400 to-teal-500',
    icon: '💼',
    forPregnant: true,
    category: 'Especial',
    exercises: [
      { id: '1', name: 'Rotação de pescoço', duration: 45, restTime: 10, description: 'Gire a cabeça suavemente', icon: '🔄', muscleGroup: 'Pescoço' },
      { id: '2', name: 'Elevação de ombros', duration: 45, restTime: 10, description: 'Suba os ombros até as orelhas', icon: '⬆️', muscleGroup: 'Ombros' },
      { id: '3', name: 'Torção sentada', duration: 45, restTime: 10, description: 'Gire o tronco na cadeira', icon: '🪑', muscleGroup: 'Coluna' },
      { id: '4', name: 'Alongamento de pulso', duration: 45, restTime: 10, description: 'Estenda e flexione os pulsos', icon: '🤚', muscleGroup: 'Punhos' },
      { id: '5', name: 'Agachamento na cadeira', duration: 45, reps: 10, restTime: 10, description: 'Levante e sente repetidamente', icon: '🪑', muscleGroup: 'Pernas' },
      { id: '6', name: 'Caminhada curta', duration: 60, restTime: 0, description: 'Dê uma volta pelo ambiente', icon: '🚶', muscleGroup: 'Circulação' },
    ]
  },
  {
    id: 'stretch-full',
    name: 'Alongamento Completo',
    description: 'Flexibilidade para todo o corpo',
    duration: 20,
    difficulty: 'Iniciante',
    calories: 50,
    color: 'from-emerald-400 to-green-500',
    icon: '🧘',
    forPregnant: true,
    category: 'Especial',
    exercises: [
      { id: '1', name: 'Pescoço', duration: 60, restTime: 15, description: 'Incline para todos os lados', icon: '🦒', muscleGroup: 'Pescoço' },
      { id: '2', name: 'Ombros e braços', duration: 90, restTime: 15, description: 'Cruze braços e estenda', icon: '💪', muscleGroup: 'Ombros' },
      { id: '3', name: 'Peito na parede', duration: 60, restTime: 15, description: 'Braço na parede, gire o corpo', icon: '🫁', muscleGroup: 'Peito' },
      { id: '4', name: 'Gato-vaca', duration: 90, restTime: 15, description: 'Mobilidade da coluna', icon: '🐱', muscleGroup: 'Coluna' },
      { id: '5', name: 'Alongamento lateral', duration: 60, restTime: 15, description: 'Incline o tronco para cada lado', icon: '↔️', muscleGroup: 'Oblíquos' },
      { id: '6', name: 'Quadríceps', duration: 60, restTime: 15, description: 'Puxe o pé em direção ao glúteo', icon: '🦵', muscleGroup: 'Frente da coxa' },
      { id: '7', name: 'Isquiotibiais', duration: 90, restTime: 15, description: 'Perna estendida, toque os pés', icon: '🦿', muscleGroup: 'Posterior coxa' },
      { id: '8', name: 'Piriforme', duration: 90, restTime: 15, description: 'Tornozelo no joelho oposto', icon: '🍑', muscleGroup: 'Glúteos' },
      { id: '9', name: 'Panturrilha', duration: 60, restTime: 0, description: 'Apoie na parede e empurre', icon: '🦶', muscleGroup: 'Panturrilha' },
    ]
  },
]

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: '📋' },
  { id: 'Gestante', name: 'Gestante', icon: '🤰' },
  { id: 'Iniciante', name: 'Iniciante', icon: '🌱' },
  { id: 'Intermediário', name: 'Intermediário', icon: '💪' },
  { id: 'Avançado', name: 'Avançado', icon: '🏆' },
  { id: 'Especial', name: 'Especial', icon: '✨' },
]

export default function WorkoutPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isResting, setIsResting] = useState(false)
  const [completedExercises, setCompletedExercises] = useState<string[]>([])
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0)
  const [userPhase, setUserPhase] = useState('ACTIVE')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadUserPhase()
  }, [])

  const loadUserPhase = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('phase').eq('id', user.id).single()
        if (data?.phase) setUserPhase(data.phase)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredWorkouts = WORKOUTS.filter(w => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'Gestante') return w.forPregnant
    return w.category === selectedCategory || w.difficulty === selectedCategory
  })

  useEffect(() => {
    if (isTraining && !isPaused && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    } else if (timeLeft === 0 && isTraining) {
      handleExerciseComplete()
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, isTraining, isPaused])

  const startWorkout = (workout: Workout) => {
    setSelectedWorkout(workout)
    setCurrentExerciseIndex(0)
    setCompletedExercises([])
    setTotalCaloriesBurned(0)
    setIsTraining(true)
    setIsResting(false)
    setTimeLeft(workout.exercises[0].duration)
  }

  const handleExerciseComplete = () => {
    if (!selectedWorkout) return
    
    const currentExercise = selectedWorkout.exercises[currentExerciseIndex]
    
    if (isResting) {
      setIsResting(false)
      if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
        setCurrentExerciseIndex(i => i + 1)
        setTimeLeft(selectedWorkout.exercises[currentExerciseIndex + 1].duration)
      } else {
        finishWorkout()
      }
    } else {
      setCompletedExercises(prev => [...prev, currentExercise.id])
      const calPerExercise = selectedWorkout.calories / selectedWorkout.exercises.length
      setTotalCaloriesBurned(prev => prev + calPerExercise)
      
      if (currentExercise.restTime > 0) {
        setIsResting(true)
        setTimeLeft(currentExercise.restTime)
      } else if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
        setCurrentExerciseIndex(i => i + 1)
        setTimeLeft(selectedWorkout.exercises[currentExerciseIndex + 1].duration)
      } else {
        finishWorkout()
      }
    }
  }

  const finishWorkout = async () => {
    setIsTraining(false)
    // Salvar no banco
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && selectedWorkout) {
        await supabase.from('workouts').insert({
          user_id: user.id,
          name: selectedWorkout.name,
          duration: selectedWorkout.duration,
          calories_burned: Math.round(totalCaloriesBurned),
          exercises_completed: completedExercises.length,
          completed: true
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const skipExercise = () => {
    if (!selectedWorkout) return
    if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
      setIsResting(false)
      setCurrentExerciseIndex(i => i + 1)
      setTimeLeft(selectedWorkout.exercises[currentExerciseIndex + 1].duration)
    } else {
      finishWorkout()
    }
  }

  // Tela de treino ativo
  if (isTraining && selectedWorkout) {
    const currentExercise = selectedWorkout.exercises[currentExerciseIndex]
    const progress = ((currentExerciseIndex + 1) / selectedWorkout.exercises.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 text-white p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setIsTraining(false); setSelectedWorkout(null) }} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <span className="text-lg font-medium">{selectedWorkout.name}</span>
          <div className="w-10" />
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>{currentExerciseIndex + 1}/{selectedWorkout.exercises.length}</span>
            <span>{Math.round(totalCaloriesBurned)} kcal</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div className="h-full bg-white" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Exercise Info */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            key={`${currentExerciseIndex}-${isResting}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8"
          >
            <div className="text-8xl mb-4">{isResting ? '😮‍💨' : currentExercise.icon}</div>
            <h2 className="text-2xl font-bold mb-2">
              {isResting ? 'Descanse' : currentExercise.name}
            </h2>
            <p className="text-white/80 max-w-xs mx-auto">
              {isResting ? 'Respire fundo e prepare-se' : currentExercise.description}
            </p>
            {currentExercise.reps && !isResting && (
              <p className="mt-2 text-lg font-semibold">{currentExercise.reps} repetições × {currentExercise.sets} séries</p>
            )}
          </motion.div>

          {/* Timer */}
          <div className="mb-8">
            <div className="text-7xl font-bold mb-4">{formatTime(timeLeft)}</div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-16 h-16 rounded-full bg-white text-primary-600 flex items-center justify-center shadow-lg"
              >
                {isPaused ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />}
              </button>
              <button
                onClick={skipExercise}
                className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Next Exercise */}
          {currentExerciseIndex < selectedWorkout.exercises.length - 1 && (
            <div className="bg-white/10 rounded-xl p-4 w-full max-w-sm">
              <p className="text-sm text-white/60 mb-1">Próximo:</p>
              <p className="font-medium">
                {selectedWorkout.exercises[currentExerciseIndex + 1].icon} {selectedWorkout.exercises[currentExerciseIndex + 1].name}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Tela de conclusão
  if (selectedWorkout && !isTraining && completedExercises.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-8xl mb-6">🎉</motion.div>
        <h1 className="text-3xl font-bold mb-2">Parabéns!</h1>
        <p className="text-xl mb-8">Você completou o treino!</p>
        
        <div className="bg-white/10 rounded-2xl p-6 w-full max-w-sm mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Flame className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{Math.round(totalCaloriesBurned)}</p>
              <p className="text-sm text-white/60">calorias</p>
            </div>
            <div>
              <Timer className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{selectedWorkout.duration}</p>
              <p className="text-sm text-white/60">minutos</p>
            </div>
            <div>
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">{completedExercises.length}</p>
              <p className="text-sm text-white/60">exercícios</p>
            </div>
            <div>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-2xl font-bold">+{selectedWorkout.duration * 2}</p>
              <p className="text-sm text-white/60">pontos</p>
            </div>
          </div>
        </div>

        <button onClick={() => { setSelectedWorkout(null); setCompletedExercises([]) }} className="btn bg-white text-green-600 px-8 py-3 rounded-full font-semibold">
          Voltar aos Treinos
        </button>
      </div>
    )
  }

  // Lista de treinos
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Treinos</h1>
            <p className="text-sm text-gray-500">{filteredWorkouts.length} treinos disponíveis</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filtro por categoria */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Aviso para gestantes */}
        {userPhase === 'PREGNANT' && selectedCategory === 'all' && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
            <p className="text-pink-800 text-sm">
              🤰 <strong>Dica:</strong> Filtre por "Gestante" para ver treinos seguros para você!
            </p>
          </div>
        )}

        {/* Lista de treinos */}
        <div className="grid gap-4">
          {filteredWorkouts.map(workout => (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${workout.color} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{workout.icon}</span>
                      <h3 className="text-lg font-bold">{workout.name}</h3>
                    </div>
                    <p className="text-white/80 text-sm">{workout.description}</p>
                  </div>
                  {workout.forPregnant && (
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">🤰 Seguro</span>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {workout.duration} min</span>
                    <span className="flex items-center gap-1"><Flame className="w-4 h-4" /> {workout.calories} kcal</span>
                    <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {workout.exercises.length} exercícios</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    workout.difficulty === 'Iniciante' ? 'bg-green-100 text-green-700' :
                    workout.difficulty === 'Intermediário' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {workout.difficulty}
                  </span>
                </div>

                <button
                  onClick={() => startWorkout(workout)}
                  className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Iniciar Treino
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
