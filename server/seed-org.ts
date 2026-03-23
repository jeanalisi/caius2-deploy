/**
 * Seed da Estrutura Organizacional — Lei Complementar nº 010/2025
 * Município de Itabaiana/PB — Administração Direta e Indireta do Poder Executivo Municipal
 */

import { getDb } from "./db";
import { orgUnits, positions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Tipos de unidade por nível ───────────────────────────────────────────────
type OrgType =
  | "prefeitura" | "gabinete" | "procuradoria" | "controladoria" | "secretaria"
  | "superintendencia" | "secretaria_executiva" | "diretoria" | "departamento"
  | "coordenacao" | "gerencia" | "supervisao" | "secao" | "setor" | "nucleo"
  | "assessoria" | "unidade" | "junta" | "tesouraria" | "ouvidoria";

interface OrgUnitSeed {
  name: string;
  acronym?: string;
  type: OrgType;
  level: number;
  description?: string;
  legalBasis?: string;
  sortOrder?: number;
  children?: OrgUnitSeed[];
}

// ─── Estrutura completa da Lei 010/2025 ───────────────────────────────────────
const orgStructure: OrgUnitSeed[] = [
  {
    name: "Gabinete do Prefeito",
    acronym: "GABPRE",
    type: "gabinete",
    level: 1,
    description: "Órgão de direção superior — Gabinete do Prefeito Municipal de Itabaiana/PB",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 1,
    children: [
      { name: "Diretoria de Redação Oficial", type: "diretoria", level: 2, sortOrder: 1 },
      { name: "Diretoria de Comunicação Institucional", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Diretoria de Projetos Estratégicos", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Junta de Serviço Militar", type: "junta", level: 2, sortOrder: 4 },
      { name: "Assessoria de Gabinete", type: "assessoria", level: 2, sortOrder: 5 },
    ],
  },
  {
    name: "Gabinete do Vice-Prefeito",
    acronym: "GABVICE",
    type: "gabinete",
    level: 1,
    description: "Órgão de direção superior — Gabinete do Vice-Prefeito Municipal de Itabaiana/PB",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 2,
    children: [
      { name: "Assessoria do Vice-Prefeito", type: "assessoria", level: 2, sortOrder: 1 },
    ],
  },
  {
    name: "Procuradoria Geral do Município",
    acronym: "PGM",
    type: "procuradoria",
    level: 1,
    description: "Órgão de assessoramento jurídico — Procuradoria Geral do Município de Itabaiana/PB",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 3,
    children: [
      { name: "Gabinete da Procuradoria Geral do Município", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Gabinete das Subprocuradorias", type: "gabinete", level: 2, sortOrder: 2 },
      { name: "Diretoria de Gestão de Processos e Representação", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Assessoria Jurídica", type: "assessoria", level: 2, sortOrder: 4 },
    ],
  },
  {
    name: "Controladoria Geral do Município",
    acronym: "CGM",
    type: "controladoria",
    level: 1,
    description: "Órgão de controle interno — Controladoria Geral do Município de Itabaiana/PB",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 4,
    children: [
      { name: "Gabinete da Controladoria Geral do Município", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Secretaria Executiva da Controladoria Geral do Município", type: "secretaria_executiva", level: 2, sortOrder: 2 },
      { name: "Secretaria Executiva de Auditoria, Correição e Controle Social", type: "secretaria_executiva", level: 2, sortOrder: 3 },
      { name: "Diretoria de Transparência e Probidade Administrativa", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Ouvidoria-Geral do Município", type: "ouvidoria", level: 2, sortOrder: 5 },
    ],
  },
  {
    name: "Secretaria da Casa Civil",
    acronym: "SCC",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação instrumental — Secretaria da Casa Civil de Itabaiana/PB",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 5,
    children: [
      { name: "Gabinete da Secretaria da Casa Civil", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Atos e Publicações", type: "diretoria", level: 2, sortOrder: 2 },
    ],
  },
  {
    name: "Secretaria de Planejamento e Gestão Estratégica",
    acronym: "SEPLAN",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação instrumental — Secretaria de Planejamento e Gestão Estratégica",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 6,
    children: [
      { name: "Gabinete do Secretário", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Gestão de Convênios e Projetos", type: "diretoria", level: 2, sortOrder: 2, children: [
        { name: "Gerência de Arquitetura e Urbanismo", type: "gerencia", level: 3, sortOrder: 1 },
        { name: "Gerência de Engenharia e Obras Públicas", type: "gerencia", level: 3, sortOrder: 2 },
        { name: "Gerência de Planejamento Urbano", type: "gerencia", level: 3, sortOrder: 3 },
      ]},
      { name: "Diretoria de Recursos Humanos", type: "diretoria", level: 2, sortOrder: 3, children: [
        { name: "Gerência de Administração de Pessoal", type: "gerencia", level: 3, sortOrder: 1 },
        { name: "Gerência de Informações de Folha de Pagamento", type: "gerencia", level: 3, sortOrder: 2 },
        { name: "Gerência de Dados e Jornada de Trabalho", type: "gerencia", level: 3, sortOrder: 3 },
      ]},
      { name: "Diretoria de Tecnologia da Informação", type: "diretoria", level: 2, sortOrder: 4, children: [
        { name: "Gerência de Protocolo e Documentação", type: "gerencia", level: 3, sortOrder: 1 },
        { name: "Gerência de Administração Patrimonial", type: "gerencia", level: 3, sortOrder: 2 },
      ]},
      { name: "Gabinete do Secretário Executivo de Aquisição, Recursos e Logística", type: "gabinete", level: 2, sortOrder: 5, children: [
        { name: "Diretoria de Licitações e Contratos", type: "diretoria", level: 3, sortOrder: 1 },
        { name: "Diretoria do Almoxarifado Central", type: "diretoria", level: 3, sortOrder: 2 },
      ]},
      { name: "Secretaria Executiva do Orçamento Democrático Municipal", type: "secretaria_executiva", level: 2, sortOrder: 6 },
    ],
  },
  {
    name: "Secretaria de Finanças, Arrecadação e Tributos",
    acronym: "SEFIN",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação instrumental — Secretaria de Finanças, Arrecadação e Tributos",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 7,
    children: [
      { name: "Gabinete do Secretário", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Empenhos", type: "diretoria", level: 2, sortOrder: 2, children: [
        { name: "Gerência de Contas a Pagar", type: "gerencia", level: 3, sortOrder: 1 },
      ]},
      { name: "Diretoria de Concessões, Licenciamento e Regularização", type: "diretoria", level: 2, sortOrder: 3, children: [
        { name: "Gerência de Fiscalização, Regularização Fundiária e Intervenções Urbanas", type: "gerencia", level: 3, sortOrder: 1 },
      ]},
      { name: "Diretoria de Contabilidade", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Diretoria de Arrecadação", type: "diretoria", level: 2, sortOrder: 5, children: [
        { name: "Gerência de Controle da Dívida Ativa", type: "gerencia", level: 3, sortOrder: 1 },
        { name: "Gerência de Cobrança de Taxas e Arrecadação de Impostos", type: "gerencia", level: 3, sortOrder: 2 },
        { name: "Gerência de Registros de Notas Fiscais", type: "gerencia", level: 3, sortOrder: 3 },
      ]},
      { name: "Tesouraria-Geral", type: "tesouraria", level: 2, sortOrder: 6 },
      { name: "Secretário Executivo de Administração Tributária", type: "secretaria_executiva", level: 2, sortOrder: 7, children: [
        { name: "Gerência de Simplificação do Registro e Legalização de Empresas e Negócios – REDESIM", type: "gerencia", level: 3, sortOrder: 1 },
      ]},
    ],
  },
  {
    name: "Secretaria de Assistência Social",
    acronym: "SEMAS",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Assistência Social",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 8,
    children: [
      { name: "Gabinete do Secretário Municipal de Assistência Social", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Coordenação de Recursos e Logística", type: "coordenacao", level: 2, sortOrder: 2 },
      { name: "Diretoria de Gestão do Sistema Único de Assistência Social - SUAS", type: "diretoria", level: 2, sortOrder: 3, children: [
        { name: "Gerência da Vigilância Socioassistencial", type: "gerencia", level: 3, sortOrder: 1 },
      ]},
      { name: "Departamento de Proteção Social Básica", type: "departamento", level: 2, sortOrder: 4, children: [
        { name: "Diretoria de Políticas para as Mulheres", type: "diretoria", level: 3, sortOrder: 1 },
        { name: "Coordenação de Benefícios Eventuais", type: "coordenacao", level: 3, sortOrder: 2 },
        { name: "Coordenação do CRAS", type: "coordenacao", level: 3, sortOrder: 3 },
        { name: "Coordenação do SCFV", type: "coordenacao", level: 3, sortOrder: 4 },
        { name: "Coordenação do Programa Criança Feliz", type: "coordenacao", level: 3, sortOrder: 5 },
        { name: "Coordenação do Cadastro Único de Programas Sociais", type: "coordenacao", level: 3, sortOrder: 6 },
        { name: "Gerência do Programa Bolsa Família", type: "gerencia", level: 3, sortOrder: 7 },
        { name: "Coordenação de Participação Social e Diversidade", type: "coordenacao", level: 3, sortOrder: 8 },
        { name: "Gerência de Desenvolvimento Social e Serviços Comunitários", type: "gerencia", level: 3, sortOrder: 9 },
        { name: "Gerência de Segurança Alimentar e Nutricional", type: "gerencia", level: 3, sortOrder: 10 },
      ]},
      { name: "Departamento de Proteção Social Especial de Média e Alta Complexidade", type: "departamento", level: 2, sortOrder: 5, children: [
        { name: "Coordenação do CREAS", type: "coordenacao", level: 3, sortOrder: 1 },
      ]},
      { name: "Diretoria de Juventude, Esportes e Lazer", type: "diretoria", level: 2, sortOrder: 6, children: [
        { name: "Gerência de Incentivo e Fomento ao Esporte", type: "gerencia", level: 3, sortOrder: 1 },
        { name: "Gerência de Programas e Projetos de Juventude", type: "gerencia", level: 3, sortOrder: 2 },
      ]},
    ],
  },
  {
    name: "Secretaria de Desenvolvimento Econômico, Inovação e Turismo",
    acronym: "SEDEC",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Desenvolvimento Econômico, Inovação e Turismo",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 9,
    children: [
      { name: "Gabinete do Secretário", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Indústria e Comércio", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Secretaria Executiva de Trabalho, Emprego e Renda", type: "secretaria_executiva", level: 2, sortOrder: 3, children: [
        { name: "Gerência da Casa do Empreendedor", type: "gerencia", level: 3, sortOrder: 1 },
        { name: "Gerência de Políticas de Capacitação e Qualificação", type: "gerencia", level: 3, sortOrder: 2 },
      ]},
      { name: "Diretoria de Turismo", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Diretoria de Ciência, Tecnologia e Inovação", type: "diretoria", level: 2, sortOrder: 5 },
    ],
  },
  {
    name: "Secretaria de Cultura",
    acronym: "SECULT",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Cultura",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 10,
    children: [
      { name: "Gabinete do Secretário", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Gerência de Formação Cultural e Indicadores", type: "gerencia", level: 2, sortOrder: 2 },
      { name: "Gerência de Manifestação Cultural e Economia Criativa", type: "gerencia", level: 2, sortOrder: 3 },
      { name: "Diretoria de Patrimônio Histórico, Artístico e Cultural", type: "diretoria", level: 2, sortOrder: 4, children: [
        { name: "Seção da Biblioteca Municipal", type: "secao", level: 3, sortOrder: 1 },
        { name: "Seção do Espaço Cultural Sivuca", type: "secao", level: 3, sortOrder: 2 },
      ]},
      { name: "Diretoria de Difusão Cultural e Eventos", type: "diretoria", level: 2, sortOrder: 5 },
    ],
  },
  {
    name: "Secretaria de Agricultura e Desenvolvimento Rural",
    acronym: "SEMAGRI",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Agricultura e Desenvolvimento Rural",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 11,
    children: [
      { name: "Gabinete do Secretário", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Supervisão do Serviço de Inspeção Municipal", type: "supervisao", level: 2, sortOrder: 2 },
      { name: "Diretoria de Infraestrutura Rural e Segurança Hídrica", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Diretoria de Aquicultura, Agropecuária e Pesca", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Diretoria de Abastecimento", type: "diretoria", level: 2, sortOrder: 5 },
      { name: "Secretaria Executiva de Agricultura Familiar", type: "secretaria_executiva", level: 2, sortOrder: 6, children: [
        { name: "Gerência de Desenvolvimento Territorial", type: "gerencia", level: 3, sortOrder: 1 },
      ]},
    ],
  },
  {
    name: "Secretaria de Educação",
    acronym: "SEDUC",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Educação",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 12,
    children: [
      { name: "Gabinete do Secretário de Educação", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Gestão Educacional", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Diretoria Pedagógica", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Diretoria de Infraestrutura Escolar", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Gerência de Transporte Escolar", type: "gerencia", level: 2, sortOrder: 5 },
      { name: "Gerência de Alimentação Escolar", type: "gerencia", level: 2, sortOrder: 6 },
      { name: "Coordenação de Educação Infantil", type: "coordenacao", level: 2, sortOrder: 7 },
      { name: "Coordenação do Ensino Fundamental", type: "coordenacao", level: 2, sortOrder: 8 },
      { name: "Coordenação de Educação Especial e Inclusiva", type: "coordenacao", level: 2, sortOrder: 9 },
      { name: "Coordenação de Educação de Jovens e Adultos – EJA", type: "coordenacao", level: 2, sortOrder: 10 },
    ],
  },
  {
    name: "Secretaria de Infraestrutura e Serviços Públicos",
    acronym: "SEINFRA",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Infraestrutura e Serviços Públicos",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 13,
    children: [
      { name: "Gabinete do Secretário de Infraestrutura", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Obras e Projetos", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Diretoria de Serviços Públicos e Manutenção Urbana", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Diretoria de Iluminação Pública", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Gerência de Fiscalização de Obras", type: "gerencia", level: 2, sortOrder: 5 },
      { name: "Gerência de Limpeza Urbana e Resíduos Sólidos", type: "gerencia", level: 2, sortOrder: 6 },
    ],
  },
  {
    name: "Secretaria de Saúde",
    acronym: "SESAU",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Saúde",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 14,
    children: [
      { name: "Gabinete do Secretário de Saúde", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Atenção Básica", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Diretoria de Vigilância em Saúde", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Diretoria de Regulação, Controle e Avaliação", type: "diretoria", level: 2, sortOrder: 4 },
      { name: "Diretoria de Assistência Farmacêutica", type: "diretoria", level: 2, sortOrder: 5 },
      { name: "Gerência de Saúde Mental", type: "gerencia", level: 2, sortOrder: 6 },
      { name: "Gerência de Saúde da Mulher e da Criança", type: "gerencia", level: 2, sortOrder: 7 },
      { name: "Gerência de Endemias e Epidemiologia", type: "gerencia", level: 2, sortOrder: 8 },
      { name: "Coordenação do CAPS", type: "coordenacao", level: 2, sortOrder: 9 },
      { name: "Coordenação das Unidades Básicas de Saúde", type: "coordenacao", level: 2, sortOrder: 10 },
    ],
  },
  {
    name: "Secretaria de Meio Ambiente, Sustentabilidade e Recursos Hídricos",
    acronym: "SEMAM",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Meio Ambiente, Sustentabilidade e Recursos Hídricos",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 15,
    children: [
      { name: "Gabinete do Secretário de Meio Ambiente", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Licenciamento e Fiscalização Ambiental", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Diretoria de Recursos Hídricos e Saneamento", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Gerência de Educação Ambiental", type: "gerencia", level: 2, sortOrder: 4 },
      { name: "Gerência de Arborização e Áreas Verdes", type: "gerencia", level: 2, sortOrder: 5 },
    ],
  },
  {
    name: "Secretaria de Transportes, Estradas e Rodagens",
    acronym: "SETRANS",
    type: "secretaria",
    level: 1,
    description: "Órgão de atuação finalística — Secretaria de Transportes, Estradas e Rodagens",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 16,
    children: [
      { name: "Gabinete do Secretário de Transportes", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Diretoria de Manutenção de Estradas e Rodovias", type: "diretoria", level: 2, sortOrder: 2 },
      { name: "Diretoria de Frota e Manutenção de Veículos", type: "diretoria", level: 2, sortOrder: 3 },
      { name: "Gerência de Transporte Coletivo", type: "gerencia", level: 2, sortOrder: 4 },
    ],
  },
  {
    name: "Superintendência Executiva de Mobilidade Urbana",
    acronym: "SEMOB",
    type: "superintendencia",
    level: 1,
    description: "Órgão de atuação descentralizada — Superintendência Executiva de Mobilidade Urbana",
    legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 17,
    children: [
      { name: "Gabinete da Superintendência", type: "gabinete", level: 2, sortOrder: 1 },
      { name: "Departamento de Mobilidade Urbana", type: "departamento", level: 2, sortOrder: 2 },
      { name: "Coordenação de Operações", type: "coordenacao", level: 2, sortOrder: 3 },
      { name: "Coordenação Administrativa e Financeira", type: "coordenacao", level: 2, sortOrder: 4 },
    ],
  },
];

// ─── Cargos previstos na Lei ───────────────────────────────────────────────────
const positionsSeed = [
  { name: "Secretário Municipal", code: "SEC", level: "secretario" as const, canSign: true, canApprove: true },
  { name: "Secretário Executivo", code: "SECEX", level: "secretario_executivo" as const, canSign: true, canApprove: true },
  { name: "Procurador Geral do Município", code: "PGM", level: "secretario" as const, canSign: true, canApprove: true },
  { name: "Controlador Geral do Município", code: "CGM", level: "secretario" as const, canSign: true, canApprove: true },
  { name: "Superintendente Executivo", code: "SUPT", level: "secretario" as const, canSign: true, canApprove: true },
  { name: "Diretor", code: "DIR", level: "diretor" as const, canSign: true, canApprove: true },
  { name: "Coordenador", code: "COORD", level: "coordenador" as const, canSign: false, canApprove: true },
  { name: "Gerente", code: "GER", level: "gerente" as const, canSign: false, canApprove: false },
  { name: "Supervisor", code: "SUP", level: "supervisor" as const, canSign: false, canApprove: false },
  { name: "Chefe de Seção", code: "CHSEC", level: "chefe" as const, canSign: false, canApprove: false },
  { name: "Chefe de Setor", code: "CHSET", level: "chefe" as const, canSign: false, canApprove: false },
  { name: "Assessor Técnico", code: "ASTEC", level: "assessor_tecnico" as const, canSign: false, canApprove: false },
  { name: "Assessor Especial", code: "ASESP", level: "assessor_especial" as const, canSign: false, canApprove: false },
  { name: "Ouvidor Municipal", code: "OUV", level: "diretor" as const, canSign: true, canApprove: true },
  { name: "Tesoureiro Geral", code: "TES", level: "diretor" as const, canSign: true, canApprove: true },
];

// ─── Função recursiva para inserir unidades ───────────────────────────────────
async function insertOrgUnit(
  db: any,
  unit: OrgUnitSeed,
  parentId: number | null = null
): Promise<number> {
  const [result] = await db.insert(orgUnits).values({
    name: unit.name,
    acronym: unit.acronym ?? null,
    type: unit.type,
    level: unit.level,
    parentId: parentId ?? null,
    description: unit.description ?? null,
    legalBasis: unit.legalBasis ?? "Lei Complementar nº 010/2025",
    sortOrder: unit.sortOrder ?? 0,
    isActive: true,
    isSeeded: true,
  });

  const insertedId = (result as any).insertId as number;

  if (unit.children && unit.children.length > 0) {
    for (const child of unit.children) {
      await insertOrgUnit(db, child, insertedId);
    }
  }

  return insertedId;
}

// ─── Função principal de seed ─────────────────────────────────────────────────
export async function seedOrgStructure(): Promise<{ units: number; positions: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se já foi feito o seed
  const existing = await db.select().from(orgUnits).where(eq(orgUnits.isSeeded, true)).limit(1);
  if (existing.length > 0) {
    console.log("[Seed] Estrutura organizacional já foi criada anteriormente. Pulando.");
    const allUnits = await db.select().from(orgUnits);
    const allPositions = await db.select().from(positions);
    return { units: allUnits.length, positions: allPositions.length };
  }

  console.log("[Seed] Iniciando criação da estrutura organizacional — Lei 010/2025...");

  let unitCount = 0;

  // Inserir todos os órgãos e subestruturas recursivamente
  for (const unit of orgStructure) {
    await insertOrgUnit(db, unit, null);
    unitCount++;
  }

  // Contar total de unidades inseridas
  const allUnits = await db.select().from(orgUnits);
  unitCount = allUnits.length;

  // Inserir cargos
  let positionCount = 0;
  for (const pos of positionsSeed) {
    await db.insert(positions).values({
      name: pos.name,
      code: pos.code,
      level: pos.level,
      provisionType: "comissao",
      canSign: pos.canSign,
      canApprove: pos.canApprove,
      isActive: true,
      isSeeded: true,
    });
    positionCount++;
  }

  console.log(`[Seed] Concluído: ${unitCount} unidades organizacionais e ${positionCount} cargos criados.`);
  return { units: unitCount, positions: positionCount };
}
