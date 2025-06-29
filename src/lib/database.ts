import mysql from 'mysql2/promise';

// Configuração do banco de dados
const dbConfig = {
  host: import.meta.env.VITE_DB_HOST || 'liggasst.com.br',
  user: import.meta.env.VITE_DB_USER || 'ligga0200980',
  password: import.meta.env.VITE_DB_PASSWORD || 'eY4;aYN+Et6o82',
  database: import.meta.env.VITE_DB_NAME || 'ligga0200980_sst',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Criar pool de conexões
let pool: mysql.Pool | null = null;

// Função para obter conexão do pool
export const getConnection = async () => {
  if (!pool) {
    try {
      pool = mysql.createPool(dbConfig);
      console.log('Pool de conexão MySQL criado com sucesso');
    } catch (error) {
      console.error('Erro ao criar pool de conexão MySQL:', error);
      throw error;
    }
  }
  return pool;
};

// Função para testar conexão
export const testConnection = async () => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT 1 as test');
    return { success: true, data: rows };
  } catch (error) {
    console.error('Erro na conexão com o banco de dados:', error);
    return { success: false, error };
  }
};

// Função para executar consultas
export const query = async (sql: string, params: any[] = []) => {
  try {
    const connection = await getConnection();
    const [results] = await connection.query(sql, params);
    return { success: true, data: results };
  } catch (error) {
    console.error('Erro ao executar consulta:', error);
    return { success: false, error };
  }
};

// Função para buscar profissionais
export const fetchProfessionals = async (filters = {}) => {
  try {
    let sql = `
      SELECT p.*, u.email, u.photo_url, u.verified
      FROM professionals p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Aplicar filtros se existirem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'search' && typeof value === 'string') {
            sql += ` AND (p.nome LIKE ? OR p.formacao LIKE ? OR p.cidade LIKE ? OR p.estado LIKE ?)`;
            const searchTerm = `%${value}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
          } else if (key === 'estado' && typeof value === 'string') {
            sql += ` AND p.estado = ?`;
            params.push(value);
          } else if (key === 'formacao' && typeof value === 'string') {
            sql += ` AND p.formacao = ?`;
            params.push(value);
          } else if (key === 'experiencia' && typeof value === 'string') {
            // Converter string de experiência para valores numéricos
            const expRange = value.split('-');
            if (expRange.length === 2) {
              sql += ` AND p.experiencia BETWEEN ? AND ?`;
              params.push(parseInt(expRange[0]), parseInt(expRange[1]));
            } else if (value.includes('Mais de')) {
              const minExp = parseInt(value.replace('Mais de ', ''));
              sql += ` AND p.experiencia > ?`;
              params.push(minExp);
            }
          } else if (key === 'especializacao' && typeof value === 'string') {
            sql += ` AND JSON_CONTAINS(p.especializacoes, ?)`;
            params.push(JSON.stringify(value));
          } else if (key === 'disponibilidade' && typeof value === 'string') {
            sql += ` AND JSON_CONTAINS(p.disponibilidade, ?)`;
            params.push(JSON.stringify(value));
          } else if (key === 'verificado' && typeof value === 'boolean') {
            sql += ` AND u.verified = ?`;
            params.push(value);
          } else if (key === 'valorMin' && typeof value === 'string') {
            sql += ` AND p.valor_hora >= ?`;
            params.push(parseFloat(value));
          } else if (key === 'valorMax' && typeof value === 'string') {
            sql += ` AND p.valor_hora <= ?`;
            params.push(parseFloat(value));
          }
        }
      });
    }
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao buscar profissionais:', error);
    return { success: false, error };
  }
};

// Função para buscar empresas
export const fetchCompanies = async (filters = {}) => {
  try {
    let sql = `
      SELECT c.*, u.email, u.photo_url, u.verified
      FROM companies c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Aplicar filtros se existirem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'search' && typeof value === 'string') {
            sql += ` AND (c.nome_empresa LIKE ? OR c.segmento LIKE ? OR c.cidade LIKE ? OR c.estado LIKE ?)`;
            const searchTerm = `%${value}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
          } else if (key === 'estado' && typeof value === 'string') {
            sql += ` AND c.estado = ?`;
            params.push(value);
          } else if (key === 'segmento' && typeof value === 'string') {
            sql += ` AND c.segmento = ?`;
            params.push(value);
          } else if (key === 'tamanho' && typeof value === 'string') {
            sql += ` AND c.numero_funcionarios = ?`;
            params.push(value);
          } else if (key === 'necessidade' && typeof value === 'string') {
            sql += ` AND JSON_CONTAINS(c.necessidades, ?)`;
            params.push(JSON.stringify(value));
          }
        }
      });
    }
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return { success: false, error };
  }
};

// Função para buscar contratos
export const fetchContracts = async (userId: string, userType: string) => {
  try {
    let sql = `
      SELECT c.*, 
             p.nome as nome_profissional, 
             e.nome_empresa as nome_empresa
      FROM contracts c
      LEFT JOIN professionals p ON c.professional_id = p.user_id
      LEFT JOIN companies e ON c.company_id = e.user_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Filtrar por usuário (profissional ou empresa)
    if (userType === 'professional') {
      sql += ` AND c.professional_id = ?`;
      params.push(userId);
    } else if (userType === 'company') {
      sql += ` AND c.company_id = ?`;
      params.push(userId);
    }
    
    sql += ` ORDER BY c.data_inicio DESC`;
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    return { success: false, error };
  }
};

// Função para salvar perfil do usuário
export const saveUserProfile = async (userId: string, profileData: any, userType: string) => {
  try {
    const connection = await getConnection();
    
    // Iniciar transação
    await connection.beginTransaction();
    
    try {
      // Atualizar tabela users
      const userUpdateSql = `
        UPDATE users 
        SET 
          email = ?,
          updated_at = NOW(),
          profile_complete = ?
        WHERE id = ?
      `;
      
      await connection.query(userUpdateSql, [
        profileData.email,
        true,
        userId
      ]);
      
      // Atualizar tabela específica (professionals ou companies)
      if (userType === 'professional') {
        const profUpdateSql = `
          UPDATE professionals 
          SET 
            nome = ?,
            telefone = ?,
            cep = ?,
            cidade = ?,
            estado = ?,
            endereco = ?,
            formacao = ?,
            especializacao = ?,
            experiencia = ?,
            registro = ?,
            raio_atendimento = ?,
            valor_hora = ?,
            disponibilidade = ?,
            descricao = ?
          WHERE user_id = ?
        `;
        
        await connection.query(profUpdateSql, [
          profileData.nome,
          profileData.telefone,
          profileData.cep,
          profileData.cidade,
          profileData.estado,
          profileData.endereco,
          profileData.formacao,
          profileData.especializacao,
          profileData.experiencia,
          profileData.registro,
          profileData.raioAtendimento,
          profileData.valorHora,
          JSON.stringify(profileData.disponibilidade || []),
          profileData.descricao,
          userId
        ]);
      } else if (userType === 'company') {
        const compUpdateSql = `
          UPDATE companies 
          SET 
            nome_empresa = ?,
            cnpj = ?,
            telefone = ?,
            cep = ?,
            cidade = ?,
            estado = ?,
            endereco = ?,
            segmento = ?,
            numero_funcionarios = ?,
            nome_responsavel = ?,
            cargo_responsavel = ?,
            email_responsavel = ?,
            telefone_responsavel = ?,
            descricao_empresa = ?,
            necessidades = ?
          WHERE user_id = ?
        `;
        
        await connection.query(compUpdateSql, [
          profileData.nomeEmpresa,
          profileData.cnpj,
          profileData.telefone,
          profileData.cep,
          profileData.cidade,
          profileData.estado,
          profileData.endereco,
          profileData.segmento,
          profileData.numeroFuncionarios,
          profileData.nomeResponsavel,
          profileData.cargoResponsavel,
          profileData.emailResponsavel,
          profileData.telefoneResponsavel,
          profileData.descricaoEmpresa,
          JSON.stringify(profileData.necessidades || []),
          userId
        ]);
      }
      
      // Commit da transação
      await connection.commit();
      
      return { success: true };
    } catch (error) {
      // Rollback em caso de erro
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return { success: false, error };
  }
};

// Função para buscar perfil do usuário
export const fetchUserProfile = async (userId: string) => {
  try {
    // Primeiro, verificar o tipo do usuário
    const userResult = await query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userResult.success || !userResult.data || (userResult.data as any[]).length === 0) {
      throw new Error('Usuário não encontrado');
    }
    
    const user = (userResult.data as any[])[0];
    const userType = user.type;
    
    // Buscar dados específicos baseado no tipo
    if (userType === 'professional') {
      const profResult = await query(
        `SELECT p.*, u.email, u.photo_url, u.verified, u.created_at
         FROM professionals p
         JOIN users u ON p.user_id = u.id
         WHERE p.user_id = ?`,
        [userId]
      );
      
      if (!profResult.success) {
        throw new Error('Erro ao buscar dados do profissional');
      }
      
      return profResult;
    } else if (userType === 'company') {
      const compResult = await query(
        `SELECT c.*, u.email, u.photo_url, u.verified, u.created_at
         FROM companies c
         JOIN users u ON c.user_id = u.id
         WHERE c.user_id = ?`,
        [userId]
      );
      
      if (!compResult.success) {
        throw new Error('Erro ao buscar dados da empresa');
      }
      
      return compResult;
    } else {
      throw new Error('Tipo de usuário inválido');
    }
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return { success: false, error };
  }
};

// Função para enviar mensagem
export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
  try {
    const sql = `
      INSERT INTO messages (sender_id, receiver_id, content, created_at, read)
      VALUES (?, ?, ?, NOW(), false)
    `;
    
    const result = await query(sql, [senderId, receiverId, content]);
    return result;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return { success: false, error };
  }
};

// Função para buscar mensagens
export const fetchMessages = async (userId: string) => {
  try {
    const sql = `
      SELECT m.*,
             CASE 
               WHEN m.sender_id = ? THEN 'sent'
               ELSE 'received'
             END as direction,
             CASE
               WHEN m.sender_id = ? THEN r.nome_empresa
               WHEN r.nome_empresa IS NOT NULL THEN r.nome_empresa
               ELSE s.nome
             END as sender_name
      FROM messages m
      LEFT JOIN companies r ON m.receiver_id = r.user_id
      LEFT JOIN professionals s ON m.sender_id = s.user_id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
    `;
    
    const result = await query(sql, [userId, userId, userId, userId]);
    return result;
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return { success: false, error };
  }
};

// Função para marcar mensagem como lida
export const markMessageAsRead = async (messageId: string) => {
  try {
    const sql = `
      UPDATE messages
      SET read = true
      WHERE id = ?
    `;
    
    const result = await query(sql, [messageId]);
    return result;
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    return { success: false, error };
  }
};

// Função para publicar demanda
export const publishDemand = async (demandData: any) => {
  try {
    const sql = `
      INSERT INTO demands (
        company_id, titulo, descricao, tipo_servico, prazo, orcamento,
        tipo_orcamento, localizacao, estado, modalidade, urgencia,
        requisitos, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `;
    
    const params = [
      demandData.companyId,
      demandData.titulo,
      demandData.descricao,
      demandData.tipoServico,
      demandData.prazo,
      demandData.orcamento,
      demandData.tipoOrcamento,
      demandData.localizacao,
      demandData.estado,
      demandData.modalidade,
      demandData.urgencia,
      demandData.requisitos
    ];
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao publicar demanda:', error);
    return { success: false, error };
  }
};

// Função para buscar demandas
export const fetchDemands = async (filters = {}) => {
  try {
    let sql = `
      SELECT d.*, c.nome_empresa
      FROM demands d
      JOIN companies c ON d.company_id = c.user_id
      WHERE d.status = 'active'
    `;
    
    const params: any[] = [];
    
    // Aplicar filtros se existirem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'search' && typeof value === 'string') {
            sql += ` AND (d.titulo LIKE ? OR d.descricao LIKE ? OR d.tipo_servico LIKE ?)`;
            const searchTerm = `%${value}%`;
            params.push(searchTerm, searchTerm, searchTerm);
          } else if (key === 'estado' && typeof value === 'string') {
            sql += ` AND d.estado = ?`;
            params.push(value);
          } else if (key === 'tipoServico' && typeof value === 'string') {
            sql += ` AND d.tipo_servico = ?`;
            params.push(value);
          } else if (key === 'modalidade' && typeof value === 'string') {
            sql += ` AND d.modalidade = ?`;
            params.push(value);
          } else if (key === 'urgencia' && typeof value === 'string') {
            sql += ` AND d.urgencia = ?`;
            params.push(value);
          } else if (key === 'companyId' && typeof value === 'string') {
            sql += ` AND d.company_id = ?`;
            params.push(value);
          }
        }
      });
    }
    
    sql += ` ORDER BY d.created_at DESC`;
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao buscar demandas:', error);
    return { success: false, error };
  }
};

// Função para autenticar usuário
export const authenticateUser = async (email: string, password: string) => {
  try {
    // Primeiro, verificar se o usuário existe
    const userResult = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!userResult.success || !userResult.data || (userResult.data as any[]).length === 0) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    const user = (userResult.data as any[])[0];
    
    // Verificar senha (em produção, use bcrypt ou similar)
    // Aqui estamos assumindo que a senha já está hasheada no banco
    const passwordMatch = await verifyPassword(password, user.password_hash);
    
    if (!passwordMatch) {
      return { success: false, error: 'Senha incorreta' };
    }
    
    // Atualizar último login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
    // Buscar dados específicos baseado no tipo
    let userData = null;
    
    if (user.type === 'professional') {
      const profResult = await query(
        'SELECT * FROM professionals WHERE user_id = ?',
        [user.id]
      );
      
      if (profResult.success && profResult.data) {
        userData = (profResult.data as any[])[0];
      }
    } else if (user.type === 'company') {
      const compResult = await query(
        'SELECT * FROM companies WHERE user_id = ?',
        [user.id]
      );
      
      if (compResult.success && compResult.data) {
        userData = (compResult.data as any[])[0];
      }
    }
    
    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        verified: user.verified,
        created_at: user.created_at,
        ...userData
      }
    };
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return { success: false, error };
  }
};

// Função auxiliar para verificar senha
const verifyPassword = async (password: string, hashedPassword: string) => {
  // Em produção, use bcrypt ou similar
  // Esta é uma implementação simplificada para exemplo
  return password === hashedPassword;
};

// Função para registrar usuário
export const registerUser = async (email: string, password: string, userData: any, type: 'professional' | 'company') => {
  try {
    const connection = await getConnection();
    
    // Iniciar transação
    await connection.beginTransaction();
    
    try {
      // Verificar se email já existe
      const [existingUsers] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if ((existingUsers as any[]).length > 0) {
        throw new Error('Email já está em uso');
      }
      
      // Gerar ID único
      const userId = generateUniqueId();
      
      // Em produção, hash a senha com bcrypt ou similar
      const passwordHash = password; // Simplificado para exemplo
      
      // Inserir na tabela users
      await connection.query(
        `INSERT INTO users (id, email, password_hash, type, created_at, status, verified, profile_complete)
         VALUES (?, ?, ?, ?, NOW(), 'active', false, false)`,
        [userId, email, passwordHash, type]
      );
      
      // Inserir na tabela específica (professionals ou companies)
      if (type === 'professional') {
        await connection.query(
          `INSERT INTO professionals (
            user_id, nome, telefone, cpf, cep, cidade, estado, endereco,
            formacao, especializacao, experiencia, registro, raio_atendimento,
            valor_hora, disponibilidade, descricao, verificado, especializacoes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, ?)`,
          [
            userId,
            userData.nome,
            userData.telefone,
            userData.cpf,
            userData.cep,
            userData.cidade,
            userData.estado,
            userData.endereco,
            userData.formacao,
            userData.especializacao,
            userData.experiencia,
            userData.registro,
            userData.raioAtendimento,
            userData.valorHora,
            JSON.stringify(userData.disponibilidade || []),
            userData.descricao,
            JSON.stringify(userData.especializacoes || [])
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO companies (
            user_id, nome_empresa, cnpj, telefone, cep, cidade, estado, endereco,
            segmento, numero_funcionarios, nome_responsavel, cargo_responsavel,
            email_responsavel, telefone_responsavel, descricao_empresa, necessidades,
            verificado
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false)`,
          [
            userId,
            userData.nomeEmpresa,
            userData.cnpj,
            userData.telefone,
            userData.cep,
            userData.cidade,
            userData.estado,
            userData.endereco,
            userData.segmento,
            userData.numeroFuncionarios,
            userData.nomeResponsavel,
            userData.cargoResponsavel,
            userData.emailResponsavel,
            userData.telefoneResponsavel,
            userData.descricaoEmpresa,
            JSON.stringify(userData.necessidades || [])
          ]
        );
      }
      
      // Commit da transação
      await connection.commit();
      
      return { success: true, userId };
    } catch (error) {
      // Rollback em caso de erro
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return { success: false, error };
  }
};

// Função auxiliar para gerar ID único
const generateUniqueId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Função para enviar email de verificação
export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    // Implementar envio de email
    // Esta é uma implementação de exemplo
    const verificationLink = `https://liggasst.com.br/verificar-email?token=${token}`;
    
    const emailBody = `
      <h1>Verifique seu email</h1>
      <p>Clique no link abaixo para verificar seu email:</p>
      <a href="${verificationLink}">${verificationLink}</a>
    `;
    
    // Chamar função de envio de email
    const result = await sendEmail(email, 'Verificação de Email - LiggaSST', emailBody);
    
    return result;
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    return { success: false, error };
  }
};

// Função para verificar email
export const verifyEmail = async (token: string) => {
  try {
    // Verificar token
    const tokenResult = await query(
      'SELECT * FROM verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (!tokenResult.success || !tokenResult.data || (tokenResult.data as any[]).length === 0) {
      return { success: false, error: 'Token inválido ou expirado' };
    }
    
    const tokenData = (tokenResult.data as any[])[0];
    
    // Atualizar status de verificação do usuário
    await query(
      'UPDATE users SET verified = true WHERE id = ?',
      [tokenData.user_id]
    );
    
    // Remover token usado
    await query(
      'DELETE FROM verification_tokens WHERE token = ?',
      [token]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return { success: false, error };
  }
};

// Função para resetar senha
export const resetPassword = async (email: string) => {
  try {
    // Verificar se o usuário existe
    const userResult = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (!userResult.success || !userResult.data || (userResult.data as any[]).length === 0) {
      return { success: false, error: 'Email não encontrado' };
    }
    
    const user = (userResult.data as any[])[0];
    
    // Gerar token de reset
    const token = generateUniqueId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token válido por 24 horas
    
    // Salvar token
    await query(
      `INSERT INTO reset_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, token, expiresAt]
    );
    
    // Enviar email com link de reset
    const resetLink = `https://liggasst.com.br/redefinir-senha?token=${token}`;
    
    const emailBody = `
      <h1>Redefinição de Senha</h1>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Este link expira em 24 horas.</p>
    `;
    
    await sendEmail(email, 'Redefinição de Senha - LiggaSST', emailBody);
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return { success: false, error };
  }
};

// Função para atualizar senha
export const updatePassword = async (token: string, newPassword: string) => {
  try {
    // Verificar token
    const tokenResult = await query(
      'SELECT * FROM reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (!tokenResult.success || !tokenResult.data || (tokenResult.data as any[]).length === 0) {
      return { success: false, error: 'Token inválido ou expirado' };
    }
    
    const tokenData = (tokenResult.data as any[])[0];
    
    // Em produção, hash a senha com bcrypt ou similar
    const passwordHash = newPassword; // Simplificado para exemplo
    
    // Atualizar senha do usuário
    await query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, tokenData.user_id]
    );
    
    // Remover token usado
    await query(
      'DELETE FROM reset_tokens WHERE token = ?',
      [token]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return { success: false, error };
  }
};

// Função para upload de certificado
export const uploadCertificate = async (professionalId: string, certificateData: any, fileUrl: string) => {
  try {
    const sql = `
      INSERT INTO certificates (
        professional_id, nome, tipo, data_upload, data_validade,
        status, arquivo_url, created_at
      )
      VALUES (?, ?, ?, NOW(), ?, 'pendente', ?, NOW())
    `;
    
    const params = [
      professionalId,
      certificateData.nome,
      certificateData.tipo,
      certificateData.dataValidade,
      fileUrl
    ];
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao fazer upload de certificado:', error);
    return { success: false, error };
  }
};

// Função para buscar certificados
export const fetchCertificates = async (professionalId: string) => {
  try {
    const sql = `
      SELECT *
      FROM certificates
      WHERE professional_id = ?
      ORDER BY data_upload DESC
    `;
    
    const result = await query(sql, [professionalId]);
    return result;
  } catch (error) {
    console.error('Erro ao buscar certificados:', error);
    return { success: false, error };
  }
};

// Função para criar contrato
export const createContract = async (contractData: any) => {
  try {
    const sql = `
      INSERT INTO contracts (
        professional_id, company_id, servico, valor, data_inicio,
        data_fim, status, progresso, descricao, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pendente', 0, ?, NOW())
    `;
    
    const params = [
      contractData.professionalId,
      contractData.companyId,
      contractData.servico,
      contractData.valor,
      contractData.dataInicio,
      contractData.dataFim,
      contractData.descricao
    ];
    
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    return { success: false, error };
  }
};

// Função para atualizar status do contrato
export const updateContractStatus = async (contractId: string, status: string, progresso: number) => {
  try {
    const sql = `
      UPDATE contracts
      SET status = ?, progresso = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    const result = await query(sql, [status, progresso, contractId]);
    return result;
  } catch (error) {
    console.error('Erro ao atualizar status do contrato:', error);
    return { success: false, error };
  }
};

// Função para criar avaliação
export const createReview = async (reviewData: any) => {
  try {
    const sql = `
      INSERT INTO reviews (
        contract_id, reviewer_id, reviewed_id, avaliacao,
        comentario, servico, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const params = [
      reviewData.contractId,
      reviewData.reviewerId,
      reviewData.reviewedId,
      reviewData.avaliacao,
      reviewData.comentario,
      reviewData.servico
    ];
    
    const result = await query(sql, params);
    
    // Atualizar média de avaliações
    if (result.success) {
      await updateAverageRating(reviewData.reviewedId);
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    return { success: false, error };
  }
};

// Função auxiliar para atualizar média de avaliações
const updateAverageRating = async (userId: string) => {
  try {
    // Verificar tipo de usuário
    const userResult = await query(
      'SELECT type FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userResult.success || !userResult.data || (userResult.data as any[]).length === 0) {
      throw new Error('Usuário não encontrado');
    }
    
    const userType = (userResult.data as any[])[0].type;
    
    // Calcular média de avaliações
    const reviewsResult = await query(
      'SELECT AVG(avaliacao) as media, COUNT(*) as total FROM reviews WHERE reviewed_id = ?',
      [userId]
    );
    
    if (!reviewsResult.success || !reviewsResult.data) {
      throw new Error('Erro ao calcular média de avaliações');
    }
    
    const reviewsData = (reviewsResult.data as any[])[0];
    const media = reviewsData.media || 0;
    const total = reviewsData.total || 0;
    
    // Atualizar tabela específica
    if (userType === 'professional') {
      await query(
        'UPDATE professionals SET avaliacao_media = ?, total_avaliacoes = ? WHERE user_id = ?',
        [media, total, userId]
      );
    } else if (userType === 'company') {
      await query(
        'UPDATE companies SET avaliacao_media = ?, total_avaliacoes = ? WHERE user_id = ?',
        [media, total, userId]
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar média de avaliações:', error);
    return { success: false, error };
  }
};

// Função para buscar avaliações
export const fetchReviews = async (userId: string) => {
  try {
    const sql = `
      SELECT r.*,
             CASE
               WHEN u.type = 'professional' THEN p.nome
               WHEN u.type = 'company' THEN c.nome_empresa
               ELSE 'Usuário'
             END as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN professionals p ON r.reviewer_id = p.user_id
      LEFT JOIN companies c ON r.reviewer_id = c.user_id
      WHERE r.reviewed_id = ?
      ORDER BY r.created_at DESC
    `;
    
    const result = await query(sql, [userId]);
    return result;
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    return { success: false, error };
  }
};

// Função para buscar planos de assinatura
export const fetchSubscriptionPlans = async (userType: string) => {
  try {
    const sql = `
      SELECT *
      FROM subscription_plans
      WHERE user_type = ? AND is_active = true
    `;
    
    const result = await query(sql, [userType]);
    return result;
  } catch (error) {
    console.error('Erro ao buscar planos de assinatura:', error);
    return { success: false, error };
  }
};

// Função para criar assinatura
export const createSubscription = async (userId: string, planId: string, billingCycle: string) => {
  try {
    // Calcular data de término baseada no ciclo de cobrança
    const endDate = new Date();
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    const sql = `
      INSERT INTO user_subscriptions (
        user_id, plan_id, status, billing_cycle,
        start_date, end_date, created_at
      )
      VALUES (?, ?, 'active', ?, NOW(), ?, NOW())
    `;
    
    const result = await query(sql, [userId, planId, billingCycle, endDate]);
    return result;
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return { success: false, error };
  }
};

// Função para cancelar assinatura
export const cancelSubscription = async (subscriptionId: string) => {
  try {
    const sql = `
      UPDATE user_subscriptions
      SET status = 'canceled', updated_at = NOW()
      WHERE id = ?
    `;
    
    const result = await query(sql, [subscriptionId]);
    return result;
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return { success: false, error };
  }
};

// Função para buscar assinatura atual do usuário
export const fetchUserSubscription = async (userId: string) => {
  try {
    const sql = `
      SELECT us.*, sp.name as plan_name, sp.price_monthly, sp.price_yearly, sp.features
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `;
    
    const result = await query(sql, [userId]);
    return result;
  } catch (error) {
    console.error('Erro ao buscar assinatura do usuário:', error);
    return { success: false, error };
  }
};