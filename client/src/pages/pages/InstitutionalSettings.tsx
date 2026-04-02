import { useState, useEffect } from "react";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  Globe,
  Image,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Phone,
  Save,
  Sun,
} from "lucide-react";

const CONFIG_FIELDS = [
  // Organização
  { key: "org_name", label: "Nome da Organização", type: "text", placeholder: "Ex: Prefeitura Municipal de..." },
  { key: "org_short_name", label: "Nome Abreviado", type: "text", placeholder: "Ex: PMSF" },
  { key: "org_logo_url", label: "URL da Logomarca", type: "url", placeholder: "https://..." },
  { key: "org_favicon_url", label: "URL do Favicon", type: "url", placeholder: "https://..." },
  { key: "org_primary_color", label: "Cor Primária", type: "color", placeholder: "#6366f1" },
  { key: "org_secondary_color", label: "Cor Secundária", type: "color", placeholder: "#8b5cf6" },
  { key: "org_address", label: "Endereço", type: "text", placeholder: "Rua..." },
  { key: "org_phone", label: "Telefone", type: "text", placeholder: "(00) 0000-0000" },
  { key: "org_email", label: "E-mail Institucional", type: "email", placeholder: "contato@..." },
  { key: "org_website", label: "Website", type: "url", placeholder: "https://..." },
  { key: "org_cnpj", label: "CNPJ", type: "text", placeholder: "00.000.000/0000-00" },
  // Plataforma
  { key: "platform_name", label: "Nome da Plataforma", type: "text", placeholder: "Ex: Portal de Atendimento" },
  { key: "platform_welcome_message", label: "Mensagem de Boas-Vindas", type: "text", placeholder: "Bem-vindo ao atendimento..." },
  { key: "platform_footer_text", label: "Texto do Rodapé", type: "text", placeholder: "© 2025 ..." },
  { key: "platform_help_email", label: "E-mail de Suporte", type: "email", placeholder: "suporte@..." },
  // Contato da Central do Cidadão
  { key: "contact_phone", label: "Telefone Principal", type: "text", placeholder: "(79) 3431-0000" },
  { key: "contact_whatsapp", label: "WhatsApp", type: "text", placeholder: "(79) 99999-0000" },
  { key: "contact_email", label: "E-mail de Atendimento", type: "email", placeholder: "atendimento@municipio.gov.br" },
  { key: "contact_address", label: "Endereço Físico", type: "text", placeholder: "Praça da Prefeitura, s/n — Centro" },
  { key: "contact_hours_phone", label: "Horário Telefone", type: "text", placeholder: "Seg–Sex, 8h–18h" },
  { key: "contact_hours_presential", label: "Horário Presencial", type: "text", placeholder: "Seg–Sex, 8h–17h" },
  { key: "contact_website", label: "Site Oficial", type: "url", placeholder: "https://www.municipio.gov.br" },
  { key: "contact_facebook", label: "Facebook", type: "url", placeholder: "https://facebook.com/prefeitura" },
  { key: "contact_instagram", label: "Instagram", type: "url", placeholder: "https://instagram.com/prefeitura" },
  { key: "contact_footer_name", label: "Nome no Rodapé", type: "text", placeholder: "Prefeitura Municipal de Itabaiana" },
  { key: "contact_copyright_year", label: "Ano do Copyright", type: "text", placeholder: "2025" },
];

export default function InstitutionalSettings() {
  const { theme, setTheme } = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const { data: configs = [] } = trpc.institutionalConfig.get.useQuery();
  const saveMutation = trpc.institutionalConfig.save.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); setDirty(false); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (configs.length > 0) {
      const map: Record<string, string> = {};
      configs.forEach((c: any) => { map[c.key] = c.value ?? ""; });
      setValues(map);
    }
  }, [configs]);

  function handleChange(key: string, value: string) {
    setValues(v => ({ ...v, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const payload = Object.entries(values).map(([key, value]) => {
      const field = CONFIG_FIELDS.find(f => f.key === key);
      return {
        key,
        value,
        label: field?.label,
        type: field?.type === "color" ? "color" : field?.type === "url" ? "url" : "text",
      };
    });
    saveMutation.mutate(payload);
  }

  return (
    <OmniLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Configurações Institucionais</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personalize a identidade visual, dados da organização, contatos e aparência da plataforma.
            </p>
          </div>
          {dirty && (
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          )}
        </div>

        <Tabs defaultValue="organization">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="organization" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Organização
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contato
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Aparência
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5">
              <Image className="w-3.5 h-3.5" /> Plataforma
            </TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados da Organização</CardTitle>
                <CardDescription>Informações institucionais exibidas na plataforma e documentos.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONFIG_FIELDS.filter(f =>
                  f.key.startsWith("org_") &&
                  !["org_primary_color", "org_secondary_color", "org_logo_url", "org_favicon_url"].includes(f.key)
                ).map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type === "email" ? "email" : "text"}
                      value={values[field.key] ?? ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="mt-6 space-y-6">
            {/* Canais de Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Canais de Atendimento
                </CardTitle>
                <CardDescription>
                  Dados exibidos na Central do Cidadão, rodapé e barra institucional do portal público.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "contact_phone", label: "Telefone Principal", icon: Phone, placeholder: "(79) 3431-0000" },
                  { key: "contact_whatsapp", label: "WhatsApp", icon: MessageCircle, placeholder: "(79) 99999-0000" },
                  { key: "contact_email", label: "E-mail de Atendimento", icon: Mail, placeholder: "atendimento@municipio.gov.br" },
                  { key: "contact_website", label: "Site Oficial", icon: Globe, placeholder: "https://www.municipio.gov.br" },
                ].map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {label}
                    </Label>
                    <Input
                      value={values[key] ?? ""}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Endereço e Horários */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Endereço e Horários
                </CardTitle>
                <CardDescription>Endereço físico e horários de funcionamento exibidos no portal.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    Endereço Físico
                  </Label>
                  <Input
                    value={values["contact_address"] ?? ""}
                    onChange={e => handleChange("contact_address", e.target.value)}
                    placeholder="Praça da Prefeitura, s/n — Centro, Itabaiana/SE"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Horário de Atendimento Telefônico
                  </Label>
                  <Input
                    value={values["contact_hours_phone"] ?? ""}
                    onChange={e => handleChange("contact_hours_phone", e.target.value)}
                    placeholder="Seg–Sex, 8h–18h"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Horário de Atendimento Presencial
                  </Label>
                  <Input
                    value={values["contact_hours_presential"] ?? ""}
                    onChange={e => handleChange("contact_hours_presential", e.target.value)}
                    placeholder="Seg–Sex, 8h–17h"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Redes Sociais e Rodapé */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Redes Sociais e Rodapé
                </CardTitle>
                <CardDescription>Links de redes sociais e texto do rodapé da Central do Cidadão.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Facebook</Label>
                  <Input
                    value={values["contact_facebook"] ?? ""}
                    onChange={e => handleChange("contact_facebook", e.target.value)}
                    placeholder="https://facebook.com/prefeitura"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input
                    value={values["contact_instagram"] ?? ""}
                    onChange={e => handleChange("contact_instagram", e.target.value)}
                    placeholder="https://instagram.com/prefeitura"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome no Rodapé</Label>
                  <Input
                    value={values["contact_footer_name"] ?? ""}
                    onChange={e => handleChange("contact_footer_name", e.target.value)}
                    placeholder="Prefeitura Municipal de Itabaiana"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ano do Copyright</Label>
                  <Input
                    value={values["contact_copyright_year"] ?? ""}
                    onChange={e => handleChange("contact_copyright_year", e.target.value)}
                    placeholder="2025"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="border-dashed border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-base text-blue-800">Pré-visualização — Barra Institucional</CardTitle>
                <CardDescription>Como os dados aparecerão na barra superior da Central do Cidadão.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-800 text-white text-xs py-2 px-4 rounded-lg flex items-center justify-between gap-4">
                  <span className="opacity-80 truncate">
                    {values["contact_footer_name"] || "Prefeitura Municipal"} — Serviços Públicos Digitais
                  </span>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="flex items-center gap-1 opacity-70">
                      <Phone className="w-3 h-3" />
                      {values["contact_phone"] || "0800-000-0000"}
                    </span>
                    <span className="flex items-center gap-1 opacity-70">
                      <Mail className="w-3 h-3" />
                      {values["contact_email"] || "atendimento@municipio.gov.br"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-6 space-y-6">
            {/* Theme Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modo de Exibição</CardTitle>
                <CardDescription>Escolha entre tema claro, escuro ou automático (segue o sistema operacional).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Claro", icon: Sun },
                    { value: "dark", label: "Escuro", icon: Moon },
                    { value: "system", label: "Sistema", icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cores Institucionais</CardTitle>
                <CardDescription>Cores usadas em documentos, cabeçalhos e elementos de marca.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {CONFIG_FIELDS.filter(f => ["org_primary_color", "org_secondary_color"].includes(f.key)).map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={values[field.key] ?? "#6366f1"}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                      />
                      <Input
                        value={values[field.key] ?? ""}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="font-mono"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logomarca e Favicon</CardTitle>
                <CardDescription>URLs das imagens exibidas no cabeçalho e aba do navegador.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {CONFIG_FIELDS.filter(f => ["org_logo_url", "org_favicon_url"].includes(f.key)).map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <div className="flex gap-3 items-center">
                      {values[field.key] && (
                        <img
                          src={values[field.key]}
                          alt="preview"
                          className="w-10 h-10 object-contain rounded border border-border bg-muted"
                          onError={e => (e.currentTarget.style.display = "none")}
                        />
                      )}
                      <Input
                        type="url"
                        value={values[field.key] ?? ""}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Tab */}
          <TabsContent value="platform" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações da Plataforma</CardTitle>
                <CardDescription>Textos, mensagens e informações exibidas na interface.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {CONFIG_FIELDS.filter(f => f.key.startsWith("platform_")).map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type === "email" ? "email" : "text"}
                      value={values[field.key] ?? ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {dirty && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Todas as Alterações"}
            </Button>
          </div>
        )}
      </div>
    </OmniLayout>
  );
}
