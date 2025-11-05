import { env } from '../config/env';

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'BnotasWeb API',
    version: '1.0.0',
    description: 'API de anotações pessoais (agenda/diário)'
  },
  servers: [
    { url: `http://localhost:${env.PORT}/api`, description: 'local' }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Usuario: {
        type: 'object',
        properties: { id: { type: 'integer' }, email: { type: 'string', format: 'email' } }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'senha'],
        properties: { email: { type: 'string', format: 'email' }, senha: { type: 'string' } }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/Usuario' }
        }
      },
      CreateUsuario: {
        type: 'object',
        required: ['email', 'senha'],
        properties: { email: { type: 'string', format: 'email' }, senha: { type: 'string' } }
      },
      Anotacao: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          titulo: { type: 'string' },
          conteudo: { type: 'string' },
          favorita: { type: 'boolean' },
          dataCriacao: { type: 'string', format: 'date-time' },
          dataModificacao: { type: 'string', format: 'date-time' }
        }
      },
      CreateAnotacao: {
        type: 'object',
        required: ['titulo'],
        properties: {
          titulo: { type: 'string' },
          conteudo: { type: 'string' },
          favorita: { type: 'boolean' }
        }
      },
      UpdateAnotacao: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          conteudo: { type: 'string' },
          favorita: { type: 'boolean' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } }
            }
          }
        }
      }
    }
  },
  paths: {
    '/usuarios': {
      post: {
        summary: 'Cria um novo usuário',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUsuario' } } }
        },
        responses: {
          '201': { description: 'Criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } },
          '409': { description: 'Conflito', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/login': {
      post: {
        summary: 'Autentica usuário e retorna JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          '401': { description: 'Não autorizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/anotacoes': {
      get: {
        summary: 'Lista anotações do usuário logado',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Anotacao' } } } } },
          '401': { description: 'Não autorizado' }
        }
      },
      post: {
        summary: 'Cria uma nova anotação',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAnotacao' } } }
        },
        responses: {
          '201': { description: 'Criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anotacao' } } } },
          '401': { description: 'Não autorizado' }
        }
      }
    },
    '/anotacoes/{id}': {
      get: {
        summary: 'Busca anotação por id',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anotacao' } } } },
          '404': { description: 'Não encontrada' }
        }
      },
      put: {
        summary: 'Atualiza anotação',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateAnotacao' } } } },
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anotacao' } } } },
          '404': { description: 'Não encontrada' }
        }
      },
      delete: {
        summary: 'Deleta anotação',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '204': { description: 'Sem conteúdo' },
          '404': { description: 'Não encontrada' }
        }
      }
    }
  }
} as const;

