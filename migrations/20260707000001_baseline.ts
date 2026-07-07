import type { Knex } from 'knex';

/**
 * Migration baseline: cria o esquema completo apenas se as tabelas não existirem.
 * Em bancos já existentes (como o de desenvolvimento atual), não altera nada.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('usuario'))) {
    await knex.schema.createTable('usuario', (t) => {
      t.increments('id').primary();
      t.string('email', 255).notNullable().unique();
      t.string('senha', 255).notNullable();
      t.string('nome', 255).notNullable();
      t.string('sobrenome', 255).notNullable();
      t.string('telefone', 20).nullable();
      t.text('bio').nullable();
      t.string('avatarUrl', 500).nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('anotacao'))) {
    await knex.schema.createTable('anotacao', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').unsigned().nullable();
      t.string('titulo', 255).notNullable().defaultTo('');
      t.text('conteudo', 'mediumtext').notNullable();
      t.string('cor', 7).defaultTo('#fff9c4');
      t.boolean('favorita').defaultTo(false);
      t.timestamp('dataCriacao').defaultTo(knex.fn.now());
      t.timestamp('dataModificacao').nullable();
      t.timestamp('data_lembrete').nullable();
      t.boolean('lembrete_enviado').defaultTo(false);
      t.integer('etapa_lembrete').defaultTo(0);
      t.integer('qtd_reagendamentos').defaultTo(0);
      t.json('tags').nullable();
      t.boolean('deletado').defaultTo(false);
      t.string('senha', 500).nullable();
      t.index('deletado', 'idx_deletado');
      t.index('data_lembrete', 'idx_data_lembrete');
    });
  }

  if (!(await knex.schema.hasTable('usuario_anotacao'))) {
    await knex.schema.createTable('usuario_anotacao', (t) => {
      t.increments('id').primary();
      t.integer('usuario_id').unsigned().notNullable()
        .references('id').inTable('usuario').onDelete('CASCADE');
      t.integer('anotacao_id').unsigned().notNullable()
        .references('id').inTable('anotacao').onDelete('CASCADE');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.unique(['usuario_id', 'anotacao_id'], { indexName: 'unique_user_note' });
    });
  }

  if (!(await knex.schema.hasTable('plan'))) {
    await knex.schema.createTable('plan', (t) => {
      t.string('id', 50).primary();
      t.string('name', 255).notNullable();
      t.decimal('price', 10, 2).notNullable();
      t.string('currency', 10).defaultTo('BRL');
      t.json('features').nullable();
      t.boolean('isActive').defaultTo(true);
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    await knex('plan').insert([
      { id: 'free', name: 'Gratuito', price: 0, currency: 'BRL', features: JSON.stringify([]), isActive: true },
      { id: 'premium', name: 'Premium', price: 9.90, currency: 'BRL', features: JSON.stringify(['protected_notes','email_notifications','protected_trash','unlimited_notes','export_notes','custom_themes']), isActive: true },
      { id: 'pro', name: 'Pro', price: 19.90, currency: 'BRL', features: JSON.stringify(['protected_notes','email_notifications','protected_trash','unlimited_notes','export_notes','custom_themes','voice_access']), isActive: true }
    ]);
  }

  if (!(await knex.schema.hasTable('subscription'))) {
    await knex.schema.createTable('subscription', (t) => {
      t.increments('id').primary();
      t.integer('userId').unsigned().notNullable()
        .references('id').inTable('usuario').onDelete('CASCADE');
      t.string('planId', 50).notNullable().defaultTo('free')
        .references('id').inTable('plan').onDelete('RESTRICT');
      t.enum('status', ['active', 'cancelled', 'expired']).defaultTo('active');
      t.timestamp('startDate').defaultTo(knex.fn.now());
      t.timestamp('endDate').nullable();
      t.json('features').nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Baseline não é revertida (protege contra perda acidental de dados)
  throw new Error('A migration baseline não pode ser revertida.');
}
