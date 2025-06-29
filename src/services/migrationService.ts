import * as db from '../lib/database';
import { supabase } from '../lib/supabase';
import { auth, db as firebaseDb } from '../config/firebase';

// Função para migrar dados do Supabase para o MySQL
export const migrateFromSupabase = async () => {
  try {
    console.log('Iniciando migração do Supabase para MySQL...');
    
    // 1. Migrar usuários
    await migrateUsers();
    
    // 2. Migrar profissionais
    await migrateProfessionals();
    
    // 3. Migrar empresas
    await migrateCompanies();
    
    // 4. Migrar certificados
    await migrateCertificates();
    
    // 5. Migrar contratos
    await migrateContracts();
    
    // 6. Migrar mensagens
    await migrateMessages();
    
    // 7. Migrar avaliações
    await migrateReviews();
    
    console.log('Migração do Supabase concluída com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('Erro na migração do Supabase:', error);
    return { success: false, error };
  }
};

// Função para migrar dados do Firebase para o MySQL
export const migrateFromFirebase = async () => {
  try {
    console.log('Iniciando migração do Firebase para MySQL...');
    
    // 1. Migrar usuários
    await migrateFirebaseUsers();
    
    // 2. Migrar profissionais
    await migrateFirebaseProfessionals();
    
    // 3. Migrar empresas
    await migrateFirebaseCompanies();
    
    // 4. Migrar contratos
    await migrateFirebaseContracts();
    
    // 5. Migrar mensagens
    await migrateFirebaseMessages();
    
    console.log('Migração do Firebase concluída com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('Erro na migração do Firebase:', error);
    return { success: false, error };
  }
};

// Funções auxiliares para migração do Supabase

async function migrateUsers() {
  console.log('Migrando usuários do Supabase...');
  
  // Buscar usuários do Supabase
  const { data: supabaseUsers, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    throw new Error(`Erro ao buscar usuários do Supabase: ${error.message}`);
  }
  
  // Inserir usuários no MySQL
  for (const user of supabaseUsers.users) {
    // Verificar se o usuário já existe no MySQL
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [user.email]
    );
    
    if (existingUser.success && (existingUser.data as any[]).length > 0) {
      console.log(`Usuário ${user.email} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir usuário no MySQL
    await db.query(
      `INSERT INTO users (
        id, email, password_hash, type, created_at, 
        updated_at, last_login, status, verified, profile_complete
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.email,
        'migrated_password', // Senha temporária, usuário precisará redefinir
        user.user_metadata.type || 'professional',
        user.created_at,
        user.updated_at,
        user.last_sign_in_at,
        user.banned ? 'suspended' : 'active',
        user.email_confirmed_at ? true : false,
        user.user_metadata.profile_complete || false
      ]
    );
    
    console.log(`Usuário ${user.email} migrado com sucesso!`);
  }
  
  console.log('Migração de usuários do Supabase concluída!');
}

async function migrateProfessionals() {
  console.log('Migrando profissionais do Supabase...');
  
  // Buscar profissionais do Supabase
  const { data: professionals, error } = await supabase
    .from('professionals')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao buscar profissionais do Supabase: ${error.message}`);
  }
  
  // Inserir profissionais no MySQL
  for (const professional of professionals || []) {
    // Verificar se o profissional já existe no MySQL
    const existingProfessional = await db.query(
      'SELECT * FROM professionals WHERE user_id = ?',
      [professional.id]
    );
    
    if (existingProfessional.success && (existingProfessional.data as any[]).length > 0) {
      console.log(`Profissional ${professional.id} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir profissional no MySQL
    await db.query(
      `INSERT INTO professionals (
        user_id, nome, cpf, telefone, cep, cidade, estado, endereco,
        formacao, especializacao, experiencia, registro, raio_atendimento,
        valor_hora, disponibilidade, descricao, verificado, especializacoes,
        avaliacao_media, total_avaliacoes, total_contratos
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        professional.id,
        professional.nome,
        professional.cpf,
        professional.telefone,
        professional.cep,
        professional.cidade,
        professional.estado,
        professional.endereco,
        professional.formacao,
        professional.especializacao,
        professional.experiencia,
        professional.registro,
        professional.raio_atendimento,
        professional.valor_hora,
        JSON.stringify(professional.disponibilidade || []),
        professional.descricao,
        professional.verificado || false,
        JSON.stringify(professional.especializacoes || []),
        professional.avaliacao_media || 0,
        professional.total_avaliacoes || 0,
        professional.total_contratos || 0
      ]
    );
    
    console.log(`Profissional ${professional.id} migrado com sucesso!`);
  }
  
  console.log('Migração de profissionais do Supabase concluída!');
}

async function migrateCompanies() {
  console.log('Migrando empresas do Supabase...');
  
  // Buscar empresas do Supabase
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao buscar empresas do Supabase: ${error.message}`);
  }
  
  // Inserir empresas no MySQL
  for (const company of companies || []) {
    // Verificar se a empresa já existe no MySQL
    const existingCompany = await db.query(
      'SELECT * FROM companies WHERE user_id = ?',
      [company.id]
    );
    
    if (existingCompany.success && (existingCompany.data as any[]).length > 0) {
      console.log(`Empresa ${company.id} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir empresa no MySQL
    await db.query(
      `INSERT INTO companies (
        user_id, nome_empresa, cnpj, telefone, cep, cidade, estado, endereco,
        segmento, numero_funcionarios, nome_responsavel, cargo_responsavel,
        email_responsavel, telefone_responsavel, descricao_empresa, necessidades,
        verificado, avaliacao_media, total_avaliacoes, total_contratos
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company.id,
        company.nome_empresa,
        company.cnpj,
        company.telefone,
        company.cep,
        company.cidade,
        company.estado,
        company.endereco,
        company.segmento,
        company.numero_funcionarios,
        company.nome_responsavel,
        company.cargo_responsavel,
        company.email_responsavel,
        company.telefone_responsavel,
        company.descricao_empresa,
        JSON.stringify(company.necessidades || []),
        company.verificado || false,
        company.avaliacao_media || 0,
        company.total_avaliacoes || 0,
        company.total_contratos || 0
      ]
    );
    
    console.log(`Empresa ${company.id} migrada com sucesso!`);
  }
  
  console.log('Migração de empresas do Supabase concluída!');
}

async function migrateCertificates() {
  console.log('Migrando certificados do Supabase...');
  
  // Buscar certificados do Supabase
  const { data: certificates, error } = await supabase
    .from('certificates')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao buscar certificados do Supabase: ${error.message}`);
  }
  
  // Inserir certificados no MySQL
  for (const certificate of certificates || []) {
    // Verificar se o certificado já existe no MySQL
    const existingCertificate = await db.query(
      'SELECT * FROM certificates WHERE id = ?',
      [certificate.id]
    );
    
    if (existingCertificate.success && (existingCertificate.data as any[]).length > 0) {
      console.log(`Certificado ${certificate.id} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir certificado no MySQL
    await db.query(
      `INSERT INTO certificates (
        id, professional_id, nome, tipo, data_upload, data_validade,
        status, arquivo_url, observacoes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certificate.id,
        certificate.professional_id,
        certificate.nome,
        certificate.tipo,
        certificate.data_upload,
        certificate.data_validade,
        certificate.status,
        certificate.arquivo_url,
        certificate.observacoes,
        certificate.created_at,
        certificate.updated_at
      ]
    );
    
    console.log(`Certificado ${certificate.id} migrado com sucesso!`);
  }
  
  console.log('Migração de certificados do Supabase concluída!');
}

async function migrateContracts() {
  console.log('Migrando contratos do Supabase...');
  
  // Buscar contratos do Supabase
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao buscar contratos do Supabase: ${error.message}`);
  }
  
  // Inserir contratos no MySQL
  for (const contract of contracts || []) {
    // Verificar se o contrato já existe no MySQL
    const existingContract = await db.query(
      'SELECT * FROM contracts WHERE id = ?',
      [contract.id]
    );
    
    if (existingContract.success && (existingContract.data as any[]).length > 0) {
      console.log(`Contrato ${contract.id} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir contrato no MySQL
    await db.query(
      `INSERT INTO contracts (
        id, professional_id, company_id, servico, valor, data_inicio,
        data_fim, status, progresso, descricao, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contract.id,
        contract.professional_id,
        contract.company_id,
        contract.servico,
        contract.valor,
        contract.data_inicio,
        contract.data_fim,
        contract.status,
        contract.progresso,
        contract.descricao,
        contract.created_at,
        contract.updated_at
      ]
    );
    
    console.log(`Contrato ${contract.id} migrado com sucesso!`);
  }
  
  console.log('Migração de contratos do Supabase concluída!');
}

async function migrateMessages() {
  console.log('Migrando mensagens do Supabase...');
  
  // Buscar mensagens do Supabase
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao buscar mensagens do Supabase: ${error.message}`);
  }
  
  // Inserir mensagens no MySQL
  for (const message of messages || []) {
    // Verificar se a mensagem já existe no MySQL
    const existingMessage = await db.query(
      'SELECT * FROM messages WHERE id = ?',
      [message.id]
    );
    
    if (existingMessage.success && (existingMessage.data as any[]).length > 0) {
      console.log(`Mensagem ${message.id} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir mensagem no MySQL
    await db.query(
      `INSERT INTO messages (
        id, sender_id, receiver_id, content, created_at, read
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.sender_id,
        message.receiver_id,
        message.content,
        message.created_at,
        message.read
      ]
    );
    
    console.log(`Mensagem ${message.id} migrada com sucesso!`);
  }
  
  console.log('Migração de mensagens do Supabase concluída!');
}

async function migrateReviews() {
  console.log('Migrando avaliações do Supabase...');
  
  // Buscar avaliações do Supabase
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*');
  
  if (error) {
    throw new Error(`Erro ao buscar avaliações do Supabase: ${error.message}`);
  }
  
  // Inserir avaliações no MySQL
  for (const review of reviews || []) {
    // Verificar se a avaliação já existe no MySQL
    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE id = ?',
      [review.id]
    );
    
    if (existingReview.success && (existingReview.data as any[]).length > 0) {
      console.log(`Avaliação ${review.id} já existe no MySQL, pulando...`);
      continue;
    }
    
    // Inserir avaliação no MySQL
    await db.query(
      `INSERT INTO reviews (
        id, contract_id, reviewer_id, reviewed_id, avaliacao,
        comentario, servico, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        review.id,
        review.contract_id,
        review.reviewer_id,
        review.reviewed_id,
        review.avaliacao,
        review.comentario,
        review.servico,
        review.created_at
      ]
    );
    
    console.log(`Avaliação ${review.id} migrada com sucesso!`);
  }
  
  console.log('Migração de avaliações do Supabase concluída!');
}

// Funções auxiliares para migração do Firebase

async function migrateFirebaseUsers() {
  console.log('Migrando usuários do Firebase...');
  
  try {
    // Buscar usuários do Firebase
    // Nota: Esta é uma implementação simplificada
    // Em produção, use a Admin SDK do Firebase para listar usuários
    const usersSnapshot = await firebaseDb.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('Nenhum usuário encontrado no Firebase');
      return;
    }
    
    // Inserir usuários no MySQL
    for (const doc of usersSnapshot.docs) {
      const firebaseUser = doc.data();
      
      // Verificar se o usuário já existe no MySQL
      const existingUser = await db.query(
        'SELECT * FROM users WHERE email = ?',
        [firebaseUser.email]
      );
      
      if (existingUser.success && (existingUser.data as any[]).length > 0) {
        console.log(`Usuário ${firebaseUser.email} já existe no MySQL, pulando...`);
        continue;
      }
      
      // Inserir usuário no MySQL
      await db.query(
        `INSERT INTO users (
          id, email, password_hash, type, created_at, 
          status, verified, profile_complete
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          firebaseUser.email,
          'migrated_password', // Senha temporária, usuário precisará redefinir
          firebaseUser.type,
          new Date(firebaseUser.createdAt || Date.now()).toISOString(),
          firebaseUser.status || 'active',
          firebaseUser.emailVerified || false,
          firebaseUser.profileComplete || false
        ]
      );
      
      console.log(`Usuário ${firebaseUser.email} migrado com sucesso!`);
    }
    
    console.log('Migração de usuários do Firebase concluída!');
  } catch (error) {
    console.error('Erro ao migrar usuários do Firebase:', error);
    throw error;
  }
}

async function migrateFirebaseProfessionals() {
  console.log('Migrando profissionais do Firebase...');
  
  try {
    // Buscar profissionais do Firebase
    const professionalsSnapshot = await firebaseDb.collection('profissionais').get();
    
    if (professionalsSnapshot.empty) {
      console.log('Nenhum profissional encontrado no Firebase');
      return;
    }
    
    // Inserir profissionais no MySQL
    for (const doc of professionalsSnapshot.docs) {
      const firebaseProfessional = doc.data();
      
      // Verificar se o profissional já existe no MySQL
      const existingProfessional = await db.query(
        'SELECT * FROM professionals WHERE user_id = ?',
        [doc.id]
      );
      
      if (existingProfessional.success && (existingProfessional.data as any[]).length > 0) {
        console.log(`Profissional ${doc.id} já existe no MySQL, pulando...`);
        continue;
      }
      
      // Inserir profissional no MySQL
      await db.query(
        `INSERT INTO professionals (
          user_id, nome, cpf, telefone, cep, cidade, estado, endereco,
          formacao, especializacao, experiencia, registro, raio_atendimento,
          valor_hora, disponibilidade, descricao, verificado, especializacoes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          firebaseProfessional.nome,
          firebaseProfessional.cpf,
          firebaseProfessional.telefone,
          firebaseProfessional.cep,
          firebaseProfessional.cidade,
          firebaseProfessional.estado,
          firebaseProfessional.endereco,
          firebaseProfessional.formacao,
          firebaseProfessional.especializacao,
          firebaseProfessional.experiencia,
          firebaseProfessional.registro,
          firebaseProfessional.raioAtendimento,
          firebaseProfessional.valorHora,
          JSON.stringify(firebaseProfessional.disponibilidade || []),
          firebaseProfessional.descricao,
          firebaseProfessional.verificado || false,
          JSON.stringify(firebaseProfessional.especializacoes || [])
        ]
      );
      
      console.log(`Profissional ${doc.id} migrado com sucesso!`);
    }
    
    console.log('Migração de profissionais do Firebase concluída!');
  } catch (error) {
    console.error('Erro ao migrar profissionais do Firebase:', error);
    throw error;
  }
}

async function migrateFirebaseCompanies() {
  console.log('Migrando empresas do Firebase...');
  
  try {
    // Buscar empresas do Firebase
    const companiesSnapshot = await firebaseDb.collection('empresas').get();
    
    if (companiesSnapshot.empty) {
      console.log('Nenhuma empresa encontrada no Firebase');
      return;
    }
    
    // Inserir empresas no MySQL
    for (const doc of companiesSnapshot.docs) {
      const firebaseCompany = doc.data();
      
      // Verificar se a empresa já existe no MySQL
      const existingCompany = await db.query(
        'SELECT * FROM companies WHERE user_id = ?',
        [doc.id]
      );
      
      if (existingCompany.success && (existingCompany.data as any[]).length > 0) {
        console.log(`Empresa ${doc.id} já existe no MySQL, pulando...`);
        continue;
      }
      
      // Inserir empresa no MySQL
      await db.query(
        `INSERT INTO companies (
          user_id, nome_empresa, cnpj, telefone, cep, cidade, estado, endereco,
          segmento, numero_funcionarios, nome_responsavel, cargo_responsavel,
          email_responsavel, telefone_responsavel, descricao_empresa, necessidades
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          firebaseCompany.nomeEmpresa,
          firebaseCompany.cnpj,
          firebaseCompany.telefone,
          firebaseCompany.cep,
          firebaseCompany.cidade,
          firebaseCompany.estado,
          firebaseCompany.endereco,
          firebaseCompany.segmento,
          firebaseCompany.numeroFuncionarios,
          firebaseCompany.nomeResponsavel,
          firebaseCompany.cargoResponsavel,
          firebaseCompany.emailResponsavel,
          firebaseCompany.telefoneResponsavel,
          firebaseCompany.descricaoEmpresa,
          JSON.stringify(firebaseCompany.necessidades || [])
        ]
      );
      
      console.log(`Empresa ${doc.id} migrada com sucesso!`);
    }
    
    console.log('Migração de empresas do Firebase concluída!');
  } catch (error) {
    console.error('Erro ao migrar empresas do Firebase:', error);
    throw error;
  }
}

async function migrateFirebaseContracts() {
  console.log('Migrando contratos do Firebase...');
  
  try {
    // Buscar contratos do Firebase
    const contractsSnapshot = await firebaseDb.collection('contratos').get();
    
    if (contractsSnapshot.empty) {
      console.log('Nenhum contrato encontrado no Firebase');
      return;
    }
    
    // Inserir contratos no MySQL
    for (const doc of contractsSnapshot.docs) {
      const firebaseContract = doc.data();
      
      // Verificar se o contrato já existe no MySQL
      const existingContract = await db.query(
        'SELECT * FROM contracts WHERE id = ?',
        [doc.id]
      );
      
      if (existingContract.success && (existingContract.data as any[]).length > 0) {
        console.log(`Contrato ${doc.id} já existe no MySQL, pulando...`);
        continue;
      }
      
      // Inserir contrato no MySQL
      await db.query(
        `INSERT INTO contracts (
          id, professional_id, company_id, servico, valor, data_inicio,
          data_fim, status, progresso, descricao, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          firebaseContract.profissionalId,
          firebaseContract.empresaId,
          firebaseContract.servico,
          firebaseContract.valor,
          new Date(firebaseContract.dataInicio).toISOString(),
          new Date(firebaseContract.dataFim).toISOString(),
          firebaseContract.status,
          firebaseContract.progresso,
          firebaseContract.descricao,
          new Date(firebaseContract.createdAt || Date.now()).toISOString()
        ]
      );
      
      console.log(`Contrato ${doc.id} migrado com sucesso!`);
    }
    
    console.log('Migração de contratos do Firebase concluída!');
  } catch (error) {
    console.error('Erro ao migrar contratos do Firebase:', error);
    throw error;
  }
}

async function migrateFirebaseMessages() {
  console.log('Migrando mensagens do Firebase...');
  
  try {
    // Buscar mensagens do Firebase
    const messagesSnapshot = await firebaseDb.collection('mensagens').get();
    
    if (messagesSnapshot.empty) {
      console.log('Nenhuma mensagem encontrada no Firebase');
      return;
    }
    
    // Inserir mensagens no MySQL
    for (const doc of messagesSnapshot.docs) {
      const firebaseMessage = doc.data();
      
      // Verificar se a mensagem já existe no MySQL
      const existingMessage = await db.query(
        'SELECT * FROM messages WHERE id = ?',
        [doc.id]
      );
      
      if (existingMessage.success && (existingMessage.data as any[]).length > 0) {
        console.log(`Mensagem ${doc.id} já existe no MySQL, pulando...`);
        continue;
      }
      
      // Inserir mensagem no MySQL
      await db.query(
        `INSERT INTO messages (
          id, sender_id, receiver_id, content, created_at, read
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          doc.id,
          firebaseMessage.senderId,
          firebaseMessage.receiverId,
          firebaseMessage.content,
          new Date(firebaseMessage.createdAt || Date.now()).toISOString(),
          firebaseMessage.read || false
        ]
      );
      
      console.log(`Mensagem ${doc.id} migrada com sucesso!`);
    }
    
    console.log('Migração de mensagens do Firebase concluída!');
  } catch (error) {
    console.error('Erro ao migrar mensagens do Firebase:', error);
    throw error;
  }
}

// Função para executar migração completa
export const migrateAllData = async () => {
  try {
    console.log('Iniciando migração completa de dados...');
    
    // Migrar do Supabase
    await migrateFromSupabase();
    
    // Migrar do Firebase
    await migrateFromFirebase();
    
    console.log('Migração completa de dados concluída com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('Erro na migração completa de dados:', error);
    return { success: false, error };
  }
};