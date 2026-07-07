import type { Knex } from 'knex';

// Autenticação de dois fatores (TOTP): segredo criptografado + flag de ativação
export async function up(knex: Knex): Promise<void> {
  const hasSecret = await knex.schema.hasColumn('usuario', 'totp_secret');
  if (!hasSecret) {
    await knex.schema.alterTable('usuario', (t) => {
      t.string('totp_secret', 500).nullable();
      t.boolean('totp_enabled').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuario', (t) => {
    t.dropColumn('totp_secret');
    t.dropColumn('totp_enabled');
  });
}
