'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, X, Check, Dumbbell, Clock, Flame, Target,
  ArrowLeft, SkipForward, Info, Trophy, Heart, Star, Filter,
  ChevronRight, Repeat, Lock
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Exercise {
  name: string
  duration: number
  reps?: number
  description: string
  tips: string[]
  muscle?: string
}

interface Workout {
  id: string
  name: string
  description: string
  duration: number
  calories: number
  difficulty: string
  category: string
  forPregnant: boolean
  color: string
  icon: string
  exercises: Exercise[]
  premium?: boolean
}

const WORKOUTS: Workout[] = [
  // === GESTANTE ===
  {
    id: 'gestante-1', name: 'Gestante Iniciante', description: 'Treino leve e seguro para o 1º trimestre',
    duration: 15, calories: 80, difficulty: 'Iniciante', category: 'Gestante', forPregnant: true,
    color: 'from-pink-400 to-rose-500', icon: '🤰',
    exercises: [
      { name: 'Respiração Diafragmática', duration: 120, description: 'Inspire pelo nariz expandindo o abdômen, expire pela boca', tips: ['Relaxe os ombros', 'Mãos na barriga para sentir o movimento'] },
      { name: 'Marcha no Lugar', duration: 90, description: 'Caminhe no lugar elevando os joelhos suavemente', tips: ['Postura ereta', 'Braços acompanham'] },
      { name: 'Agachamento com Apoio', duration: 60, reps: 10, description: 'Segure na cadeira e desça controladamente', tips: ['Joelhos alinhados com os pés', 'Não ultrapasse os dedos'] },
      { name: 'Elevação Lateral de Braços', duration: 60, reps: 12, description: 'Braços laterais até altura dos ombros', tips: ['Movimento controlado', 'Pode usar garrafinhas como peso'] },
      { name: 'Cat-Cow', duration: 90, description: 'De quatro apoios, alterne arredondando e arqueando a coluna', tips: ['Siga a respiração', 'Excelente para dor nas costas'] },
      { name: 'Alongamento Final', duration: 120, description: 'Pescoço, ombros, costas e pernas', tips: ['Respire profundamente em cada posição'] },
    ]
  },
  {
    id: 'gestante-2', name: 'Gestante Intermediário', description: 'Fortalecimento para o 2º trimestre',
    duration: 20, calories: 110, difficulty: 'Intermediário', category: 'Gestante', forPregnant: true,
    color: 'from-pink-500 to-fuchsia-500', icon: '🌸',
    exercises: [
      { name: 'Aquecimento', duration: 120, description: 'Rotações articulares e marcha leve', tips: ['Prepare o corpo gradualmente'] },
      { name: 'Ponte Glútea', duration: 60, reps: 12, description: 'Deitada, eleve o quadril', tips: ['Aperte os glúteos no topo', 'Mantenha os pés no chão'], muscle: 'Glúteos' },
      { name: 'Agachamento Sumo', duration: 45, reps: 10, description: 'Pés afastados, dedos para fora', tips: ['Desça até onde for confortável'], muscle: 'Pernas' },
      { name: 'Remada com Faixa', duration: 60, reps: 12, description: 'Puxe a faixa em direção ao peito', tips: ['Aperte as escápulas'], muscle: 'Costas' },
      { name: 'Plie Squat Pulse', duration: 45, reps: 15, description: 'Micro-agachamentos na posição baixa', tips: ['Mantenha a tensão'], muscle: 'Pernas' },
      { name: 'Bird Dog', duration: 60, reps: 8, description: 'Estenda braço e perna opostos', tips: ['Core ativado', 'Equilíbrio é o foco'], muscle: 'Core' },
      { name: 'Alongamento Profundo', duration: 150, description: 'Borboleta, pigeon pose modificada, rotação da coluna', tips: ['Nunca force', 'Respire em cada posição'] },
    ]
  },
  {
    id: 'gestante-3', name: 'Preparo para o Parto', description: 'Exercícios que ajudam no trabalho de parto',
    duration: 25, calories: 100, difficulty: 'Iniciante', category: 'Gestante', forPregnant: true,
    color: 'from-violet-400 to-purple-500', icon: '🦋',
    exercises: [
      { name: 'Respiração de Parto', duration: 180, description: 'Pratique padrões respiratórios para o trabalho de parto', tips: ['Inspire 4 seg, expire 6 seg', 'Relaxe o maxilar'] },
      { name: 'Agachamento Profundo', duration: 120, description: 'Segure na porta e desça profundamente', tips: ['Abre a pélvis', 'Mantenha 30-60 seg'] },
      { name: 'Balanço Pélvico', duration: 90, description: 'De quatro apoios, balance o quadril em círculos', tips: ['Alivia dor nas costas'] },
      { name: 'Borboleta Sentada', duration: 120, description: 'Sentada, junte os pés e balance os joelhos', tips: ['Abre o quadril'] },
      { name: 'Pressão na Parede', duration: 60, reps: 10, description: 'De frente para a parede, faça flexões leves', tips: ['Fortalece braços e peito'] },
      { name: 'Postura do Bêbe Feliz', duration: 120, description: 'Deitada de costas, segure os pés afastando os joelhos', tips: ['Alivia tensão lombar', 'Só faça se confortável no 3º trimestre'] },
      { name: 'Relaxamento Guiado', duration: 180, description: 'Deitada de lado com travesseiro, relaxe cada parte do corpo', tips: ['Pratique visualização positiva'] },
    ]
  },
  // === YOGA ===
  {
    id: 'yoga-1', name: 'Yoga Pré-Natal', description: 'Equilíbrio e flexibilidade para gestantes',
    duration: 25, calories: 100, difficulty: 'Iniciante', category: 'Yoga', forPregnant: true,
    color: 'from-purple-400 to-violet-500', icon: '🧘',
    exercises: [
      { name: 'Postura da Montanha', duration: 60, description: 'Em pé, pés na largura do quadril, respire profundamente', tips: ['Peso distribuído igualmente', 'Conecte-se com a respiração'] },
      { name: 'Gato-Vaca', duration: 90, description: 'De quatro, alterne arredondando e arqueando a coluna', tips: ['Siga a respiração', 'Movimentos lentos'] },
      { name: 'Postura da Criança Modificada', duration: 90, description: 'Joelhos afastados para acomodar a barriga', tips: ['Relaxe completamente', 'Braços estendidos para frente'] },
      { name: 'Guerreiro II', duration: 60, description: 'Pernas afastadas, braços estendidos lateralmente', tips: ['Não force o joelho', 'Olhe para a frente'] },
      { name: 'Árvore Modificada', duration: 60, description: 'Apoie na parede se necessário', tips: ['Foco em um ponto fixo', 'Pé abaixo do joelho'] },
      { name: 'Borboleta', duration: 90, description: 'Sentada, pés juntos, balance suavemente os joelhos', tips: ['Coluna ereta', 'Abre o quadril'] },
      { name: 'Savasana Lateral', duration: 180, description: 'Deite do lado esquerdo com travesseiro entre as pernas', tips: ['Use travesseiro sob a barriga', 'Relaxe completamente'] },
    ]
  },
  {
    id: 'yoga-flow', name: 'Yoga Flow Suave', description: 'Fluxo contínuo para energia e calma',
    duration: 30, calories: 130, difficulty: 'Intermediário', category: 'Yoga', forPregnant: false,
    color: 'from-indigo-400 to-blue-500', icon: '🌊',
    exercises: [
      { name: 'Saudação ao Sol (Modificada)', duration: 180, description: 'Sequência fluida de posturas', tips: ['Movimentos com a respiração'] },
      { name: 'Guerreiro I → II → III', duration: 120, description: 'Transição entre os guerreiros', tips: ['Foque no equilíbrio'] },
      { name: 'Triângulo', duration: 90, description: 'Pernas afastadas, incline lateralmente', tips: ['Mantenha as pernas retas'] },
      { name: 'Prancha → Cachorro Olhando para Baixo', duration: 90, description: 'Flua entre as duas posturas', tips: ['Distribua o peso igualmente'] },
      { name: 'Pomba', duration: 120, description: 'Abertura profunda do quadril', tips: ['Use bloco se necessário'] },
      { name: 'Ponte', duration: 90, description: 'Eleve o quadril suavemente', tips: ['Aperte os glúteos'] },
      { name: 'Torção Deitada', duration: 120, description: 'Joelhos para um lado, olhe para o outro', tips: ['Ombros no chão'] },
      { name: 'Savasana', duration: 300, description: 'Relaxamento profundo final', tips: ['Solte todo o corpo', '5 minutos de total entrega'] },
    ]
  },
  // === FULL BODY ===
  {
    id: 'fullbody-1', name: 'Full Body Express', description: 'Treino completo em pouco tempo',
    duration: 20, calories: 150, difficulty: 'Iniciante', category: 'Full Body', forPregnant: false,
    color: 'from-green-400 to-emerald-500', icon: '💪',
    exercises: [
      { name: 'Aquecimento Articular', duration: 120, description: 'Rotações de pescoço, ombro, quadril, tornozelo', tips: ['Aqueça todas as articulações'] },
      { name: 'Polichinelos', duration: 45, reps: 20, description: 'Salte abrindo braços e pernas', tips: ['Core ativado', 'Aterrisse suave'] },
      { name: 'Agachamento', duration: 45, reps: 15, description: 'Desça como se fosse sentar numa cadeira', tips: ['Peso nos calcanhares', 'Coluna neutra'] },
      { name: 'Flexão (Joelhos)', duration: 45, reps: 10, description: 'Apoie os joelhos no chão', tips: ['Corpo em linha', 'Desça controlado'] },
      { name: 'Prancha', duration: 30, description: 'Mantenha o corpo reto', tips: ['Core contraído', 'Não deixe o quadril cair'] },
      { name: 'Afundo Alternado', duration: 60, reps: 12, description: 'Passo à frente, desça o joelho traseiro', tips: ['90° em ambos os joelhos'] },
      { name: 'Superman', duration: 45, reps: 10, description: 'De bruços, eleve braços e pernas', tips: ['Contraia as costas'] },
      { name: 'Alongamento Completo', duration: 120, description: 'Todos os grupos musculares', tips: ['Respire e segure 20 seg cada'] },
    ]
  },
  {
    id: 'fullbody-2', name: 'Full Body Desafio', description: 'Treino intenso para todo o corpo',
    duration: 35, calories: 280, difficulty: 'Avançado', category: 'Full Body', forPregnant: false,
    color: 'from-emerald-500 to-teal-600', icon: '🦾',
    exercises: [
      { name: 'Aquecimento Dinâmico', duration: 180, description: 'Corrida no lugar + polichinelos + mobilidade', tips: ['5 min para aquecer bem'] },
      { name: 'Burpees', duration: 45, reps: 10, description: 'Completo com flexão e salto', tips: ['Máximo esforço'] },
      { name: 'Agachamento com Salto', duration: 45, reps: 12, description: 'Agache e salte', tips: ['Aterrisse suave'] },
      { name: 'Flexão Diamante', duration: 45, reps: 8, description: 'Mãos juntas formando diamante', tips: ['Foco no tríceps'] },
      { name: 'Prancha com Toque no Ombro', duration: 60, description: 'Em prancha, toque ombros alternadamente', tips: ['Não rotacione o quadril'] },
      { name: 'Avanço com Torção', duration: 45, reps: 10, description: 'Afundo + rotação do tronco', tips: ['Core o tempo todo'] },
      { name: 'Mountain Climbers', duration: 45, description: 'Corrida na posição de prancha', tips: ['Ritmo acelerado'] },
      { name: 'Hip Thrust', duration: 60, reps: 15, description: 'Costas no sofá, eleve o quadril', tips: ['Aperte forte os glúteos'] },
      { name: 'Russian Twist', duration: 45, reps: 20, description: 'Sentada, rotacione o tronco com os pés elevados', tips: ['Pés no ar para mais desafio'] },
      { name: 'Alongamento Profundo', duration: 180, description: 'Foco nos músculos trabalhados', tips: ['Segure cada posição 30 seg'] },
    ]
  },
  // === CARDIO ===
  {
    id: 'hiit-1', name: 'HIIT Queima Total', description: 'Intervalos de alta intensidade',
    duration: 20, calories: 250, difficulty: 'Intermediário', category: 'Cardio', forPregnant: false,
    color: 'from-orange-400 to-red-500', icon: '🔥',
    exercises: [
      { name: 'Aquecimento', duration: 120, description: 'Corrida leve no lugar', tips: ['Gradual, não comece forte'] },
      { name: 'Burpees', duration: 30, reps: 8, description: 'Movimento completo', tips: ['30 seg trabalho, 15 seg descanso'] },
      { name: 'Mountain Climbers', duration: 30, description: 'Corrida na prancha, rápido', tips: ['Quadril baixo'] },
      { name: 'Jump Squats', duration: 30, reps: 12, description: 'Agachamento com salto', tips: ['Aterrisse suave nos joelhos'] },
      { name: 'Prancha Toque Ombro', duration: 30, description: 'Toque ombros alternados em prancha', tips: ['Core firme, sem balançar'] },
      { name: 'High Knees', duration: 30, description: 'Corrida com joelhos altos', tips: ['Máxima velocidade'] },
      { name: 'Skater Jumps', duration: 30, reps: 10, description: 'Saltos laterais como patinadora', tips: ['Equilíbrio no pouso'] },
      { name: 'Recuperação', duration: 120, description: 'Caminhada leve e respiração', tips: ['Deixe a frequência cardíaca baixar'] },
    ]
  },
  {
    id: 'dance-cardio', name: 'Dance Cardio', description: 'Dançar para queimar calorias',
    duration: 25, calories: 200, difficulty: 'Iniciante', category: 'Cardio', forPregnant: false,
    color: 'from-pink-500 to-red-400', icon: '💃',
    exercises: [
      { name: 'Aquecimento Musical', duration: 120, description: 'Marcha no lugar com movimentos de braço', tips: ['Escolha sua música favorita!'] },
      { name: 'Step Touch', duration: 90, description: 'Passo lateral alternado com balanço de braços', tips: ['Siga o ritmo'] },
      { name: 'Grapevine', duration: 90, description: 'Passo cruzado lateral ida e volta', tips: ['Coordenação braço-perna'] },
      { name: 'Mambo', duration: 90, description: 'Passo à frente e volta com quadril', tips: ['Solte o quadril!'] },
      { name: 'Kick Ball Change', duration: 90, description: 'Chute à frente com troca rápida de pés', tips: ['Diversão é o foco'] },
      { name: 'Freestyle', duration: 180, description: 'Dance livremente!', tips: ['Sem julgamento, só divirta-se', 'Movimente todo o corpo'] },
      { name: 'Volta à Calma', duration: 120, description: 'Movimentos lentos e alongamento', tips: ['Respire fundo'] },
    ]
  },
  // === ESPECIAIS ===
  {
    id: 'matinal', name: 'Energia Matinal', description: 'Desperte o corpo em 10 minutos',
    duration: 10, calories: 50, difficulty: 'Iniciante', category: 'Especial', forPregnant: true,
    color: 'from-amber-400 to-yellow-500', icon: '☀️',
    exercises: [
      { name: 'Espreguiçar', duration: 60, description: 'Na cama mesmo, estique todo o corpo', tips: ['Natural e gostoso'] },
      { name: 'Rotações Suaves', duration: 45, description: 'Pescoço e ombros em círculos lentos', tips: ['Olhos fechados'] },
      { name: 'Cat-Cow Matinal', duration: 60, description: 'De quatro, mobilize a coluna', tips: ['Respire com o movimento'] },
      { name: 'Marcha Energética', duration: 120, description: 'Aumente o ritmo gradualmente', tips: ['Levante os joelhos'] },
      { name: 'Respiração Energizante', duration: 60, description: '10 respirações profundas e rápidas', tips: ['Sinta a energia subir'] },
    ]
  },
  {
    id: 'noturno', name: 'Relaxamento Noturno', description: 'Prepare o corpo para dormir bem',
    duration: 15, calories: 30, difficulty: 'Iniciante', category: 'Especial', forPregnant: true,
    color: 'from-blue-600 to-indigo-700', icon: '🌙',
    exercises: [
      { name: 'Respiração 4-7-8', duration: 120, description: 'Inspire 4s, segure 7s, expire 8s', tips: ['Técnica calmante para insônia'] },
      { name: 'Alongamento de Pescoço', duration: 60, description: 'Incline a cabeça para cada lado', tips: ['Ombros relaxados'] },
      { name: 'Rotação de Coluna Deitada', duration: 90, description: 'Joelhos para cada lado, ombros no chão', tips: ['Respire fundo em cada lado'] },
      { name: 'Pernas na Parede', duration: 120, description: 'Eleve as pernas contra a parede', tips: ['Alivia pernas cansadas', 'Ótimo para gestantes'] },
      { name: 'Body Scan', duration: 180, description: 'Relaxe cada parte do corpo da cabeça aos pés', tips: ['Feche os olhos', 'Solte todas as tensões'] },
    ]
  },
  {
    id: 'pos-parto', name: 'Pós-Parto Suave', description: 'Recuperação gradual após o parto',
    duration: 15, calories: 60, difficulty: 'Iniciante', category: 'Especial', forPregnant: false,
    color: 'from-rose-400 to-pink-500', icon: '🌺',
    exercises: [
      { name: 'Respiração Abdominal', duration: 120, description: 'Reconecte com o assoalho pélvico', tips: ['Inspire expandindo, expire contraindo', 'Fundamento da recuperação'] },
      { name: 'Kegel', duration: 60, reps: 10, description: 'Contraia o assoalho pélvico por 5 seg', tips: ['Não segure a respiração', 'Essencial no pós-parto'] },
      { name: 'Ponte Suave', duration: 60, reps: 8, description: 'Eleve o quadril lentamente', tips: ['Ative glúteos e assoalho pélvico'] },
      { name: 'Marcha Suave', duration: 90, description: 'Caminhe no lugar com passos curtos', tips: ['Sem pressa', 'Ouça seu corpo'] },
      { name: 'Alongamento de Peito', duration: 60, description: 'Braços atrás, abra o peito', tips: ['Alivia tensão da amamentação'] },
      { name: 'Relaxamento', duration: 120, description: 'Deite confortavelmente e respire', tips: ['Você merece este momento'] },
    ]
  },
  // === FORÇA ===
  {
    id: 'upper', name: 'Upper Body', description: 'Braços, ombros e costas',
    duration: 25, calories: 180, difficulty: 'Intermediário', category: 'Força', forPregnant: false,
    color: 'from-sky-400 to-blue-500', icon: '💎',
    exercises: [
      { name: 'Aquecimento de Ombros', duration: 120, description: 'Rotações e braços cruzados', tips: ['Aqueça bem as articulações'] },
      { name: 'Flexão Convencional', duration: 45, reps: 12, description: 'Corpo reto, desça até o chão', tips: ['Cotovelos 45°'], muscle: 'Peito/Tríceps' },
      { name: 'Pike Push-Up', duration: 45, reps: 8, description: 'Quadril alto, flexão vertical', tips: ['Foco nos ombros'], muscle: 'Ombros' },
      { name: 'Remada Invertida (Mesa)', duration: 60, reps: 10, description: 'Sob uma mesa resistente, puxe o corpo', tips: ['Aperte as escápulas'], muscle: 'Costas' },
      { name: 'Tríceps na Cadeira', duration: 45, reps: 12, description: 'Mãos na cadeira, desça o corpo', tips: ['Cotovelos para trás'], muscle: 'Tríceps' },
      { name: 'Prancha com Remada', duration: 45, reps: 10, description: 'Em prancha, puxe um braço de cada vez', tips: ['Core estável'], muscle: 'Costas/Core' },
      { name: 'YTW na Parede', duration: 60, reps: 8, description: 'De bruços, faça formas Y, T e W com braços', tips: ['Fortalece postura'], muscle: 'Costas' },
      { name: 'Alongamento Upper', duration: 120, description: 'Braços, ombros, peito e costas', tips: ['Segure 20 seg cada'] },
    ]
  },
  {
    id: 'lower', name: 'Lower Body', description: 'Pernas e glúteos poderosos',
    duration: 25, calories: 200, difficulty: 'Intermediário', category: 'Força', forPregnant: false,
    color: 'from-orange-400 to-amber-500', icon: '🦵',
    exercises: [
      { name: 'Aquecimento', duration: 120, description: 'Marcha + agachamentos leves', tips: ['Prepare joelhos e quadril'] },
      { name: 'Agachamento', duration: 60, reps: 15, description: 'Profundo e controlado', tips: ['Peso nos calcanhares'], muscle: 'Quadríceps' },
      { name: 'Afundo Búlgaro', duration: 60, reps: 10, description: 'Pé traseiro elevado numa cadeira', tips: ['90° no joelho da frente'], muscle: 'Quadríceps/Glúteos' },
      { name: 'Hip Thrust', duration: 60, reps: 15, description: 'Costas no sofá, eleve o quadril', tips: ['Aperte os glúteos no topo'], muscle: 'Glúteos' },
      { name: 'Panturrilha', duration: 45, reps: 20, description: 'Na ponta dos pés, suba e desça', tips: ['Num degrau para amplitude'], muscle: 'Panturrilha' },
      { name: 'Cadeira na Parede', duration: 45, description: 'Costas na parede em 90°', tips: ['Aguente o máximo!'], muscle: 'Quadríceps' },
      { name: 'Abdução Lateral', duration: 60, reps: 15, description: 'De lado, eleve a perna', tips: ['Controle o movimento'], muscle: 'Glúteo Médio' },
      { name: 'Alongamento de Pernas', duration: 150, description: 'Isquiotibiais, quadríceps, panturrilha, quadril', tips: ['Respire e segure 30 seg'] },
    ]
  },
  {
    id: 'core', name: 'Core Destroyer', description: 'Abdômen e core de aço',
    duration: 15, calories: 120, difficulty: 'Intermediário', category: 'Força', forPregnant: false,
    color: 'from-red-500 to-rose-600', icon: '🎯',
    exercises: [
      { name: 'Prancha', duration: 45, description: 'Corpo reto, core apertado', tips: ['Não deixe o quadril cair'], muscle: 'Core completo' },
      { name: 'Crunch Bicicleta', duration: 45, reps: 20, description: 'Cotovelo toca joelho oposto', tips: ['Não puxe o pescoço'], muscle: 'Oblíquos' },
      { name: 'Leg Raises', duration: 45, reps: 12, description: 'Pernas retas, suba e desça', tips: ['Lombar no chão'], muscle: 'Abdômen inferior' },
      { name: 'Prancha Lateral', duration: 30, description: '30 seg cada lado', tips: ['Quadril alto'], muscle: 'Oblíquos' },
      { name: 'Dead Bug', duration: 45, reps: 10, description: 'Braço e perna opostos descem', tips: ['Lombar colada no chão'], muscle: 'Core profundo' },
      { name: 'Sit-Up Completo', duration: 45, reps: 15, description: 'Suba até tocar os pés', tips: ['Sem impulso'], muscle: 'Reto abdominal' },
      { name: 'Hollow Hold', duration: 30, description: 'Corpo em forma de banana', tips: ['Não arqueie as costas'], muscle: 'Core completo' },
    ]
  },
  // === PILATES ===
  {
    id: 'pilates-gestante', name: 'Pilates Gestante', description: 'Pilates adaptado para gestantes',
    duration: 25, calories: 120, difficulty: 'Iniciante', category: 'Pilates', forPregnant: true,
    color: 'from-rose-400 to-pink-500', icon: '🤸',
    exercises: [
      { name: 'Respiração Pilates', duration: 120, description: 'Inspire pelo nariz expandindo as costelas, expire contraindo o core', tips: ['Base de todo exercício de Pilates'] },
      { name: 'Pelvic Curl', duration: 60, reps: 10, description: 'Deitada, eleve quadril vértebra por vértebra', tips: ['Movimento articulado', 'Aperte glúteos no topo'], muscle: 'Glúteos/Core' },
      { name: 'Leg Circles', duration: 60, reps: 8, description: 'Deitada, faça círculos com a perna no ar', tips: ['Quadril estável', 'Movimentos pequenos'], muscle: 'Quadris' },
      { name: 'Side Kicks', duration: 60, reps: 10, description: 'De lado, chute para frente e para trás', tips: ['Tronco firme', 'Não balance'], muscle: 'Coxas' },
      { name: 'Swimming Modified', duration: 45, description: 'De quatro, estenda braço e perna opostos', tips: ['Core ativado o tempo todo'], muscle: 'Core/Costas' },
      { name: 'Spine Stretch', duration: 90, description: 'Sentada, incline para frente arredondando', tips: ['Vértebra por vértebra', 'Excelente para coluna'] },
      { name: 'Mermaid Stretch', duration: 90, description: 'Sentada, incline lateralmente', tips: ['Alonga as costelas', 'Ótimo para respiração'] },
    ]
  },
  {
    id: 'pilates-bola', name: 'Pilates com Bola', description: 'Exercícios com bola suíça para gestantes',
    duration: 20, calories: 100, difficulty: 'Iniciante', category: 'Pilates', forPregnant: true,
    color: 'from-fuchsia-400 to-pink-500', icon: '⚽',
    exercises: [
      { name: 'Bounce Suave', duration: 120, description: 'Sentada na bola, balance suavemente', tips: ['Relaxa a pélvis', 'Ótimo para o 3º trimestre'] },
      { name: 'Rotação Pélvica', duration: 90, description: 'Na bola, faça círculos com o quadril', tips: ['Alivia tensão lombar', 'Ideal antes do parto'] },
      { name: 'Wall Squat com Bola', duration: 60, reps: 12, description: 'Bola entre costas e parede, agache', tips: ['Joelhos não passam dos pés'], muscle: 'Pernas' },
      { name: 'Chest Press na Bola', duration: 45, reps: 10, description: 'Costas na bola, pressione halteres leves', tips: ['Quadril alto', 'Ative o core'], muscle: 'Peito' },
      { name: 'Ponte na Bola', duration: 45, reps: 10, description: 'Pés na bola, eleve o quadril', tips: ['Desafiador mas seguro'], muscle: 'Glúteos' },
      { name: 'Relaxamento na Bola', duration: 120, description: 'Abrace a bola e relaxe sobre ela', tips: ['Posição restaurativa', 'Ótima para dor nas costas'] },
    ]
  },
  // === KEGEL ===
  {
    id: 'kegel', name: 'Exercícios de Kegel', description: 'Fortalecimento do assoalho pélvico',
    duration: 10, calories: 20, difficulty: 'Iniciante', category: 'Especial', forPregnant: true,
    color: 'from-violet-400 to-purple-500', icon: '💎',
    exercises: [
      { name: 'Kegel Básico', duration: 120, description: 'Contraia os músculos do assoalho pélvico por 5 segundos, relaxe 5 segundos', tips: ['10 repetições', 'Não contraia abdômen ou coxas'] },
      { name: 'Kegel Rápido', duration: 60, description: 'Contraia e relaxe rapidamente', tips: ['20 repetições rápidas', 'Desenvolve reflexo muscular'] },
      { name: 'Elevador', duration: 90, description: 'Contraia gradualmente, como subindo andares de um elevador', tips: ['Suba 3 andares, desça 3', 'Controle fino dos músculos'] },
      { name: 'Ponte com Kegel', duration: 60, reps: 10, description: 'Faça ponte e contraia assoalho pélvico no topo', tips: ['Combina fortalecimento'], muscle: 'Glúteos/Pélvico' },
      { name: 'Kegel Sustentado', duration: 90, description: 'Contraia e mantenha por 10 segundos', tips: ['5 repetições', 'Respire normalmente durante'] },
      { name: 'Relaxamento Pélvico', duration: 60, description: 'Relaxe completamente o assoalho pélvico', tips: ['Igualmente importante', 'Prepare-se para o parto'] },
    ]
  },
  // === PÓS-PARTO ===
  {
    id: 'pos-parto-cardio', name: 'Cardio Pós-Parto', description: 'Retorno gradual à atividade cardiovascular',
    duration: 20, calories: 130, difficulty: 'Iniciante', category: 'Cardio', forPregnant: false,
    color: 'from-green-400 to-teal-500', icon: '🏃‍♀️',
    exercises: [
      { name: 'Marcha Suave', duration: 120, description: 'Caminhe no lugar com braços ativos', tips: ['Comece devagar', 'Ouça seu corpo'] },
      { name: 'Step Touch', duration: 90, description: 'Passo lateral alternando', tips: ['Adicione braços', 'Ritmo confortável'] },
      { name: 'Knee Lifts', duration: 60, description: 'Eleve os joelhos alternadamente', tips: ['Não force', 'Mantenha postura ereta'] },
      { name: 'Skater Steps', duration: 60, description: 'Deslize lateralmente como patinando', tips: ['Baixo impacto', 'Trabalha equilíbrio'] },
      { name: 'Box Step', duration: 90, description: 'Desenhe um quadrado com os passos', tips: ['Divertido e funcional'] },
      { name: 'Marcha com Twist', duration: 60, description: 'Marche rotacionando o tronco', tips: ['Ativa os oblíquos'] },
      { name: 'Cool Down Walk', duration: 120, description: 'Caminhe reduzindo o ritmo gradualmente', tips: ['Alongue ao final'] },
    ]
  },
  {
    id: 'pos-parto-recuperacao', name: 'Recuperação Pós-Parto', description: 'Exercícios gentis para recuperação após o parto',
    duration: 15, calories: 50, difficulty: 'Iniciante', category: 'Especial', forPregnant: false,
    color: 'from-emerald-400 to-green-500', icon: '🌱',
    exercises: [
      { name: 'Respiração Abdominal', duration: 120, description: 'Reative a conexão com seu core', tips: ['Inspire expandindo, expire contraindo suavemente', 'Sem pressa'] },
      { name: 'Ativação Transverso', duration: 90, description: 'Contraia suavemente o abdômen profundo', tips: ['Não faça abdominal tradicional', 'Movimento sutil'] },
      { name: 'Ponte Leve', duration: 60, reps: 8, description: 'Eleve o quadril com cuidado', tips: ['Apenas se confortável', 'Pare se sentir desconforto'], muscle: 'Glúteos' },
      { name: 'Kegel de Recuperação', duration: 90, description: 'Reconecte com o assoalho pélvico', tips: ['Essencial após parto vaginal e cesárea'] },
      { name: 'Alongamento de Peito', duration: 60, description: 'Abra os braços e estique o peito', tips: ['Alivia tensão da amamentação'] },
      { name: 'Rotação de Pescoço', duration: 60, description: 'Gire a cabeça suavemente em círculos', tips: ['Alivia tensão de carregar o bebê'] },
      { name: 'Savasana com Respiração', duration: 120, description: 'Deite e respire profundamente', tips: ['Você merece este descanso', 'Pratique o autocuidado'] },
    ]
  },
  // === MEDITAÇÃO ATIVA ===
  {
    id: 'meditacao-ativa', name: 'Meditação em Movimento', description: 'Combine mindfulness com movimento suave',
    duration: 15, calories: 40, difficulty: 'Iniciante', category: 'Yoga', forPregnant: true,
    color: 'from-amber-400 to-yellow-500', icon: '🧘‍♀️',
    exercises: [
      { name: 'Aterramento', duration: 120, description: 'Em pé, sinta seus pés no chão. Respire 5 vezes profundamente', tips: ['Feche os olhos se confortável', 'Conecte-se com o momento'] },
      { name: 'Movimentos Fluidos', duration: 120, description: 'Balance os braços suavemente como ondas', tips: ['Sem destino', 'Apenas sinta o movimento'] },
      { name: 'Caminhada Consciente', duration: 120, description: 'Caminhe lentamente sentindo cada passo', tips: ['Atenção plena nos pés', 'Conte cada passo'] },
      { name: 'Torção Sentada', duration: 90, description: 'Sente e gire suavemente para cada lado', tips: ['Respire na torção', 'Alivia tensão'] },
      { name: 'Mãos no Coração', duration: 60, description: 'Mãos no peito, sinta os batimentos', tips: ['Conecte-se com seu corpo e seu bebê'] },
      { name: 'Body Scan', duration: 180, description: 'Deitada, percorra cada parte do corpo mentalmente', tips: ['Da cabeça aos pés', 'Relaxe cada região'] },
    ]
  },
]

const CATEGORIES = ['Todos', 'Gestante', 'Yoga', 'Pilates', 'Full Body', 'Cardio', 'Força', 'Especial']

export default function WorkoutPage() {
  const [category, setCategory] = useState('Todos')
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [training, setTraining] = useState(false)
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [resting, setResting] = useState(false)
  const [done, setDone] = useState<number[]>([])
  const [burned, setBurned] = useState(0)
  const [showDetail, setShowDetail] = useState<Workout | null>(null)
  const [workoutHistory, setWorkoutHistory] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    if (training && !paused && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    } else if (timeLeft === 0 && training && !paused) {
      handleDone()
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, training, paused])

  const loadHistory = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true)
      setWorkoutHistory(count || 0)
    } catch {}
  }

  const filtered = WORKOUTS.filter(w => category === 'Todos' || w.category === category)

  const start = (w: Workout) => {
    setWorkout(w); setExerciseIdx(0); setDone([]); setBurned(0)
    setTraining(true); setResting(false); setPaused(false)
    setTimeLeft(w.exercises[0].duration); setShowDetail(null)
  }

  const handleDone = () => {
    if (!workout) return
    if (resting) {
      setResting(false)
      if (exerciseIdx < workout.exercises.length - 1) {
        const next = exerciseIdx + 1
        setExerciseIdx(next); setTimeLeft(workout.exercises[next].duration)
      } else finish()
    } else {
      setDone(p => [...p, exerciseIdx])
      setBurned(p => p + workout.calories / workout.exercises.length)
      if (exerciseIdx < workout.exercises.length - 1) {
        setResting(true); setTimeLeft(30)
      } else finish()
    }
  }

  const finish = async () => {
    setTraining(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && workout) {
        await supabase.from('workouts').insert({
          user_id: user.id, name: workout.name, duration: workout.duration,
          calories_burned: Math.round(burned), exercises_completed: done.length + 1, completed: true
        })
        // Award gamification points
        await fetch('/api/gamification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id, action: 'addPoints',
            points: workout.duration, reason: `Treino: ${workout.name}`, category: 'workout'
          })
        })
        // Check workout achievements
        const newCount = workoutHistory + 1
        setWorkoutHistory(newCount)
        await fetch('/api/gamification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, action: 'checkAchievements', type: 'workouts', value: newCount })
        })
      }
    } catch (e) { console.error(e) }
  }

  const skip = () => {
    if (!workout) return
    setResting(false)
    if (exerciseIdx < workout.exercises.length - 1) {
      const next = exerciseIdx + 1
      setExerciseIdx(next); setTimeLeft(workout.exercises[next].duration)
    } else finish()
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  // Active Training
  if (training && workout) {
    const ex = workout.exercises[exerciseIdx]
    const pct = ((exerciseIdx + (resting ? 0.5 : 0)) / workout.exercises.length) * 100
    return (
      <div className={`min-h-screen bg-gradient-to-br ${workout.color} text-white p-4`}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between mb-4">
            <button onClick={() => { setTraining(false); setWorkout(null) }} className="p-2"><X className="w-6 h-6" /></button>
            <span className="font-semibold">{workout.name}</span>
            <div className="w-10" />
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{exerciseIdx + 1}/{workout.exercises.length}</span>
              <span>{Math.round(burned)} kcal</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-center py-8">
            <div className="text-7xl mb-4">{resting ? '😮‍💨' : workout.icon}</div>
            <h2 className="text-2xl font-bold mb-2">{resting ? 'Descanse' : ex.name}</h2>
            <p className="text-white/80 mb-2">{resting ? 'Respire fundo e prepare-se' : ex.description}</p>
            {ex.reps && !resting && <div className="bg-white/20 px-4 py-2 rounded-xl inline-block mb-2">{ex.reps} repetições</div>}
            {ex.muscle && !resting && <p className="text-xs text-white/60">Músculo: {ex.muscle}</p>}
          </div>
          <div className="text-center text-7xl font-bold mb-8">{fmt(timeLeft)}</div>
          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => setPaused(!paused)} className="w-16 h-16 rounded-full bg-white text-gray-800 flex items-center justify-center">
              {paused ? <Play className="w-8 h-8 ml-1" /> : <Pause className="w-8 h-8" />}
            </button>
            <button onClick={skip} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
          {!resting && ex.tips.length > 0 && (
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white/60 text-xs mb-1">💡 Dica:</p>
              <p className="text-sm">{ex.tips[0]}</p>
            </div>
          )}
          {exerciseIdx < workout.exercises.length - 1 && (
            <div className="bg-white/10 rounded-xl p-3 mt-2 text-center">
              <p className="text-white/60 text-sm">Próximo: <span className="font-semibold text-white">{workout.exercises[exerciseIdx + 1].name}</span></p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Completion
  if (workout && !training && done.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-xs">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold mb-2">Parabéns!</h1>
          <p className="text-xl mb-6 text-white/80">{workout.name} concluído!</p>
          <div className="bg-white/10 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4">
            <div><Flame className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">{Math.round(burned)}</p><p className="text-xs text-white/60">kcal</p></div>
            <div><Clock className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">{workout.duration}</p><p className="text-xs text-white/60">min</p></div>
            <div><Target className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">{done.length + 1}</p><p className="text-xs text-white/60">exercícios</p></div>
            <div><Trophy className="w-6 h-6 mx-auto mb-1" /><p className="text-xl font-bold">+{workout.duration}</p><p className="text-xs text-white/60">pts</p></div>
          </div>
          <button onClick={() => { setWorkout(null); setDone([]) }} className="bg-white text-green-600 px-6 py-3 rounded-full font-semibold w-full">
            Voltar aos Treinos
          </button>
        </div>
      </div>
    )
  }

  // Detail View
  if (showDetail) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className={`bg-gradient-to-br ${showDetail.color} text-white p-4`}>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setShowDetail(null)} className="p-2 bg-white/20 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-xl font-bold">{showDetail.name}</h1>
          </div>
          <div className="text-center py-4">
            <span className="text-5xl">{showDetail.icon}</span>
            <p className="text-white/80 mt-2">{showDetail.description}</p>
            <div className="flex justify-center gap-6 mt-3">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {showDetail.duration}min</span>
              <span className="flex items-center gap-1"><Flame className="w-4 h-4" /> {showDetail.calories}kcal</span>
              <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {showDetail.exercises.length} ex.</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-bold text-gray-700 mb-2">Exercícios</h3>
          {showDetail.exercises.map((ex, i) => (
            <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">{i + 1}</div>
              <div className="flex-1">
                <p className="font-medium text-sm">{ex.name}</p>
                <p className="text-xs text-gray-500">{ex.reps ? `${ex.reps} reps` : fmt(ex.duration)}{ex.muscle ? ` • ${ex.muscle}` : ''}</p>
              </div>
            </div>
          ))}
          <button onClick={() => start(showDetail)} className="w-full py-3.5 bg-primary-500 text-white rounded-xl font-semibold mt-4 flex items-center justify-center gap-2">
            <Play className="w-5 h-5" /> Iniciar Treino
          </button>
        </div>
      </div>
    )
  }

  // Workout List
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-xl font-bold">Treinos</h1>
            <p className="text-sm text-gray-500">{filtered.length} disponíveis • {workoutHistory} completos</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${category === c ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {c}
            </button>
          ))}
        </div>
      </header>
      <div className="p-4 grid gap-3 md:grid-cols-2">
        {filtered.map(w => (
          <div key={w.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className={`bg-gradient-to-br ${w.color} p-4 text-white cursor-pointer active:opacity-90`} onClick={() => setShowDetail(w)}>
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl">{w.icon}</span>
                <div className="flex gap-1">
                  {w.forPregnant && <span className="bg-white/20 text-xs px-2 py-1 rounded-full">🤰 Seguro</span>}
                </div>
              </div>
              <h3 className="font-bold">{w.name}</h3>
              <p className="text-white/80 text-sm">{w.description}</p>
            </div>
            <div className="p-3">
              <div className="flex gap-3 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{w.duration}min</span>
                <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" />{w.calories}kcal</span>
                <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{w.exercises.length} ex.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs px-2 py-1 rounded-full ${w.difficulty === 'Iniciante' ? 'bg-green-100 text-green-700' : w.difficulty === 'Intermediário' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {w.difficulty}
                </span>
                <button onClick={() => start(w)} className="text-xs font-semibold text-primary-600 flex items-center gap-1">
                  Iniciar <Play className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
