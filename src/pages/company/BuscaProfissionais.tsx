// A busca de profissionais da area da empresa usa a mesma implementacao real
// da pagina /busca-profissionais (RPC search_professionals, perfil publico e
// envio de mensagem pelo perfil). Manter uma unica implementacao evita que as
// duas rotas divirjam.
export { default } from '../BuscaProfissionais';
