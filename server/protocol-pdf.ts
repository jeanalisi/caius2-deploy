/**
 * Gerador de PDF do Protocolo NUP
 * Usa pdf-lib para criar um PDF institucional com todas as informações do protocolo.
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const PAGE_W = 595.28;  // A4 width in points
const PAGE_H = 841.89;  // A4 height in points
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const BLUE = rgb(0.118, 0.227, 0.373);       // #1e3a5f
const LIGHT_BLUE = rgb(0.937, 0.965, 1.0);   // #eef6ff
const GRAY = rgb(0.45, 0.45, 0.45);
const DARK = rgb(0.1, 0.1, 0.1);
const WHITE = rgb(1, 1, 1);
const BORDER_GRAY = rgb(0.87, 0.87, 0.87);
const GREEN = rgb(0.13, 0.55, 0.13);

const TYPE_LABELS: Record<string, string> = {
  request: "Solicitação",
  complaint: "Reclamação",
  information: "Informação",
  suggestion: "Sugestão",
  praise: "Elogio",
  ombudsman: "Ouvidoria",
  esic: "e-SIC",
  administrative: "Administrativo",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_analysis: "Em Análise",
  pending_docs: "Aguardando Documentos",
  in_progress: "Em Andamento",
  concluded: "Concluído",
  archived: "Arquivado",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  web: "Web",
  phone: "Telefone",
  in_person: "Presencial",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export interface ProtocolPdfData {
  nup: string;
  subject: string;
  description?: string | null;
  type: string;
  channel: string;
  status: string;
  priority: string;
  createdAt: Date;
  deadline?: Date | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  requesterCpfCnpj?: string | null;
  responsibleSectorName?: string | null;
  responsibleUserName?: string | null;
  createdByName?: string | null;
  trackingLink?: string;
}

function wrapText(text: string, font: any, size: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export async function generateProtocolPdf(data: ProtocolPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed < 60) newPage();
  };

  // ── Cabeçalho azul ──
  page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: BLUE });
  page.drawText("COMPROVANTE DE PROTOCOLO", {
    x: MARGIN, y: PAGE_H - 35, size: 16, font: fontBold, color: WHITE,
  });
  page.drawText("Prefeitura Municipal de Itabaiana — PB", {
    x: MARGIN, y: PAGE_H - 55, size: 9, font: fontReg, color: rgb(0.8, 0.88, 1.0),
  });
  page.drawText("CAIUS — Central de Atendimento Integrado ao Usuário", {
    x: MARGIN, y: PAGE_H - 70, size: 8, font: fontReg, color: rgb(0.7, 0.8, 0.95),
  });

  y = PAGE_H - 110;

  // ── Caixa NUP ──
  page.drawRectangle({ x: MARGIN, y: y - 50, width: CONTENT_W, height: 55, color: LIGHT_BLUE, borderColor: BLUE, borderWidth: 1 });
  page.drawText("NÚMERO ÚNICO DE PROTOCOLO (NUP)", {
    x: MARGIN + 12, y: y - 15, size: 8, font: fontBold, color: BLUE,
  });
  page.drawText(data.nup, {
    x: MARGIN + 12, y: y - 38, size: 20, font: fontBold, color: BLUE,
  });
  // Data de abertura (direita)
  const dateStr = formatDate(data.createdAt);
  const dateW = fontReg.widthOfTextAtSize(dateStr, 8);
  page.drawText("Aberto em:", {
    x: PAGE_W - MARGIN - dateW - 4, y: y - 15, size: 8, font: fontBold, color: BLUE,
  });
  page.drawText(dateStr, {
    x: PAGE_W - MARGIN - dateW, y: y - 28, size: 8, font: fontReg, color: DARK,
  });

  y -= 70;

  // ── Assunto ──
  ensureSpace(60);
  page.drawText("ASSUNTO", {
    x: MARGIN, y, size: 8, font: fontBold, color: GRAY,
  });
  y -= 14;
  const subjectLines = wrapText(data.subject, fontBold, 12, CONTENT_W);
  for (const line of subjectLines) {
    page.drawText(line, { x: MARGIN, y, size: 12, font: fontBold, color: DARK });
    y -= 16;
  }
  y -= 8;

  // ── Linha separadora ──
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER_GRAY });
  y -= 16;

  // ── Grid de informações (2 colunas) ──
  const COL1_X = MARGIN;
  const COL2_X = MARGIN + CONTENT_W / 2 + 10;
  const COL_W = CONTENT_W / 2 - 10;

  const drawField = (label: string, value: string, x: number, currY: number) => {
    page.drawText(label, { x, y: currY, size: 7.5, font: fontBold, color: GRAY });
    const lines = wrapText(value || "—", fontReg, 9.5, COL_W);
    let ly = currY - 13;
    for (const l of lines) {
      page.drawText(l, { x, y: ly, size: 9.5, font: fontReg, color: DARK });
      ly -= 13;
    }
    return currY - 13 - (lines.length - 1) * 13 - 8;
  };

  const fields: [string, string][] = [
    ["TIPO", TYPE_LABELS[data.type] ?? data.type],
    ["CANAL DE ENTRADA", CHANNEL_LABELS[data.channel] ?? data.channel],
    ["STATUS", STATUS_LABELS[data.status] ?? data.status],
    ["PRIORIDADE", PRIORITY_LABELS[data.priority] ?? data.priority],
    ["PRAZO", data.deadline ? formatDate(data.deadline) : "Não definido"],
    ["SETOR RESPONSÁVEL", data.responsibleSectorName ?? "Não atribuído"],
  ];

  let col1Y = y;
  let col2Y = y;
  for (let i = 0; i < fields.length; i++) {
    ensureSpace(40);
    if (i % 2 === 0) {
      col1Y = drawField(fields[i][0], fields[i][1], COL1_X, col1Y);
    } else {
      col2Y = drawField(fields[i][0], fields[i][1], COL2_X, col2Y);
    }
  }
  y = Math.min(col1Y, col2Y) - 8;

  // ── Linha separadora ──
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER_GRAY });
  y -= 16;

  // ── Dados do solicitante ──
  ensureSpace(30);
  page.drawText("DADOS DO SOLICITANTE", {
    x: MARGIN, y, size: 9, font: fontBold, color: BLUE,
  });
  y -= 18;

  const citizenFields: [string, string][] = [
    ["NOME", data.requesterName ?? "Não informado"],
    ["E-MAIL", data.requesterEmail ?? "Não informado"],
    ["TELEFONE", data.requesterPhone ?? "Não informado"],
    ["CPF/CNPJ", data.requesterCpfCnpj ?? "Não informado"],
  ];

  let cCol1Y = y;
  let cCol2Y = y;
  for (let i = 0; i < citizenFields.length; i++) {
    ensureSpace(40);
    if (i % 2 === 0) {
      cCol1Y = drawField(citizenFields[i][0], citizenFields[i][1], COL1_X, cCol1Y);
    } else {
      cCol2Y = drawField(citizenFields[i][0], citizenFields[i][1], COL2_X, cCol2Y);
    }
  }
  y = Math.min(cCol1Y, cCol2Y) - 8;

  // ── Descrição ──
  if (data.description) {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER_GRAY });
    y -= 16;
    ensureSpace(30);
    page.drawText("DESCRIÇÃO / DETALHAMENTO", {
      x: MARGIN, y, size: 9, font: fontBold, color: BLUE,
    });
    y -= 16;
    const descLines = wrapText(data.description, fontReg, 9.5, CONTENT_W);
    for (const line of descLines) {
      ensureSpace(14);
      page.drawText(line, { x: MARGIN, y, size: 9.5, font: fontReg, color: DARK });
      y -= 14;
    }
    y -= 8;
  }

  // ── Link de acompanhamento ──
  if (data.trackingLink) {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER_GRAY });
    y -= 16;
    ensureSpace(50);
    page.drawRectangle({ x: MARGIN, y: y - 40, width: CONTENT_W, height: 45, color: rgb(0.95, 1.0, 0.95), borderColor: GREEN, borderWidth: 1 });
    page.drawText("ACOMPANHE SEU PROTOCOLO ONLINE", {
      x: MARGIN + 12, y: y - 14, size: 8.5, font: fontBold, color: GREEN,
    });
    page.drawText(data.trackingLink, {
      x: MARGIN + 12, y: y - 30, size: 8, font: fontReg, color: rgb(0.0, 0.4, 0.0),
    });
    y -= 60;
  }

  // ── Rodapé ──
  const totalPages = doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = doc.getPage(i);
    p.drawLine({ start: { x: MARGIN, y: 45 }, end: { x: PAGE_W - MARGIN, y: 45 }, thickness: 0.5, color: BORDER_GRAY });
    p.drawText("Este documento é um comprovante oficial gerado automaticamente pelo CAIUS — Prefeitura de Itabaiana/PB.", {
      x: MARGIN, y: 30, size: 7, font: fontReg, color: GRAY,
    });
    const pageLabel = `Página ${i + 1} de ${totalPages}`;
    const pw = fontReg.widthOfTextAtSize(pageLabel, 7);
    p.drawText(pageLabel, { x: PAGE_W - MARGIN - pw, y: 30, size: 7, font: fontReg, color: GRAY });
  }

  return doc.save();
}
