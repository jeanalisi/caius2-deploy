/**
 * seed-knowledge.mjs
 * Popula a Base de Conhecimento do cAIus com serviços municipais de Itabaiana - PB
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// enum sourceType: "document" | "text" | "link" | "faq" | "regulation" | "manual" | "flow" | "template"
const sources = [
  {
    title: "Alvará de Funcionamento — Procedimento",
    sourceType: "manual",
    category: "Licenças e Alvarás",
    content: `Para obter o Alvará de Funcionamento em Itabaiana - PB, o cidadão deve:
1. Acessar o portal da Prefeitura ou comparecer presencialmente à Secretaria de Finanças (SEMFIN).
2. Apresentar: CNPJ, contrato social, comprovante de endereço do estabelecimento, laudo do Corpo de Bombeiros (quando exigido), laudo sanitário (para atividades de alimentação), e documentos pessoais do responsável legal.
3. Preencher o formulário de solicitação de Alvará.
4. Aguardar vistoria do setor competente (prazo médio: 10 dias úteis).
5. Retirar o Alvará após aprovação e pagamento das taxas devidas.
Renovação: anual, até 31 de março de cada ano. Taxa varia conforme atividade e área do estabelecimento.
Contato: SEMFIN — Rua Cel. Antônio Pessoa, Centro, Itabaiana - PB. Horário: 08h às 14h (dias úteis).`,
    tags: ["alvará", "funcionamento", "empresa", "licença", "CNPJ"],
    status: "active",
  },
  {
    title: "IPTU — Imposto Predial e Territorial Urbano",
    sourceType: "faq",
    category: "Tributos e Finanças",
    content: `Perguntas frequentes sobre IPTU em Itabaiana - PB:

P: Como consultar o débito de IPTU?
R: Acesse o portal da Prefeitura ou compareça à SEMFIN com o número da inscrição imobiliária.

P: Quando vence o IPTU?
R: O carnê é emitido em janeiro. Pagamento à vista com desconto até 31 de março. Parcelamento em até 10 vezes.

P: Como obter 2ª via do carnê?
R: Presencialmente na SEMFIN ou pelo portal de serviços online da Prefeitura.

P: Como solicitar isenção de IPTU?
R: Aposentados e pensionistas com renda de até 2 salários mínimos e imóvel único podem solicitar isenção. Documentos: RG, CPF, comprovante de renda, escritura do imóvel.

P: Como contestar o valor do IPTU?
R: Protocolar impugnação na SEMFIN em até 30 dias após o recebimento do carnê.`,
    tags: ["IPTU", "imposto", "imóvel", "carnê", "isenção"],
    status: "active",
  },
  {
    title: "Certidão Negativa de Débitos Municipais",
    sourceType: "manual",
    category: "Tributos e Finanças",
    content: `A Certidão Negativa de Débitos (CND) Municipal comprova que o contribuinte não possui débitos com a Prefeitura de Itabaiana.

Documentos necessários:
- Para pessoa física: CPF e RG
- Para pessoa jurídica: CNPJ e contrato social

Como solicitar:
1. Presencialmente na SEMFIN ou pelo portal online.
2. Informar CPF/CNPJ e dados do solicitante.
3. Prazo de emissão: imediato (se não houver débitos) ou até 5 dias úteis.
4. Validade: 180 dias a partir da emissão.

Observação: A CND é exigida para participação em licitações, financiamentos e transferências de imóveis.`,
    tags: ["certidão", "CND", "débitos", "negativa", "licitação"],
    status: "active",
  },
  {
    title: "Ouvidoria Municipal — Como Registrar Manifestação",
    sourceType: "manual",
    category: "Ouvidoria",
    content: `A Ouvidoria da Prefeitura de Itabaiana recebe reclamações, sugestões, elogios, denúncias e solicitações de informação.

Canais de atendimento:
- Portal digital: pelo Webchat ou formulário online
- Presencial: Rua Cel. Antônio Pessoa, Centro — 08h às 14h (dias úteis)
- E-mail: ouvidoria@itabaiana.pb.gov.br

Tipos de manifestação:
- Reclamação: insatisfação com serviço público
- Denúncia: irregularidade ou ilegalidade
- Sugestão: proposta de melhoria
- Elogio: reconhecimento de bom atendimento
- Solicitação: pedido de informação ou serviço

Prazo de resposta: até 20 dias úteis (prorrogável por mais 10 com justificativa).
Sigilo garantido para denúncias.`,
    tags: ["ouvidoria", "reclamação", "denúncia", "sugestão", "manifestação"],
    status: "active",
  },
  {
    title: "Licença para Construção — Alvará de Construção",
    sourceType: "manual",
    category: "Licenças e Alvarás",
    content: `Para construir, reformar ou ampliar imóvel em Itabaiana - PB, é necessário o Alvará de Construção.

Documentos necessários:
- Requerimento assinado pelo proprietário
- Projeto arquitetônico (2 vias) aprovado por profissional habilitado (ART/RRT)
- Comprovante de propriedade (escritura ou contrato)
- Certidão de uso do solo
- Certidão negativa de débitos do imóvel

Processo:
1. Protocolar na Secretaria de Infraestrutura (SEINFRA)
2. Análise técnica: até 30 dias úteis
3. Aprovação e emissão do alvará
4. Início das obras somente após emissão do alvará
5. Habite-se: solicitado após conclusão da obra

Taxa: calculada com base na área construída e tipo de obra.
Contato: SEINFRA — Rua Cel. Antônio Pessoa, Centro. Horário: 08h às 14h.`,
    tags: ["construção", "alvará", "obra", "reforma", "habite-se", "SEINFRA"],
    status: "active",
  },
  {
    title: "Serviços de Saúde — UBS e Postos de Saúde",
    sourceType: "faq",
    category: "Saúde",
    content: `Serviços de saúde disponíveis em Itabaiana - PB:

P: Como agendar consulta no posto de saúde?
R: Compareça à UBS mais próxima da sua residência com RG, CPF e Cartão SUS. Agendamentos também podem ser feitos pelo telefone da unidade.

P: Quais exames são realizados pelo SUS em Itabaiana?
R: Exames básicos de laboratório, raio-X, ultrassonografia e eletrocardiograma estão disponíveis. Solicite com seu médico do posto.

P: Como obter o Cartão SUS?
R: Compareça a qualquer UBS com RG, CPF e comprovante de residência.

P: Onde funciona o CAPS (Centro de Atenção Psicossocial)?
R: CAPS Itabaiana — atende casos de saúde mental. Contato pela Secretaria de Saúde.

P: Como solicitar medicamentos pela farmácia básica?
R: Apresente receita médica atualizada (até 6 meses) na farmácia da UBS ou na Farmácia Central Municipal.`,
    tags: ["saúde", "UBS", "posto de saúde", "SUS", "consulta", "exame", "medicamento"],
    status: "active",
  },
  {
    title: "Matrícula Escolar — Rede Municipal de Ensino",
    sourceType: "manual",
    category: "Educação",
    content: `Matrículas na rede municipal de ensino de Itabaiana - PB (Educação Infantil e Ensino Fundamental I).

Período de matrículas: geralmente em novembro/dezembro para o ano seguinte.

Documentos necessários:
- Certidão de nascimento do aluno
- RG e CPF do responsável
- Comprovante de residência
- Cartão de vacina atualizado
- Histórico escolar (para transferências)

Como solicitar:
1. Comparecer à escola municipal desejada ou à Secretaria de Educação (SEDUC)
2. Apresentar documentação completa
3. Aguardar confirmação da vaga

Critério de prioridade: proximidade da residência à escola.
Contato: SEDUC — Rua Cel. Antônio Pessoa, Centro. Horário: 08h às 14h.`,
    tags: ["educação", "matrícula", "escola", "ensino fundamental", "SEDUC"],
    status: "active",
  },
  {
    title: "Coleta de Lixo e Limpeza Urbana",
    sourceType: "faq",
    category: "Serviços Urbanos",
    content: `Serviços de limpeza urbana em Itabaiana - PB:

P: Qual o horário e frequência da coleta de lixo?
R: A coleta domiciliar ocorre 3 vezes por semana na maioria dos bairros. Consulte o calendário do seu bairro na Secretaria de Serviços Urbanos (SESURB).

P: Como solicitar coleta de entulho?
R: Entre em contato com a SESURB pelo telefone ou presencialmente. O serviço é agendado conforme disponibilidade.

P: Como denunciar descarte irregular de lixo?
R: Registre uma reclamação pela Ouvidoria Municipal ou diretamente na SESURB com endereço e foto do local.

P: Onde fica o aterro sanitário?
R: Itabaiana utiliza o aterro sanitário regional. Resíduos especiais (eletrônicos, pilhas, medicamentos) devem ser levados aos pontos de coleta seletiva.

P: Como solicitar roçagem de terreno baldio?
R: Protocolar solicitação na SESURB com endereço completo do terreno.`,
    tags: ["lixo", "coleta", "limpeza urbana", "entulho", "SESURB", "aterro"],
    status: "active",
  },
  {
    title: "e-SIC — Acesso à Informação (Lei de Acesso à Informação)",
    sourceType: "regulation",
    category: "Transparência",
    content: `O e-SIC (Sistema Eletrônico do Serviço de Informações ao Cidadão) permite solicitar informações públicas à Prefeitura de Itabaiana com base na Lei nº 12.527/2011 (LAI).

Como solicitar:
1. Registrar pedido pelo portal digital ou presencialmente na Ouvidoria
2. Informar os dados do solicitante e descrever a informação desejada
3. Prazo de resposta: até 20 dias úteis (prorrogável por mais 10)

Tipos de informação que podem ser solicitadas:
- Contratos e licitações
- Despesas e receitas públicas
- Salários de servidores
- Projetos e obras
- Atos administrativos

Recurso: em caso de negativa, o cidadão pode recorrer à Controladoria Municipal em até 10 dias.`,
    tags: ["e-SIC", "LAI", "acesso à informação", "transparência", "licitação", "contrato"],
    status: "active",
  },
  {
    title: "Horários de Atendimento e Contatos da Prefeitura",
    sourceType: "text",
    category: "Atendimento Geral",
    content: `Prefeitura Municipal de Itabaiana - PB
Endereço: Rua Cel. Antônio Pessoa, s/n — Centro, Itabaiana - PB — CEP: 58200-000
Horário de atendimento: Segunda a Sexta, das 08h às 14h

Principais secretarias e contatos:
- SEMFIN (Finanças): IPTU, alvará de funcionamento, certidões — (83) XXXX-XXXX
- SEINFRA (Infraestrutura): obras, alvará de construção — (83) XXXX-XXXX
- SEDUC (Educação): matrículas, escolas — (83) XXXX-XXXX
- SESURB (Serviços Urbanos): coleta de lixo, limpeza — (83) XXXX-XXXX
- Secretaria de Saúde: UBS, postos de saúde — (83) XXXX-XXXX
- Ouvidoria: reclamações, denúncias — ouvidoria@itabaiana.pb.gov.br
- Portal digital: cac.itabaiana.pb.gov.br

Atendimento pelo Webchat: disponível 24h para abertura de protocolos e consultas automatizadas pelo cAIus.`,
    tags: ["contato", "horário", "atendimento", "secretaria", "endereço", "telefone"],
    status: "active",
  },
];

let inserted = 0;
let skipped = 0;

// Buscar o primeiro userId para usar como authorId
const [users] = await conn.execute("SELECT id FROM users LIMIT 1");
const authorId = users.length > 0 ? users[0].id : 1;

for (const source of sources) {
  const [existing] = await conn.execute(
    "SELECT id FROM caiusKnowledgeItems WHERE title = ?",
    [source.title]
  );
  if (existing.length > 0) {
    console.log(`⚠️  Já existe: "${source.title}" — ignorando`);
    skipped++;
    continue;
  }
  await conn.execute(
    `INSERT INTO caiusKnowledgeItems (title, sourceType, content, category, tags, status, authorId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [source.title, source.sourceType, source.content, source.category ?? null, JSON.stringify(source.tags), source.status, authorId]
  );
  console.log(`✅ Inserido: "${source.title}"`);
  inserted++;
}

console.log(`\n📚 Seed concluído: ${inserted} inseridos, ${skipped} ignorados`);
await conn.end();
