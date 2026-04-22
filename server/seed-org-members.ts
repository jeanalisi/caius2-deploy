/**
 * seed-org-members.ts — Seed de membros públicos da estrutura administrativa
 * Fonte: Folha de Pagamento × Lei Complementar nº 010/2025 — Itabaiana/PB
 *
 * Apenas servidores com cargos previstos na Lei 010/2025 são inseridos.
 * O mapeamento usa o acrônimo da secretaria para localizar a orgUnit no banco.
 */
import { getDb } from "./db";
import { orgUnits, orgMembers } from "../drizzle/schema";

// ─── Mapeamento: sigla da secretaria (folha) → acrônimo da orgUnit ─────────────
const SECRETARIA_TO_ACRONYM: Record<string, string> = {
  "GABINETE DO PREFEITO": "GABPRE",
  "GABINETE DO VICE PREFEITO": "GABVICE",
  "PROCURADORIA GERAL DO MUNICIPIO": "PGM",
  "CONTROLAD GERAL DO MUNICIPIO": "CGM",
  "SECR CHEFE DE GABINETE": "GABPRE",
  "SECRETARIA DA CASA CIVIL - SCC": "SCC",
  "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN": "SEPLAN",
  "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT": "SEFIN",
  "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS": "SEMAS",
  "SECR MUN DE DESENV ECONOMICO, INOV E TUR-SEDEC": "SEDEC",
  "SECRETARIA MUN. DE CULTURA - SECULT": "SECULT",
  "SECRETARIA DE AGRICULTURA E DESENV RURAL-SEMAGRI": "SEMAGRI",
  "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC": "SEDUC",
  "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA": "SEINFRA",
  "SECR MUN DE SAUDE-SMS": "SESAU",
  "SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS H\u00cdDRICOS-SEMAM": "SEMAM",
  "SECRETARIA DE TRANSP EST E ROD.-SETRANS": "SETRANS",
  "SECRETARIA DE TRANSPORTES, ESTRADAS E RODAGENS-SETRANS": "SETRANS",
  "SUPERINT EXECUTIVA DA MOB URBANA-SEMOB": "SEMOB",
};

// ─── Dados dos servidores (folha × Lei 010/2025) ──────────────────────────────
const SERVIDORES = [
  { matricula: "1114604", nome: "ADALBERTO MODESTO GOUVEIA COELHO NETO", cargo: "ASSESSOR T\u00c9CNICO EM GEST\u00c3O DO PROGR. BOLSA FAM\u00cdLIA", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114325", nome: "ADERBAL FEREIRA DA SILVA FILHO", cargo: "DIRETOR DE TECNOLOGIA DA INFORMA\u00c7\u00c3O", cargoLei: "Diretor", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114335", nome: "ADRIANA LIRA DO NASCIMENTO SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114074", nome: "AFHONSO FABRYCIO DE SOUSA RAMOS", cargo: "DIRETOR DE EMPENHOS", cargoLei: "Diretor", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "1114319", nome: "ALLYSON PATRICIO GOMES DA SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "1114707", nome: "ALYSSON GABRIEL DE LIMA ALBUQUERQUE", cargo: "GERENTE DE ARQUITETURA E URBANISMO", cargoLei: "Gerente", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114206", nome: "ANA KARLA RODRIGUES COSTA ARAUJO", cargo: "GERENTE DE SA\u00daDE BUCAL", cargoLei: "Gerente", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114802", nome: "ANA LUCIA DE LIMA", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "1114846", nome: "ANDRE GUSTAVO JANSEN DE OLIVEIRA", cargo: "GERENTE DE ESTUDO, PESQUISA E LICENC. AMBIENTAL", cargoLei: "Gerente", secretaria: "SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS H\u00cdDRICOS-SEMAM" },
  { matricula: "114163", nome: "ANDREIA WALESCA GADELHA DA SILVA", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "1114670", nome: "ANDREL GOMES DE SOUSA", cargo: "DIRETOR DE ARRECADA\u00c7\u00c3O", cargoLei: "Diretor", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "114320", nome: "ANDREY LEITE ESPERIDIAO", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DA CASA CIVIL - SCC" },
  { matricula: "114203", nome: "ANDRYL ALMEIDA FRANCA", cargo: "GERENTE DE VIGIL\u00c2NCIA EPIDEMIOL\u00d3GICA", cargoLei: "Gerente", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114881", nome: "ANTONIO CARLOS DA SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECR MUN DE DESENV ECONOMICO, INOV E TUR-SEDEC" },
  { matricula: "1114360", nome: "ANTONIO DE ANDRADE PEREIRA", cargo: "DIRETOR DE DIFUS\u00c3O CULTURAL E EVENTOS", cargoLei: "Diretor", secretaria: "SECRETARIA MUN. DE CULTURA - SECULT" },
  { matricula: "114071", nome: "ANTONIO DE PADUA SANTOS DA SILVA", cargo: "SECRET\u00c1RIO EXEC DE AUDIT, CORREI\u00c7\u00c3O E CONTR SOCIAL", cargoLei: "Secret\u00e1rio Executivo", secretaria: "CONTROLAD GERAL DO MUNICIPIO" },
  { matricula: "114123", nome: "ANTONIO FERNANDO DE CARVALHO", cargo: "GERENTE DE LIMPEZA URBANA", cargoLei: "Gerente", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "114328", nome: "ANTONIO MARCOS DA SILVA", cargo: "DIRETOR DE JUVENTUDE, ESPORTES E LAZER", cargoLei: "Diretor", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114552", nome: "AUDREYSANNE SHEILA SANTOS ISMAEL", cargo: "COORDENADOR DE EQUIPE MULTIDISCIPLINAR", cargoLei: "Coordenador", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "1114699", nome: "BEN HUR DE SOUSA E SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
  { matricula: "1114663", nome: "BRUNA ELLEN MACHADO DA SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114043", nome: "BRUNO MELO COSTA", cargo: "SECRETARO CHEFE DA CASA CIVIL", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECRETARIA DA CASA CIVIL - SCC" },
  { matricula: "114120", nome: "CELIO ROGERIO DE LIRA", cargo: "SECRET\u00c1RIO EXECUTIVO DE SERVI\u00c7OS URBANOS", cargoLei: "Secret\u00e1rio Executivo", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "1114596", nome: "CICERO ANTONIO DA SILVA NETO", cargo: "GERENTE ADMINISTRATIVO E OPERACIONAL", cargoLei: "Gerente", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114129", nome: "CLAUDIA MILENE DA SILVA RAMOS", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114680", nome: "CLAUDIA OLIVEIRA DE FREITAS SILVA", cargo: "GERENTE DE REGISTROS DE NOTAS FISCAIS", cargoLei: "Gerente", secretaria: "CONTROLAD GERAL DO MUNICIPIO" },
  { matricula: "1114568", nome: "CLAUDIO ADALBERTO GOMES DE OLIVEIRA", cargo: "GERENTE DE MANUT DA FROTA E EQUIPAMENTOS", cargoLei: "Gerente", secretaria: "SECRETARIA DE TRANSPORTES, ESTRADAS E RODAGENS-SETRANS" },
  { matricula: "1114638", nome: "CLEA MARIA FREITAS AIRES", cargo: "ASSESSOR ESPECIAL I", cargoLei: "Assessor Especial", secretaria: "GABINETE DO PREFEITO" },
  { matricula: "114211", nome: "CLEBSON LUCAS DE LIMA", cargo: "SUPERVISOR DE ALMOXARIFADO", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114339", nome: "DEBORA PESSOA DA PAIXAO", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "114317", nome: "DIVA CRISTINA LIRA CORREIA DE MELO", cargo: "COORDENADOR DE RECURSOS E LOG\u00cdSTICA", cargoLei: "Coordenador", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114854", nome: "EDNALDO ARAUJO DA SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DE TRANSP EST E ROD.-SETRANS" },
  { matricula: "114210", nome: "EDUARDO BARBOZA DE SOUZA", cargo: "DIRETOR DE GEST\u00c3O E PLANEJAMENTO EDUCACIONAL", cargoLei: "Diretor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114112", nome: "EDUARDO LUIZ DE MELO MARQUES", cargo: "GERENTE DE PROTOCOLO E DOCUMENTA\u00c7\u00c3O", cargoLei: "Gerente", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114803", nome: "ELIETE MARIA BRITO DE CARVALHO", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114113", nome: "ELIVELTON SOUSA DO NASCIMENTO", cargo: "GERENTE DE ADMINISTRA\u00c7\u00c3O PATRIMONIAL", cargoLei: "Gerente", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114056", nome: "EMILSON JOSE DE SOUSA", cargo: "SUPERINTENDENTE EXECUTIVO DE MOBILIDADE URBANA", cargoLei: "Superintendente Executivo", secretaria: "SUPERINT EXECUTIVA DA MOB URBANA-SEMOB" },
  { matricula: "114308", nome: "EULINO REZENDE DE CARVALHO NETO", cargo: "SECRET\u00c1RIO EXECUTIVO DE ASSIST\u00caNCIA SOCIAL", cargoLei: "Secret\u00e1rio Executivo", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114214", nome: "EVERTON LOURENCO DE MELO", cargo: "GERENTE DE ACOMP. DE PROGR. SOCIAIS E FREQ. ESC", cargoLei: "Gerente", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "1114697", nome: "FABIANO OLIVEIRA DE ANDRADE", cargo: "SECRET\u00c1RIO-CHEFE DE GABINETE", cargoLei: "Secret\u00e1rio-Chefe de Gabinete", secretaria: "SECR CHEFE DE GABINETE" },
  { matricula: "114213", nome: "FERNANDA KELLY MELO DE SOUZA", cargo: "DIRETOR DE AN\u00c1LISE E GEST\u00c3O DE DADOS EDUCACIONAIS", cargoLei: "Diretor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114104", nome: "FERNANDA NATHALIA VIEIRA DE ANDRADE", cargo: "DIRETOR DE GEST\u00c3O DE CONV\u00caNIOS E PROJETOS", cargoLei: "Diretor", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114315", nome: "FERNANDO XAVIER PEREIRA", cargo: "DIRETOR DA POLICL\u00cdNICA MUNIC. DR. AGLAIR DA SILVA", cargoLei: "Diretor", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114207", nome: "FRANCISCO DJALMA SILVA BRAGA", cargo: "GERENTE DO LABORAT\u00d3RIO MUNICIPAL DE AN\u00c1L. CL\u00cdNICAS", cargoLei: "Gerente", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114686", nome: "GABRIELA MARIA OLIVEIRA DO NASCIMENTO", cargo: "ASSESSOR T\u00c9CNICO EM OUVIDORIA", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114183", nome: "GEISY ARAUJO DE ALMEIDA", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114066", nome: "GESIELLE FERNANDES BRITO LIMA DE MENEZES", cargo: "DIRETOR DE ATOS E PUBLICAC\u00d5ES", cargoLei: "Diretor", secretaria: "SECRETARIA DA CASA CIVIL - SCC" },
  { matricula: "114137", nome: "GILBERLAN PEREIRA DA SILVA", cargo: "SUPERVISOR DE ALMOXARIFADO", cargoLei: "Supervisor", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114118", nome: "GILBERTO GALDINO DA SILVA", cargo: "GERENTE DE DESENVOLVIMENTO TERRITORIAL", cargoLei: "Gerente", secretaria: "SECRETARIA DE AGRICULTURA E DESENV RURAL-SEMAGRI" },
  { matricula: "5444", nome: "GILVANETE FERREIRA DA SILVA", cargo: "COORDENADOR PEDAGOGICO", cargoLei: "Coordenador", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114092", nome: "GLEICE BARBOSA PEREIRA DA SILVA", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114126", nome: "HELMA CRISTINA ASSIS DE LIMA", cargo: "CHEFE DE SE\u00c7\u00c3O DO TERMINAL RODOVI\u00c1RIO MUNICIPAL", cargoLei: "Chefe de Se\u00e7\u00e3o", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "1114510", nome: "HERACLITO FONSECA DE MORAIS JUNIOR", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA MUN. DE CULTURA - SECULT" },
  { matricula: "114310", nome: "INACIO DE ARAUJO CAVALCANTE", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114185", nome: "INAYARA ELIDA AQUINO DE MELO", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114329", nome: "IRAN VICTOR DE ALMEIDA MELO", cargo: "GERENTE DE EDUCA\u00c7\u00c3O AMBIENTAL E PRESERVA\u00c7\u00c3O", cargoLei: "Gerente", secretaria: "SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS H\u00cdDRICOS-SEMAM" },
  { matricula: "114140", nome: "JACQUELINE ALVES DE LIMA", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "1114330", nome: "JANAINA KARLA DONATO DE ALMEIDA LINS", cargo: "GERENTE DE MANIFESTA\u00c7\u00c3O CULT E ECONOMIA CRIATIVA", cargoLei: "Gerente", secretaria: "SECRETARIA MUN. DE CULTURA - SECULT" },
  { matricula: "114332", nome: "JANIO DE SANTANA", cargo: "ASSESSOR ESPECIAL III", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DA CASA CIVIL - SCC" },
  { matricula: "114309", nome: "JENNIFER SILVA OLIVEIRA", cargo: "ASSESSOR T\u00c9CNICO EM ASSIST\u00caNCIA SOCIAL", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114044", nome: "JHON KENNEDY DE OLIVEIRA", cargo: "PROCURADOR GERAL DO MUNICIPIO", cargoLei: "Procurador Geral do Munic\u00edpio", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
  { matricula: "1114706", nome: "JOAO ARTHUR SOUSA RODRIGUES", cargo: "GERENTE DE PLANEJAMENTO URBANO", cargoLei: "Gerente", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114705", nome: "JOAO GUALBERTO RODRIGUES NETO", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "GABINETE DO VICE PREFEITO" },
  { matricula: "114049", nome: "JOAO MUNIZ DA CRUZ FILHO", cargo: "SECRET\u00c1RIO MUNICIPAL DE AGRIC. E DESENV. RURAL", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECRETARIA DE AGRICULTURA E DESENV RURAL-SEMAGRI" },
  { matricula: "1114517", nome: "JOAO NETO ALVES CORREIA", cargo: "GERENTE DE PROGRAMAS E PROJETOS DE JUVENTUDE", cargoLei: "Gerente", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114880", nome: "JOAO RODRIGUES DURE FILHO", cargo: "COORDENADOR DA DEFESA CIVIL", cargoLei: "Coordenador", secretaria: "SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS H\u00cdDRICOS-SEMAM" },
  { matricula: "114053", nome: "JOELMA LINS DA FONSECA", cargo: "SECRETARIO MUNICIPAL DE EDUCACAO", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114057", nome: "JOSE CLAUDIO CHAVES CAVALCANTE NETO", cargo: "PREFEITO", cargoLei: "Prefeito", secretaria: "GABINETE DO PREFEITO" },
  { matricula: "114117", nome: "JOSE EVERALDO LOURO FILHO", cargo: "SUPERVISOR DO SERVI\u00c7O DE INSPE\u00c7\u00c3O MUNICIPAL", cargoLei: "Supervisor", secretaria: "SECRETARIA DE AGRICULTURA E DESENV RURAL-SEMAGRI" },
  { matricula: "114050", nome: "JOSE FABIO RODRIGUES DE ANDRADE", cargo: "SECRET\u00c1RIO MUNICIPAL DE CULTURA", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECRETARIA MUN. DE CULTURA - SECULT" },
  { matricula: "114046", nome: "JOSE GERALDO OLIVEIRA DE SOUSA", cargo: "SECRETAROP DE FINANCAS. ARREC E TRIBUTOS", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "114331", nome: "JOSE GILBERTO MARTINIANO DA SILVA", cargo: "COORDENADOR DE OPERA\u00c7\u00d5ES", cargoLei: "Coordenador", secretaria: "SUPERINT EXECUTIVA DA MOB URBANA-SEMOB" },
  { matricula: "114119", nome: "JOSE PAULO ROSA DA CONCEICAO", cargo: "DIRETOR DE PATRIM\u00d4NIO HIST., ART\u00cdSTICO E CULTURAL", cargoLei: "Diretor", secretaria: "SECRETARIA MUN. DE CULTURA - SECULT" },
  { matricula: "114116", nome: "JOSE ROBERTO DE LUNA", cargo: "SUPERVISOR DE SUPRIMENTOS", cargoLei: "Supervisor", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114661", nome: "JOSEFA RODRIGUES FERREIRA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114073", nome: "JOSEMAR PEREIRA DA SILVA", cargo: "GERENTE DE FISC., REGUL. FUND E INTERV. URBANAS", cargoLei: "Gerente", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "1114840", nome: "JOSILENE MARIA DA SILVA", cargo: "SUPERVISOR(A)", cargoLei: "Supervisor", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114124", nome: "JOSIVALDO SOARES DA SILVA", cargo: "GERENTE DE ILUMINA\u00c7\u00c3O P\u00daBLICA", cargoLei: "Gerente", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "1114695", nome: "KALINE KAROLINE DA SILVA CUSTODIO", cargo: "ASSESSOR T\u00c9CNICO EM GEST\u00c3O DO PROGR. BOLSA FAM\u00cdLIA", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114326", nome: "LAURA KARYNE MACHADO DA SILVA", cargo: "GERENTE DE DESENVOLV. SOCIAL E SERV. COMUNITARIOS", cargoLei: "Gerente", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114325", nome: "LEANDRO PEREIRA XAVIER", cargo: "COORDENADOR DE PARTICIPA\u00c7\u00c3O SOCIAL E DIVERSIDADE", cargoLei: "Coordenador", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114314", nome: "LIEDSON RUAN DA SILVA ANDRE", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "GABINETE DO PREFEITO" },
  { matricula: "1114662", nome: "LINDALVA GOMES DOS SANTOS MARANHAO", cargo: "COORDENADOR DO SERV. DE CONV. E FORT. DE VIN. SCFV", cargoLei: "Coordenador", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114324", nome: "LUANA MARIA ARAUJO XAVIER", cargo: "ASSESSOR T\u00c9CNICO EM GEST\u00c3O DO PROGR. BOLSA FAM\u00cdLIA", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114564", nome: "LUCAS SARMENTO DA FONSECA", cargo: "SUPERVISOR DE CONTROLE", cargoLei: "Supervisor", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114321", nome: "LUCIANA LIGIA LIRA CORREIA ARAUJO", cargo: "SECRETARIO EXECUTIVO DE TRABALHO, EMPREGO E RENDA", cargoLei: "Secret\u00e1rio Executivo", secretaria: "SECR MUN DE DESENV ECONOMICO, INOV E TUR-SEDEC" },
  { matricula: "1114632", nome: "LUCIANO CORREIA MARINHO", cargo: "SECRET\u00c1RIO EXECUTIVO DA CONTROL GERAL DO MUNICIPIO", cargoLei: "Secret\u00e1rio Executivo", secretaria: "CONTROLAD GERAL DO MUNICIPIO" },
  { matricula: "1114878", nome: "LUCIANO DA SILVA", cargo: "COORDENADOR ADMINISTRATIVO E FINANCEIRO", cargoLei: "Coordenador", secretaria: "SUPERINT EXECUTIVA DA MOB URBANA-SEMOB" },
  { matricula: "114048", nome: "LUIS FRANCISCO DE SOUSA FILHO", cargo: "SECRET\u00c1RIO MUN. DE DESENV. ECON\u00d4N,INOV. E TURISMO", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECR MUN DE DESENV ECONOMICO, INOV E TUR-SEDEC" },
  { matricula: "114319", nome: "LUIZ CARLOS BATISTA SOARES", cargo: "ASSESSOR ESPECIAL I", cargoLei: "Assessor Especial", secretaria: "GABINETE DO PREFEITO" },
  { matricula: "114068", nome: "MACIANA NUNES DA SILVA", cargo: "ASSESSOR TECNICO JURIDICO", cargoLei: "Assessor T\u00e9cnico", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
  { matricula: "1114877", nome: "MAGNA PEREIRA ARCELA MEDEIROS", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "CONTROLAD GERAL DO MUNICIPIO" },
  { matricula: "114122", nome: "MARCOS ANTONIO DE ASSUNCAO", cargo: "GERENTE DE MANUTEN\u00c7\u00c3O PREDIAL", cargoLei: "Gerente", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "1114558", nome: "MARIA APARECIDA DA SILVA MOURA", cargo: "GERENTE DE ESTRADAS E RODAGENS", cargoLei: "Gerente", secretaria: "SECRETARIA DE TRANSPORTES, ESTRADAS E RODAGENS-SETRANS" },
  { matricula: "1114544", nome: "MARIA CAMILA DE ALMEIDA SOUZA", cargo: "ASSESSOR T\u00c9CNICO EM GEST\u00c3O DO PROGR. BOLSA FAM\u00cdLIA", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "114110", nome: "MARIA DO AMPARO DIAS PAZ", cargo: "GERENTE DE ADMINISTRA\u00c7\u00c3O PATRIMONIAL", cargoLei: "Gerente", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "1114681", nome: "MARIA LUIZA ALBUQUERQUE CORIOLANO", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DE AGRICULTURA E DESENV RURAL-SEMAGRI" },
  { matricula: "114109", nome: "MARIANA MORAES OLIVEIRA LUCENA", cargo: "DIRETOR DE RECURSOS HUMANOS", cargoLei: "Diretor", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114660", nome: "MATEUS PEREIRA DA SILVA", cargo: "ASSESSOR T\u00c9CNICO EM LICITA\u00c7\u00d5ES E CONTRATOS", cargoLei: "Assessor T\u00e9cnico", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "1114938", nome: "MATEUS PEREIRA DA SILVA", cargo: "GERENTE DE DADOS E JORNADA DE TRABALHO", cargoLei: "Gerente", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114316", nome: "MICHELLY GARDENIA DA COSTA FONSECA", cargo: "COORDENADOR DO PROGRAMA CRIAN\u00c7A FELIZ", cargoLei: "Coordenador", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114551", nome: "MIGUEL LEONARDO FRANCISCO DA SILVA", cargo: "DIRETOR DE PROJETOS ESTRAT\u00c9GICOS", cargoLei: "Diretor", secretaria: "SECR CHEFE DE GABINETE" },
  { matricula: "1114555", nome: "MIRIAM SABINA DA SILVA MEDEIROS", cargo: "COORDENADOR DE EQUIPE MULTIDISCIPLINAR", cargoLei: "Coordenador", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114884", nome: "MITIALLY RAYANE DE OLVIEIRA FERREIRA", cargo: "COORDENADOR DE RECURSOS HUMANOS", cargoLei: "Coordenador", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114204", nome: "MORGANA MARIA DE ALMEIDA", cargo: "GERENTE DE VIGIL\u00c2NCIA SANIT\u00c1RIA", cargoLei: "Gerente", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114128", nome: "NARA POLLYANNA DAMACENO NUNES", cargo: "SECRET\u00c1RIO EXECUTIVO DE SA\u00daDE", cargoLei: "Secret\u00e1rio Executivo", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114121", nome: "NIVALDO QUEIROZ DE PAULA FILHO", cargo: "GERENTE DE INFRAESTRUTURA URBANA", cargoLei: "Gerente", secretaria: "SECRETARIA DE INFRAESTRUTURA E SERVI\u00c7OS P\u00daBLICOS - SEINFRA" },
  { matricula: "114318", nome: "OTONIEL MARINHO CHAVES", cargo: "SECRET\u00c1RIO EXEC DE AQUISI\u00c7\u00c3O, RECURSOS E LOG\u00cdSTICA", cargoLei: "Secret\u00e1rio Executivo", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114205", nome: "PALOMA SANTOS DE PAIVA", cargo: "COORDENADOR DE POL\u00cdT. ESTRAT. E PROMO\u00c7\u00c3O DE SAUDE", cargoLei: "Coordenador", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "114114", nome: "PAULO CEZAR ARAUJO MELO", cargo: "DIRETOR DO ALMOXARIFADO CENTRAL", cargoLei: "Diretor", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "114212", nome: "PRISCYLLA KELLY DE OLIVEIRA ALVES", cargo: "GERENTE DE NUTRI\u00c7\u00c3O E BEM-ESTAR ESCOLAR", cargoLei: "Gerente", secretaria: "SECR MUN DE EDUCA\u00c7\u00c3O-SEDUC" },
  { matricula: "114070", nome: "ROBERTO ANGELO RIBEIRO DA COSTA FILHO", cargo: "DIRETOR DE GESTAO PROC. REPRESENTA\u00c7\u00c3O", cargoLei: "Diretor", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
  { matricula: "114072", nome: "RODRIGO RODRIGUES DOS SANTOS", cargo: "OUVIDOR-GERAL DO MUNICIPIO", cargoLei: "Ouvidor Municipal", secretaria: "CONTROLAD GERAL DO MUNICIPIO" },
  { matricula: "1114557", nome: "ROGERIA CAMILA ARAUJO DE LIRA", cargo: "ASSESSOR TECNICO JURIDICO", cargoLei: "Assessor T\u00e9cnico", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
  { matricula: "114075", nome: "RUBEM LINS DE SOUZA", cargo: "GERENTE DE CONTAS A PAGAR", cargoLei: "Gerente", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "1114658", nome: "RUTIENNE FERNANDA NUNES DA SILVA", cargo: "DIRETOR DE LICITA\u00c7\u00d5ES E CONTRATOS", cargoLei: "Diretor", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114067", nome: "SAMUEL ESDRAS DA SILVA OLIVEIRA", cargo: "ASSESSOR TECNICO JURIDICO", cargoLei: "Assessor T\u00e9cnico", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
  { matricula: "114055", nome: "SERGIO RODRIGUES DE MELO", cargo: "SECRET\u00c1RIO MUN DE MEIO AMB,  SUST. E REC HIDR", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS H\u00cdDRICOS-SEMAM" },
  { matricula: "114059", nome: "SHILDRELAYNNE FRANCA LIRA DE LIMA FARIAS", cargo: "TESOUREIRO GERAL", cargoLei: "Tesoureiro Geral", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "114138", nome: "SIMONEM DA CONCEICAO ALVES DE MELO", cargo: "COORDENADOR DE VIGIL\u00c2NCIA EM SA\u00daDE", cargoLei: "Coordenador", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114669", nome: "SINVAL DIAS DE SOUSA NETO", cargo: "DIRETOR DE CONCESS\u00d5ES, LICENCIAMENTO E REGULARIZ.", cargoLei: "Diretor", secretaria: "SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT" },
  { matricula: "114052", nome: "SIRIA MARIA DANTAS OLIVEIRA", cargo: "SECRETARIO MUNICIPAL DE SAUDE", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECR MUN DE SAUDE-SMS" },
  { matricula: "1114879", nome: "SONIA OLIVEIRA DE ARAUJO", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS H\u00cdDRICOS-SEMAM" },
  { matricula: "114051", nome: "SUELYO ROGERIO CAVALCANTE LIRA", cargo: "VICE-PREFEITO", cargoLei: "Vice-Prefeito", secretaria: "GABINETE DO VICE PREFEITO" },
  { matricula: "1114323", nome: "SUZYANE MARIA CARVALHO DA SILVA", cargo: "DIRETOR DE COMUNICACAO INSTITUVIONAL", cargoLei: "Diretor", secretaria: "GABINETE DO PREFEITO" },
  { matricula: "114333", nome: "TAIS ARAUJO DE LIMA", cargo: "GERENTE DA CASA DO EMPREENDEDOR", cargoLei: "Gerente", secretaria: "SECR MUN DE DESENV ECONOMICO, INOV E TUR-SEDEC" },
  { matricula: "114330", nome: "THAMYRES ALANA DA FONSECA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "SUPERINT EXECUTIVA DA MOB URBANA-SEMOB" },
  { matricula: "1114883", nome: "THIAGO JOSE ALVES DE LIMA", cargo: "SECRET\u00c1RIO EXECUTIVO DO OR\u00c7. DEMOC. MUNICIPAL", cargoLei: "Secret\u00e1rio Executivo", secretaria: "SECRETARIA DE PLANEJ. E GEST\u00c3O ESTRAT. SEPLAN" },
  { matricula: "114312", nome: "VANESSA FERREIRA DA MOTA ALVES", cargo: "COORDENADOR DE BENEF\u00cdCIOS EVENTUAIS", cargoLei: "Coordenador", secretaria: "SECR MUN DE ASSISTENCIA SOCIAL-SEMAS" },
  { matricula: "1114501", nome: "WELLINGSON DA FONSECA CHAVES", cargo: "SECRET\u00c1RIO DE TRANSPORTES, ESTRADAS E RODAGENS", cargoLei: "Secret\u00e1rio Municipal", secretaria: "SECRETARIA DE TRANSP EST E ROD.-SETRANS" },
  { matricula: "1114704", nome: "WILLIAM FRANCISCI BERI DA SILVA", cargo: "ASSESSOR ESPECIAL IV", cargoLei: "Assessor Especial", secretaria: "GABINETE DO VICE PREFEITO" },
  { matricula: "1114500", nome: "YURI DAVID RODRIGUES LOPES", cargo: "ASSESSOR TECNICO JURIDICO", cargoLei: "Assessor T\u00e9cnico", secretaria: "PROCURADORIA GERAL DO MUNICIPIO" },
];

// ─── Função principal de seed ─────────────────────────────────────────────────
export async function seedOrgMembers(): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se já foi feito o seed
  const existing = await db.select().from(orgMembers).limit(1);
  if (existing.length > 0) {
    console.log("[Seed OrgMembers] Membros já foram inseridos anteriormente. Pulando.");
    const all = await db.select().from(orgMembers);
    return { inserted: all.length, skipped: 0, errors: [] };
  }

  // Carregar todas as unidades organizacionais
  const allUnits = await db.select({ id: orgUnits.id, acronym: orgUnits.acronym, name: orgUnits.name }).from(orgUnits);
  const unitByAcronym: Record<string, number> = {};
  for (const u of allUnits) {
    if (u.acronym) unitByAcronym[u.acronym] = u.id;
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of SERVIDORES) {
    const acronym = SECRETARIA_TO_ACRONYM[s.secretaria];
    if (!acronym) {
      errors.push(`Secretaria não mapeada: "${s.secretaria}" (${s.nome})`);
      skipped++;
      continue;
    }
    const orgUnitId = unitByAcronym[acronym];
    if (!orgUnitId) {
      errors.push(`Unidade não encontrada para acrônimo "${acronym}" (${s.nome})`);
      skipped++;
      continue;
    }
    try {
      await db.insert(orgMembers).values({
        orgUnitId,
        name: s.nome,
        matricula: s.matricula || null,
        cargo: s.cargo,
        cargoLei: s.cargoLei,
        photoUrl: null,
        isPublic: true,
        isActive: true,
        sortOrder: 0,
      });
      inserted++;
    } catch (err: any) {
      errors.push(`Erro ao inserir ${s.nome}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`[Seed OrgMembers] Concluído: ${inserted} inseridos, ${skipped} ignorados.`);
  if (errors.length > 0) {
    console.warn("[Seed OrgMembers] Erros:", errors);
  }
  return { inserted, skipped, errors };
}