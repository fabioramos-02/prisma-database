## Roteiro Completo para a Aula Prática

### Objetivo da Aula:

- Criar e configurar um modelo Prisma.
- Gerar migrações para o banco de dados.
- Testar as operações CRUD (criação, leitura, atualização e exclusão) via API.

### Pré-requisitos:

- Conhecimentos básicos de JavaScript/TypeScript.
- Node.js instalado.
- PostgreSQL ou outro banco de dados configurado.
- VS Code (ou qualquer outro editor de código).

### Estrutura do Projeto

- **Next.js**: Framework para React.
- **Prisma**: ORM para acesso ao banco de dados.
- **PostgreSQL**: Banco de dados relacional.

#### Passo 1: Clonar o Repositório
Inicie clonando o repositório do projeto que será a base para a aula.
```bash
git clone https://github.com/vanborges/prisma-database.git
```
```bash
cd empresa-app
```
```bash
npm install
```
#### Passo 2: Configuração Inicial

#### 2.1.	Configurar o Banco de Dados:
Abra o arquivo .env e defina a URL do banco de dados.
Exemplo:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
```
#### Passo 3: Inicializar o Prisma:
Certifique-se de que o Prisma está configurado corretamente.
```bash
npx prisma init
```
#### Passo 4: Criar os Modelos:
No arquivo prisma/schema.prisma, revise e crie novos modelos se necessário. 
```bash
model funcionario {
  id          Int               @id @default(autoincrement())
  nome        String
  salario     String            @default("0")
  endereco    endereco?
  dependentes dependente[]
  projetos    funcioanrioprojeto[]
}

// Relacionamento 1:1 - Funcionario:Endereco
model endereco {
  id            Int         @id @default(autoincrement())
  rua           String
  bairro        String?
  numero        Int
  funcionarioid Int         @unique
  funcionario   funcionario @relation(fields: [funcionarioid], references: [id], onDelete: Cascade)
}
// Relacionamento 1:n - Funcionario:Dependente
model dependente {
  id            Int         @id @default(autoincrement())
  nome          String
  parentesco    String
  funcionarioid Int
  funcionario   funcionario @relation(fields: [funcionarioid], references: [id], onDelete: Cascade)
}

model projeto {
  id            Int               @id @default(autoincrement())
  nome          String
  funcionarios  funcioanrioprojeto[]
}

// Relacionamento n:n - Funcionario:Projeto
model funcioanrioprojeto {
  funcionarioid Int
  projetoid     Int
  funcionario   funcionario @relation(fields: [funcionarioid], references: [id])
  projeto       projeto     @relation(fields: [projetoid], references: [id])
  @@id([funcionarioid, projetoid])
}
```
#### Passo 5: Gerar migration com base no modelo
Com o esquema do Prisma configurado execute o seguinte comando:
```bash
npx prisma migrate dev --name init
```
Esse comando realiza as seguintes ações:
```
	1.	Compara o estado atual do banco de dados com o esquema definido no Prisma.
	2.	Gera uma migration e a aplica para sincronizar o banco de dados com o esquema Prisma.
	3.	Nomeia a migration gerada como ‘init’, o que é útil para identificar o propósito ou estágio das mudanças.
	4.	Atualiza o cliente Prisma, garantindo que seu código possa interagir corretamente com o banco de dados após as alterações.
```
#### Passo 6: Popular o Banco de Dados com o Script de Seed
Para popular o banco de dados com dados iniciais, você pode utilizar o script de seed já configurado. O arquivo de seed está localizado em src/app/seed.mts e contém instruções para inserir dados no banco de dados.

Execute o seguinte comando no terminal para rodar o script de seed e popular o banco de dados:
```bash
npm run seed
```
O comando npm run seed executará o arquivo seed.mts e inserirá os dados iniciais no banco de dados conforme definido no script.

#### Passo 7: Iniciar o Servidor
Agora que o banco de dados está configurado e as migrações foram aplicadas, você pode iniciar o servidor de desenvolvimento do Next.js para testar a API.

##### 7.1.	Inicie o servidor Next.js:
No terminal, execute o seguinte comando para iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
##### 7.2.	Verifique o servidor:
Uma vez iniciado, o servidor estará rodando no endereço http://localhost:3000.

#### Passo 8: Testar a API
A API está configurada no diretório src/app/api. Neste ponto, a aplicação contém uma pasta funcionarios, onde você encontrará as rotas:

- POST: Para criar novos funcionários.
- GET: Para listar os funcionários existentes.

Você pode testar a API de duas formas:

- Usando a interface do Swagger UI gerada em http://localhost:3000/api/swagger, onde você pode visualizar e testar todos os endpoints da API de maneira interativa.
- Usando ferramentas tradicionais como Postman, Insomnia, ou cURL.

##### 8.1. Testar a API via Swagger UI

Para testar a API usando a documentação interativa gerada pelo Swagger UI, siga os passos abaixo:

- Acesse a interface do Swagger UI no navegador:
```bash
http://localhost:3000/api/swagger
```

- Dentro da interface Swagger, você verá a lista de rotas disponíveis, incluindo:
POST /api/funcionarios para criar um novo funcionário.
GET /api/funcionarios para listar os funcionários existentes.

- Clique no endpoint desejado e preencha os parâmetros solicitados na interface. Em seguida, clique em Execute para realizar a requisição diretamente pelo Swagger UI.

##### 8.2. Testar API de outras formas

Além do Swagger UI, você pode testar a API usando Postman, Insomnia, ou cURL para enviar uma requisição POST e criar um novo funcionário. Exemplo de requisição cURL:

Testar rota via cURL - POST /api/funcionarios:
```bash
curl -X POST http://localhost:3000/api/funcionarios \
-H "Content-Type: application/json" \
-d '{
  "nome": "Mickey Mouse",
  "salario": "5000",
  "endereco": {
    "rua": "Rua da Diversão",
    "bairro": "Disneyland",
    "numero": 123
  },
  "dependentes": [
    {
      "nome": "Minnie Mouse",
      "parentesco": "Namorada"
    }
  ],
  "projetos": [1, 2]
}'
```
- Testar a Rota GET (Listar Funcionários)
```bash
curl -X GET http://localhost:3000/api/funcionarios
```
