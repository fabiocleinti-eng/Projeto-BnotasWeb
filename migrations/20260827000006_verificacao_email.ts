import type { Knex } from 'knex';

// Verificação de e-mail no cadastro.
// Sem isso, alguém cadastra o endereço de outra pessoa e a vítima passa a receber
// os lembretes do app — spam em nome do serviço e exposição indevida sob a LGPD.
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('usuario', 'email_verificado'))) {
    await knex.schema.alterTable('usuario', (t) => {
      t.boolean('email_verificado').notNullable().defaultTo(false);
      t.string('token_verificacao', 128).nullable();
      t.timestamp('token_verificacao_expira').nullable();
      t.index('token_verificacao', 'idx_token_verificacao');
    });

    // Contas que já existiam são anteriores à regra: seguem verificadas para não
    // perderem os lembretes de uma hora para a outra.
    await knex('usuario').update({ email_verificado: true });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('usuario', (t) => {
    t.dropIndex('token_verificacao', 'idx_token_verificacao');
    t.dropColumn('email_verificado');
    t.dropColumn('token_verificacao');
    t.dropColumn('token_verificacao_expira');
  });
}
