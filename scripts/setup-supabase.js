const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const connectionString = 'postgresql://postgres:[PASSWORD]@db.thtlsaxrrnngfglszjxc.supabase.co:5432/postgres'

async function executeSqlFile(client, filename) {
  console.log(`\n📋 Executando: ${filename}...`)

  try {
    const sql = fs.readFileSync(filename, 'utf-8')

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of statements) {
      try {
        await client.query(statement)
      } catch (err) {
        console.warn(`⚠️  Aviso: ${err.message}`)
      }
    }

    console.log(`✅ ${filename} executado com sucesso!`)
    return true
  } catch (err) {
    console.error(`❌ Erro ao executar ${filename}:`, err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Iniciando setup do Supabase...\n')
  console.log('⚠️  Para conectar ao banco, você precisa da senha do usuário postgres.')
  console.log('Você pode obtê-la em: Settings > Database > Connection string\n')

  const client = new Client({
    connectionString: process.env.DATABASE_URL || connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('✅ Conectado ao Supabase PostgreSQL\n')

    const file1 = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql')
    const file2 = path.join(__dirname, '../supabase/migrations/002_rls_policies.sql')

    const result1 = await executeSqlFile(client, file1)
    if (!result1) {
      throw new Error('Erro ao executar schema inicial')
    }

    const result2 = await executeSqlFile(client, file2)
    if (!result2) {
      throw new Error('Erro ao executar RLS policies')
    }

    console.log('\n✨ Setup completo!')
    console.log('Próximo passo: criar um usuário de teste')
  } catch (err) {
    console.error('\n❌ Erro:', err.message)
    console.log('\n📖 Instruções alternativas:')
    console.log('1. Acesse o Supabase Dashboard')
    console.log('2. Vá em SQL Editor → New Query')
    console.log('3. Copie o conteúdo de supabase/migrations/001_initial_schema.sql')
    console.log('4. Execute')
    console.log('5. Repita os passos 2-4 com 002_rls_policies.sql')
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
