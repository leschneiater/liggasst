import mysql from 'mysql2/promise';

// Configuração do banco de dados
const dbConfig = {
  host: process.env.VITE_DB_HOST || 'liggasst.com.br',
  user: process.env.VITE_DB_USER || 'ligga0200980',
  password: process.env.VITE_DB_PASSWORD || 'eY4;aYN+Et6o82',
  database: process.env.VITE_DB_NAME || 'ligga0200980_sst',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function createTables() {
  let connection;
  
  try {
    console.log('Conectando ao banco de dados...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Criando tabelas...');
    
    // Tabela de usuários
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        type ENUM('professional', 'company', 'admin') NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login DATETIME,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        verified BOOLEAN DEFAULT FALSE,
        profile_complete BOOLEAN DEFAULT FALSE,
        photo_url VARCHAR(255)
      )
    `);
    
    // Tabela de profissionais
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS professionals (
        user_id VARCHAR(36) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(14) UNIQUE,
        telefone VARCHAR(20),
        cep VARCHAR(10),
        cidade VARCHAR(100),
        estado CHAR(2),
        endereco VARCHAR(255),
        formacao VARCHAR(100),
        especializacao VARCHAR(255),
        experiencia INT,
        registro VARCHAR(50),
        raio_atendimento INT,
        valor_hora DECIMAL(10,2),
        disponibilidade JSON,
        descricao TEXT,
        verificado BOOLEAN DEFAULT FALSE,
        especializacoes JSON,
        avaliacao_media DECIMAL(3,2) DEFAULT 0,
        total_avaliacoes INT DEFAULT 0,
        total_contratos INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabela de empresas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        user_id VARCHAR(36) PRIMARY KEY,
        nome_empresa VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18) UNIQUE,
        telefone VARCHAR(20),
        cep VARCHAR(10),
        cidade VARCHAR(100),
        estado CHAR(2),
        endereco VARCHAR(255),
        segmento VARCHAR(100),
        numero_funcionarios VARCHAR(50),
        nome_responsavel VARCHAR(255),
        cargo_responsavel VARCHAR(100),
        email_responsavel VARCHAR(255),
        telefone_responsavel VARCHAR(20),
        descricao_empresa TEXT,
        necessidades JSON,
        verificado BOOLEAN DEFAULT FALSE,
        avaliacao_media DECIMAL(3,2) DEFAULT 0,
        total_avaliacoes INT DEFAULT 0,
        total_contratos INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabela de certificados
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(36) PRIMARY KEY,
        professional_id VARCHAR(36) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_validade DATETIME,
        status ENUM('aprovado', 'pendente', 'rejeitado') DEFAULT 'pendente',
        arquivo_url VARCHAR(255),
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (professional_id) REFERENCES professionals(user_id) ON DELETE CASCADE
      )
    `);
    
    // Tabela de contratos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id VARCHAR(36) PRIMARY KEY,
        professional_id VARCHAR(36),
        company_id VARCHAR(36),
        servico VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_inicio DATETIME NOT NULL,
        data_fim DATETIME NOT NULL,
        status ENUM('pendente', 'ativo', 'concluido', 'cancelado') DEFAULT 'pendente',
        progresso INT DEFAULT 0,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (professional_id) REFERENCES professionals(user_id) ON DELETE SET NULL,
        FOREIGN KEY (company_id) REFERENCES companies(user_id) ON DELETE SET NULL
      )
    `);
    
    // Tabela de mensagens
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36),
        receiver_id VARCHAR(36),
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Tabela de demandas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS demands (
        id VARCHAR(36) PRIMARY KEY,
        company_id VARCHAR(36) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT NOT NULL,
        tipo_servico VARCHAR(255) NOT NULL,
        prazo DATETIME,
        orcamento DECIMAL(10,2),
        tipo_orcamento ENUM('fixo', 'por-hora', 'negociavel'),
        localizacao VARCHAR(255),
        estado CHAR(2),
        modalidade ENUM('presencial', 'remoto', 'hibrido'),
        urgencia ENUM('baixa', 'media', 'alta'),
        requisitos TEXT,
        status ENUM('active', 'closed', 'expired') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(user_id) ON DELETE CASCADE
      )
    `);
    
    // Tabela de avaliações
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(36) PRIMARY KEY,
        contract_id VARCHAR(36),
        reviewer_id VARCHAR(36),
        reviewed_id VARCHAR(36),
        avaliacao INT NOT NULL CHECK (avaliacao BETWEEN 1 AND 5),
        comentario TEXT,
        servico VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reviewed_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Tabela de planos de assinatura
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_monthly DECIMAL(10,2) NOT NULL,
        price_yearly DECIMAL(10,2) NOT NULL,
        features JSON,
        user_type ENUM('professional', 'company') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de assinaturas de usuários
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        plan_id VARCHAR(36),
        status ENUM('active', 'canceled', 'expired') DEFAULT 'active',
        billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
      )
    `);
    
    // Tabela de tokens de verificação
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        type ENUM('email', 'password') NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Tabela de tokens de reset de senha
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Inserir planos de assinatura padrão
    await connection.execute(`
      INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, user_type)
      VALUES
        (UUID(), 'Gratuito', 'Plano básico para profissionais', 0, 0, '{"features": ["Cadastro de perfil básico", "Até 3 certificados", "Receber até 5 contatos/mês", "Suporte por e-mail", "Acesso a biblioteca básica"]}', 'professional'),
        (UUID(), 'Profissional', 'Plano completo para profissionais', 49, 490, '{"features": ["Perfil completo com destaque", "Certificados ilimitados", "Contatos ilimitados", "Selo de verificado", "Relatórios detalhados", "Biblioteca completa SST", "Suporte prioritário", "Ferramentas de gestão"]}', 'professional'),
        (UUID(), 'Premium', 'Plano premium para profissionais', 99, 990, '{"features": ["Todos os recursos do Profissional", "Posição prioritária nas buscas", "Análise de performance", "Calendário integrado", "API para integrações", "Treinamentos exclusivos", "Consultoria personalizada"]}', 'professional'),
        (UUID(), 'Starter', 'Plano básico para empresas', 0, 0, '{"features": ["Cadastro da empresa", "Busca por profissionais", "Até 3 contatos/mês", "Perfil básico da empresa", "Suporte por e-mail"]}', 'company'),
        (UUID(), 'Business', 'Plano completo para empresas', 149, 1490, '{"features": ["Contatos ilimitados", "Relatórios completos", "Gestão de múltiplos projetos", "Integração com sistemas", "Suporte prioritário", "Perfil premium da empresa", "Análise de fornecedores"]}', 'company'),
        (UUID(), 'Enterprise', 'Plano personalizado para empresas', 999, 9990, '{"features": ["Todos os recursos do Business", "API dedicada", "Gestor de conta dedicado", "Treinamentos personalizados", "Integrações customizadas", "SLA garantido", "Consultoria estratégica"]}', 'company')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        price_monthly = VALUES(price_monthly),
        price_yearly = VALUES(price_yearly),
        features = VALUES(features),
        user_type = VALUES(user_type)
    `);
    
    console.log('Tabelas criadas com sucesso!');
    
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar script
createTables()
  .then(() => {
    console.log('Configuração do banco de dados concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro na configuração do banco de dados:', error);
    process.exit(1);
  });