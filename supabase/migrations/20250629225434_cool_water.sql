/*
  # Criação do esquema inicial do banco de dados

  1. Novas Tabelas
    - `profiles` - Perfis de usuários (profissionais e empresas)
    - `professionals` - Dados específicos de profissionais
    - `companies` - Dados específicos de empresas
    - `certificates` - Certificados dos profissionais
    - `contracts` - Contratos entre profissionais e empresas
    - `messages` - Sistema de mensagens
    - `demands` - Demandas publicadas pelas empresas
    - `reviews` - Avaliações de profissionais e empresas

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Adicionar políticas para controle de acesso
*/

-- Tabela de perfis (comum para profissionais e empresas)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('professional', 'company', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  profile_complete boolean DEFAULT false,
  photo_url text
);

-- Tabela de profissionais
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text UNIQUE,
  telefone text,
  cep text,
  cidade text,
  estado text,
  endereco text,
  formacao text,
  especializacao text,
  experiencia integer,
  registro text,
  raio_atendimento integer,
  valor_hora numeric(10,2),
  disponibilidade text[],
  descricao text,
  verificado boolean DEFAULT false,
  especializacoes text[],
  avaliacao_media numeric(3,2) DEFAULT 0,
  total_avaliacoes integer DEFAULT 0,
  total_contratos integer DEFAULT 0
);

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  nome_empresa text NOT NULL,
  cnpj text UNIQUE,
  telefone text,
  cep text,
  cidade text,
  estado text,
  endereco text,
  segmento text,
  numero_funcionarios text,
  nome_responsavel text,
  cargo_responsavel text,
  email_responsavel text,
  telefone_responsavel text,
  descricao_empresa text,
  necessidades text[],
  verificado boolean DEFAULT false,
  avaliacao_media numeric(3,2) DEFAULT 0,
  total_avaliacoes integer DEFAULT 0,
  total_contratos integer DEFAULT 0
);

-- Tabela de certificados
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL,
  data_upload timestamptz DEFAULT now(),
  data_validade timestamptz,
  status text DEFAULT 'pendente' CHECK (status IN ('aprovado', 'pendente', 'rejeitado')),
  arquivo_url text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de contratos
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  servico text NOT NULL,
  valor numeric(10,2) NOT NULL,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz NOT NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'concluido', 'cancelado')),
  progresso integer DEFAULT 0,
  descricao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- Tabela de demandas
CREATE TABLE IF NOT EXISTS demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL,
  tipo_servico text NOT NULL,
  prazo timestamptz,
  orcamento numeric(10,2),
  tipo_orcamento text CHECK (tipo_orcamento IN ('fixo', 'por-hora', 'negociavel')),
  localizacao text,
  estado text,
  modalidade text CHECK (modalidade IN ('presencial', 'remoto', 'hibrido')),
  urgencia text CHECK (urgencia IN ('baixa', 'media', 'alta')),
  requisitos text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  avaliacao integer NOT NULL CHECK (avaliacao BETWEEN 1 AND 5),
  comentario text,
  servico text,
  created_at timestamptz DEFAULT now()
);

-- Tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2) NOT NULL,
  features jsonb,
  user_type text NOT NULL CHECK (user_type IN ('professional', 'company')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de assinaturas de usuários
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de teste para verificação de conexão
CREATE TABLE IF NOT EXISTS _test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE _test ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para profiles
CREATE POLICY "Usuários podem ver seus próprios perfis"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Políticas de segurança para professionals
CREATE POLICY "Profissionais podem ver seus próprios dados"
  ON professionals
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Profissionais podem atualizar seus próprios dados"
  ON professionals
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Empresas podem ver dados de profissionais"
  ON professionals
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.type = 'company'
  ));

-- Políticas de segurança para companies
CREATE POLICY "Empresas podem ver seus próprios dados"
  ON companies
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Empresas podem atualizar seus próprios dados"
  ON companies
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Profissionais podem ver dados de empresas"
  ON companies
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.type = 'professional'
  ));

-- Políticas de segurança para certificates
CREATE POLICY "Profissionais podem ver seus próprios certificados"
  ON certificates
  FOR SELECT
  USING (professional_id = auth.uid());

CREATE POLICY "Profissionais podem gerenciar seus próprios certificados"
  ON certificates
  FOR ALL
  USING (professional_id = auth.uid());

CREATE POLICY "Empresas podem ver certificados de profissionais"
  ON certificates
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.type = 'company'
  ));

-- Políticas de segurança para contracts
CREATE POLICY "Usuários podem ver seus próprios contratos"
  ON contracts
  FOR SELECT
  USING (
    professional_id = auth.uid() OR
    company_id = auth.uid()
  );

CREATE POLICY "Usuários podem gerenciar seus próprios contratos"
  ON contracts
  FOR ALL
  USING (
    professional_id = auth.uid() OR
    company_id = auth.uid()
  );

-- Políticas de segurança para messages
CREATE POLICY "Usuários podem ver suas próprias mensagens"
  ON messages
  FOR SELECT
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid()
  );

CREATE POLICY "Usuários podem enviar mensagens"
  ON messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Usuários podem atualizar status de leitura"
  ON messages
  FOR UPDATE
  USING (receiver_id = auth.uid());

-- Políticas de segurança para demands
CREATE POLICY "Todos podem ver demandas ativas"
  ON demands
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Empresas podem gerenciar suas próprias demandas"
  ON demands
  FOR ALL
  USING (company_id = auth.uid());

-- Políticas de segurança para reviews
CREATE POLICY "Todos podem ver avaliações"
  ON reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem criar avaliações"
  ON reviews
  FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

-- Políticas de segurança para subscription_plans
CREATE POLICY "Todos podem ver planos de assinatura"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Políticas de segurança para user_subscriptions
CREATE POLICY "Usuários podem ver suas próprias assinaturas"
  ON user_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Políticas de segurança para _test
CREATE POLICY "Todos podem ver dados de teste"
  ON _test
  FOR SELECT
  USING (true);

-- Inserir dados iniciais para planos de assinatura
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, user_type)
VALUES
  ('Gratuito', 'Plano básico para profissionais', 0, 0, '{"features": ["Cadastro de perfil básico", "Até 3 certificados", "Receber até 5 contatos/mês", "Suporte por e-mail", "Acesso a biblioteca básica"]}', 'professional'),
  ('Profissional', 'Plano completo para profissionais', 49, 490, '{"features": ["Perfil completo com destaque", "Certificados ilimitados", "Contatos ilimitados", "Selo de verificado", "Relatórios detalhados", "Biblioteca completa SST", "Suporte prioritário", "Ferramentas de gestão"]}', 'professional'),
  ('Premium', 'Plano premium para profissionais', 99, 990, '{"features": ["Todos os recursos do Profissional", "Posição prioritária nas buscas", "Análise de performance", "Calendário integrado", "API para integrações", "Treinamentos exclusivos", "Consultoria personalizada"]}', 'professional'),
  ('Starter', 'Plano básico para empresas', 0, 0, '{"features": ["Cadastro da empresa", "Busca por profissionais", "Até 3 contatos/mês", "Perfil básico da empresa", "Suporte por e-mail"]}', 'company'),
  ('Business', 'Plano completo para empresas', 149, 1490, '{"features": ["Contatos ilimitados", "Relatórios completos", "Gestão de múltiplos projetos", "Integração com sistemas", "Suporte prioritário", "Perfil premium da empresa", "Análise de fornecedores"]}', 'company'),
  ('Enterprise', 'Plano personalizado para empresas', 999, 9990, '{"features": ["Todos os recursos do Business", "API dedicada", "Gestor de conta dedicado", "Treinamentos personalizados", "Integrações customizadas", "SLA garantido", "Consultoria estratégica"]}', 'company');

-- Inserir um registro de teste
INSERT INTO _test (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;