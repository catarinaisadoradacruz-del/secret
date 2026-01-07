#!/usr/bin/env python3
"""
Script para setup COMPLETO do Supabase
Executa TUDO automaticamente via API
"""

import requests
import json
import time

# Configurações
SUPABASE_URL = "https://qlxabxhszpvetblvnfxl.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseGFieGhzenB2ZXRibHZuZnhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NzMyNSwiZXhwIjoyMDgzMzczMzI1fQ.8JOJnLml2uzDSLjUuWIprZpTADo_TnfqgblcELm2GYo"
PROJECT_REF = "qlxabxhszpvetblvnfxl"

ADMIN_EMAIL = "brunodivinoa@gmail.com"
ADMIN_PASSWORD = "@Pcgo2026Strong!"
ADMIN_NAME = "BRUNO DIVINO ALVES"

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_info(text):
    print(f"📋 {text}")

def print_warning(text):
    print(f"⚠️  {text}")

# Step 1: Criar usuário via Auth API
def create_admin_user():
    print_header("PASSO 1: Criando Usuário Admin")

    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "email_confirm": True
    }

    try:
        response = requests.post(url, headers=headers, json=data)

        if response.status_code in [200, 201]:
            user_data = response.json()
            user_id = user_data.get('id')
            print_success(f"Usuário criado com sucesso!")
            print_info(f"Email: {ADMIN_EMAIL}")
            print_info(f"Senha: {ADMIN_PASSWORD}")
            print_info(f"User ID: {user_id}")
            return user_id
        elif response.status_code == 422 or "already been registered" in response.text:
            print_warning("Usuário já existe! Buscando ID...")
            # Buscar usuário existente
            list_url = f"{SUPABASE_URL}/auth/v1/admin/users"
            list_response = requests.get(list_url, headers=headers)

            if list_response.status_code == 200:
                users = list_response.json().get('users', [])
                for user in users:
                    if user.get('email') == ADMIN_EMAIL:
                        user_id = user.get('id')
                        print_success(f"Usuário encontrado! ID: {user_id}")
                        return user_id

            print_error("Não foi possível recuperar o ID do usuário")
            return None
        else:
            print_error(f"Erro ao criar usuário: {response.status_code}")
            print_error(f"Resposta: {response.text}")
            return None

    except Exception as e:
        print_error(f"Exceção ao criar usuário: {e}")
        return None

# Step 2: Inserir na tabela users
def insert_user_record(user_id):
    print_header("PASSO 2: Inserindo Registro na Tabela Users")

    url = f"{SUPABASE_URL}/rest/v1/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    data = {
        "id": user_id,
        "email": ADMIN_EMAIL,
        "nome": ADMIN_NAME,
        "is_admin": True
    }

    try:
        response = requests.post(url, headers=headers, json=data)

        if response.status_code in [200, 201]:
            print_success("Registro criado na tabela users!")
            return True
        elif response.status_code == 409:
            print_warning("Registro já existe na tabela users")
            return True
        elif response.status_code == 404:
            print_warning("Tabela 'users' não existe ainda!")
            print_info("Você precisa executar o schema SQL primeiro.")
            print_info("Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new")
            print_info("Cole o conteúdo do arquivo: supabase/schema.sql")
            print_info("Clique em 'RUN' e aguarde conclusão")
            print_info("\nDepois execute este script novamente!")
            return False
        else:
            print_error(f"Erro ao inserir registro: {response.status_code}")
            print_error(f"Resposta: {response.text}")
            return False

    except Exception as e:
        print_error(f"Exceção ao inserir registro: {e}")
        return False

# Main
def main():
    print_header("🚀 SETUP AUTOMÁTICO DO SUPABASE 🚀")

    print_warning("IMPORTANTE: Este script assume que você JÁ EXECUTOU o schema SQL!")
    print_info("Se ainda não executou, siga estes passos:")
    print_info("1. Acesse: https://supabase.com/dashboard/project/qlxabxhszpvetblvnfxl/sql/new")
    print_info("2. Abra o arquivo: supabase/schema.sql")
    print_info("3. Copie TODO o conteúdo")
    print_info("4. Cole no SQL Editor do Supabase")
    print_info("5. Clique em 'RUN' (ou pressione F5)")
    print_info("6. Aguarde aparecer 'Success'")
    print_info("\nSe JÁ fez isso, pressione ENTER para continuar...")
    print_info("Se NÃO fez, pressione Ctrl+C para sair e fazer primeiro\n")

    try:
        input()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelado. Execute o schema SQL primeiro!")
        return

    # Step 1: Criar usuário admin
    user_id = create_admin_user()

    if not user_id:
        print_error("\n❌ Falha ao criar/buscar usuário. Abortando.")
        return

    # Aguardar 2 segundos
    print_info("\nAguardando 2 segundos...")
    time.sleep(2)

    # Step 2: Inserir na tabela users
    success = insert_user_record(user_id)

    if not success:
        print_error("\n❌ Falha ao criar registro na tabela users.")
        print_info("Execute o schema SQL e tente novamente!")
        return

    # Sucesso!
    print_header("✅ ✅ ✅ SETUP COMPLETO! ✅ ✅ ✅")

    print("📋 DADOS PARA LOGIN:")
    print(f"   Email: {ADMIN_EMAIL}")
    print(f"   Senha: {ADMIN_PASSWORD}")
    print(f"   User ID: {user_id}")

    print("\n🎯 PRÓXIMOS PASSOS:")
    print("   1. Vá para o Vercel: https://vercel.com/new")
    print("   2. Importe o repositório: catarinaisadoradacruz-del/secret")
    print("   3. Configure as 5 variáveis de ambiente")
    print("   4. Faça o deploy!")
    print(f"\n📖 Guia detalhado em: DEPLOY_VERCEL_DETALHADO.md\n")

if __name__ == "__main__":
    main()
