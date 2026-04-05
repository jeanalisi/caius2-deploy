/**
 * Sectors.tsx — Redirecionamento para Estrutura Organizacional
 *
 * Os setores agora são gerenciados diretamente pela Estrutura Organizacional
 * (orgUnits), eliminando a necessidade de criar setores manualmente.
 * Esta página redireciona automaticamente para /org-structure.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Sectors() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/org-structure", { replace: true });
  }, [navigate]);

  return null;
}
