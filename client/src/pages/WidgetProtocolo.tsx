import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useOrgConfig } from "@/hooks/useOrgConfig";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ProtocolType = "request" | "complaint" | "information" | "suggestion" | "praise" | "ombudsman" | "esic" | "administrative";

const PROTOCOL_TYPES: { value: ProtocolType; label: string; icon: string; description: string }[] = [
  { value: "request",       label: "Solicitação",      icon: "📋", description: "Pedido de serviço ou providência" },
  { value: "complaint",     label: "Reclamação",        icon: "⚠️", description: "Insatisfação com serviço prestado" },
  { value: "information",   label: "Informação",        icon: "ℹ️", description: "Pedido de esclarecimento" },
  { value: "suggestion",    label: "Sugestão",          icon: "💡", description: "Proposta de melhoria" },
  { value: "praise",        label: "Elogio",            icon: "⭐", description: "Reconhecimento de bom atendimento" },
  { value: "ombudsman",     label: "Ouvidoria",         icon: "🏛️", description: "Denúncia ou irregularidade" },
  { value: "esic",          label: "e-SIC / LAI",       icon: "📂", description: "Acesso à informação pública" },
  { value: "administrative",label: "Administrativo",    icon: "📌", description: "Assunto administrativo geral" },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WidgetProtocolo() {
  const org = useOrgConfig();
  const CAIUS_ORIGIN = window.location.origin;

  // Etapas: 1 = tipo/serviço, 2 = dados pessoais, 3 = detalhes, 4 = sucesso
  const [step, setStep] = useState(1);

  // Formulário
  const [protocolType, setProtocolType] = useState<ProtocolType>("request");
  const [serviceTypeId, setServiceTypeId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterCpfCnpj, setRequesterCpfCnpj] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nupResult, setNupResult] = useState<string | null>(null);

  // Dados
  const { data: servicesData } = trpc.cidadao.listServices.useQuery(undefined, { staleTime: 60000 });
  const services = servicesData ?? [];

  const { data: subjectsData } = trpc.cidadao.getSubjects.useQuery(
    { serviceTypeId: serviceTypeId! },
    { enabled: !!serviceTypeId, staleTime: 60000 }
  );
  const subjects = subjectsData ?? [];

  const submitMutation = trpc.cidadao.submitRequest.useMutation({
    onSuccess: (data) => {
      setNupResult(data.nup);
      setStep(4);
    },
  });

  // Preenche assunto automaticamente ao selecionar serviço
  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceTypeId),
    [services, serviceTypeId]
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId]
  );

  // ── Validações por etapa ──────────────────────────────────────────────────
  function validateStep1() {
    return true; // tipo sempre selecionado
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!requesterName.trim() || requesterName.trim().length < 2)
      e.requesterName = "Informe seu nome completo";
    if (requesterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail))
      e.requesterEmail = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3() {
    const e: Record<string, string> = {};
    const finalSubject = subject.trim() || selectedSubject?.name || selectedService?.name || "";
    if (!finalSubject || finalSubject.length < 3)
      e.subject = "Informe o assunto da solicitação";
    if (!description.trim() || description.trim().length < 10)
      e.description = "Descreva sua solicitação com pelo menos 10 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  }

  function handleSubmit() {
    const finalSubject = subject.trim() || selectedSubject?.name || selectedService?.name || "Solicitação via portal";
    submitMutation.mutate({
      serviceTypeId: serviceTypeId ?? undefined,
      subjectId: subjectId ?? undefined,
      subject: finalSubject,
      description: description.trim(),
      type: protocolType,
      requesterName: requesterName.trim(),
      requesterEmail: requesterEmail.trim() || undefined,
      requesterPhone: requesterPhone.trim() || undefined,
      requesterCpfCnpj: requesterCpfCnpj.trim() || undefined,
      isConfidential,
    });
  }

  // ── Estilos base ─────────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-400";
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1";
  const errorCls = "text-xs text-red-500 mt-1";

  // ── Renderização ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {org?.logoUrl && (
          <img src={org.logoUrl} alt="Logo" className="h-7 w-7 rounded object-contain" />
        )}
        <div>
          <p className="text-xs font-bold text-indigo-700 leading-tight">{org?.name ?? "Central do Cidadão"}</p>
          <p className="text-[10px] text-gray-500 leading-tight">Abertura de Protocolo</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s < step ? "w-6 bg-indigo-500" : s === step ? "w-8 bg-indigo-600" : "w-4 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── Etapa 1: Tipo de protocolo e serviço ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-1">Tipo de solicitação</h2>
              <p className="text-xs text-gray-500 mb-3">Selecione o tipo que melhor descreve sua necessidade.</p>
              <div className="grid grid-cols-2 gap-2">
                {PROTOCOL_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setProtocolType(pt.value)}
                    className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      protocolType === pt.value
                        ? "border-indigo-500 bg-indigo-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{pt.icon}</span>
                    <div>
                      <p className={`text-xs font-semibold leading-tight ${protocolType === pt.value ? "text-indigo-700" : "text-gray-700"}`}>
                        {pt.label}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{pt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Serviço relacionado (opcional) */}
            {services.length > 0 && (
              <div>
                <label className={labelCls}>Serviço relacionado <span className="font-normal text-gray-400">(opcional)</span></label>
                <select
                  value={serviceTypeId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setServiceTypeId(val);
                    setSubjectId(null);
                  }}
                  className={inputCls}
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Assunto do serviço */}
            {subjects.length > 0 && (
              <div>
                <label className={labelCls}>Assunto <span className="font-normal text-gray-400">(opcional)</span></label>
                <select
                  value={subjectId ?? ""}
                  onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                >
                  <option value="">Selecione um assunto...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 2: Dados pessoais ── */}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-1">Seus dados</h2>
              <p className="text-xs text-gray-500 mb-3">Informe seus dados para que possamos entrar em contato sobre sua solicitação.</p>
            </div>

            <div>
              <label className={labelCls}>Nome completo <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Seu nome completo"
                className={`${inputCls} ${errors.requesterName ? "border-red-400" : ""}`}
              />
              {errors.requesterName && <p className={errorCls}>{errors.requesterName}</p>}
            </div>

            <div>
              <label className={labelCls}>CPF ou CNPJ <span className="font-normal text-gray-400">(opcional)</span></label>
              <input
                type="text"
                value={requesterCpfCnpj}
                onChange={(e) => setRequesterCpfCnpj(e.target.value)}
                placeholder="000.000.000-00"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>E-mail <span className="font-normal text-gray-400">(opcional)</span></label>
              <input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="seu@email.com"
                className={`${inputCls} ${errors.requesterEmail ? "border-red-400" : ""}`}
              />
              {errors.requesterEmail && <p className={errorCls}>{errors.requesterEmail}</p>}
            </div>

            <div>
              <label className={labelCls}>Telefone / WhatsApp <span className="font-normal text-gray-400">(opcional)</span></label>
              <input
                type="tel"
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* ── Etapa 3: Detalhes da solicitação ── */}
        {step === 3 && (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-1">Detalhes da solicitação</h2>
              <p className="text-xs text-gray-500 mb-3">Descreva sua solicitação com o máximo de detalhes possível.</p>
            </div>

            <div>
              <label className={labelCls}>
                Assunto{" "}
                {selectedSubject || selectedService ? (
                  <span className="font-normal text-gray-400">(pré-preenchido pelo serviço)</span>
                ) : (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={selectedSubject?.name ?? selectedService?.name ?? "Assunto da solicitação"}
                className={`${inputCls} ${errors.subject ? "border-red-400" : ""}`}
              />
              {errors.subject && <p className={errorCls}>{errors.subject}</p>}
            </div>

            <div>
              <label className={labelCls}>Descrição <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva detalhadamente sua solicitação, incluindo local, data e outras informações relevantes..."
                rows={5}
                className={`${inputCls} resize-none ${errors.description ? "border-red-400" : ""}`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description ? (
                  <p className={errorCls}>{errors.description}</p>
                ) : (
                  <span />
                )}
                <span className={`text-[10px] ${description.length < 10 ? "text-red-400" : "text-gray-400"}`}>
                  {description.length} caracteres
                </span>
              </div>
            </div>

            {/* Sigilo */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <p className="text-xs font-semibold text-gray-700">Solicitação sigilosa</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Apenas servidores autorizados terão acesso ao conteúdo desta solicitação.
                </p>
              </div>
            </label>

            {/* Resumo */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1.5">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Resumo</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <p className="text-[10px] text-gray-500">Tipo</p>
                  <p className="text-xs font-medium text-gray-800">
                    {PROTOCOL_TYPES.find((t) => t.value === protocolType)?.label}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">Solicitante</p>
                  <p className="text-xs font-medium text-gray-800 truncate">{requesterName || "—"}</p>
                </div>
                {selectedService && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-500">Serviço</p>
                    <p className="text-xs font-medium text-gray-800">{selectedService.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Erro de envio */}
            {submitMutation.error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs text-red-600 font-medium">Erro ao enviar solicitação</p>
                <p className="text-[10px] text-red-500 mt-0.5">{submitMutation.error.message}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Etapa 4: Sucesso ── */}
        {step === 4 && nupResult && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Protocolo aberto!</h2>
              <p className="text-xs text-gray-500 mt-1">Sua solicitação foi registrada com sucesso.</p>
            </div>
            <div className="w-full p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide mb-1">Número do Protocolo (NUP)</p>
              <p className="text-xl font-bold text-indigo-700 tracking-wider">{nupResult}</p>
              <p className="text-[10px] text-gray-500 mt-2">
                Guarde este número para acompanhar o andamento da sua solicitação.
              </p>
            </div>
            <div className="w-full space-y-2">
              <a
                href={`${CAIUS_ORIGIN}/widget/consulta?nup=${encodeURIComponent(nupResult)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Acompanhar protocolo
              </a>
              <button
                onClick={() => {
                  setStep(1);
                  setProtocolType("request");
                  setServiceTypeId(null);
                  setSubjectId(null);
                  setRequesterName("");
                  setRequesterEmail("");
                  setRequesterPhone("");
                  setRequesterCpfCnpj("");
                  setSubject("");
                  setDescription("");
                  setIsConfidential(false);
                  setNupResult(null);
                  submitMutation.reset();
                }}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Abrir nova solicitação
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer com botões de navegação */}
      {step < 4 && (
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => { setErrors({}); setStep(step - 1); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={submitMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitMutation.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando...
              </>
            ) : step === 3 ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Enviar solicitação
              </>
            ) : (
              <>
                Continuar
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Rodapé */}
      <div className="px-4 py-2 border-t border-gray-100 bg-white text-center">
        <p className="text-[10px] text-gray-400">
          Powered by{" "}
          <a
            href={`${CAIUS_ORIGIN}/central-cidadao`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            CAIUS
          </a>
          {" · "}
          <a
            href={`${CAIUS_ORIGIN}/widget/consulta`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            Consultar protocolo
          </a>
        </p>
      </div>
    </div>
  );
}
