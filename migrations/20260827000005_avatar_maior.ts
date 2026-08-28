import type { Knex } from 'knex';

// A foto de perfil passa a poder ser a própria imagem (data URL), não só um endereço.
// VARCHAR(500) só comportava uma URL; MEDIUMTEXT comporta a imagem redimensionada.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuario', (t) => {
    t.text('avatarUrl', 'mediumtext').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Endereços continuam cabendo em 500; imagens embutidas seriam truncadas,
  // por isso limpamos as que não são URL antes de reduzir a coluna.
  await knex('usuario').whereRaw("avatarUrl LIKE 'data:%'").update({ avatarUrl: null });
  await knex.schema.alterTable('usuario', (t) => {
    t.string('avatarUrl', 500).alter();
  });
}
