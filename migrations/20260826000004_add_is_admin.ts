import type { Knex } from 'knex';

// Flag de administrador: libera todos os recursos pagos para testes.
// NUNCA é definida por nenhuma rota da API — só pelo script scripts/set-admin.js,
// que exige acesso direto ao banco (evita escalação de privilégio pela web).
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('usuario', 'is_admin'))) {
    await knex.schema.alterTable('usuario', (t) => {
      t.boolean('is_admin').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuario', (t) => { t.dropColumn('is_admin'); });
}
