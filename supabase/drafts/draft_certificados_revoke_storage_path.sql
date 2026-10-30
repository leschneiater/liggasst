-- RASCUNHO (não aplicado): higiene de privilégio mínimo.
-- Hoje o dono pode editar storage_path do próprio certificado (grant da
-- migration 20260903190000). Com o compartilhamento, isso permitiria apontar
-- um certificado compartilhado para um caminho fora da própria pasta.
-- A Edge Function já recusa esses caminhos (defesa em profundidade); este
-- revoke remove a coluna do grant. Não há fluxo de substituição de arquivo
-- na v1, então nenhum recurso atual depende desse grant.
revoke update (storage_path) on public.certificates from authenticated;
