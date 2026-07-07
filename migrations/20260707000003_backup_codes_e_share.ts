import type { Knex } from 'knex';

// Códigos de backup do 2FA + token de compartilhamento público de notas
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('usuario', 'totp_backup_codes'))) {
    await knex.schema.alterTable('usuario', (t) => {
      t.json('totp_backup_codes').nullable();
    });
  }
  if (!(await knex.schema.hasColumn('anotacao', 'share_token'))) {
    await knex.schema.alterTable('anotacao', (t) => {
      t.string('share_token', 64).nullable().unique();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuario', (t) => { t.dropColumn('totp_backup_codes'); });
  await knex.schema.alterTable('anotacao', (t) => { t.dropColumn('share_token'); });
}
