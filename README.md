# LiggaSST Platform

Plataforma que conecta empresas com profissionais qualificados de Segurança do Trabalho em todo o Brasil.

## 🚀 Configuração do Projeto

### 1. Instalação das Dependências

```bash
npm install
```

### 2. Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative Authentication (Email/Password)
3. Ative Firestore Database
4. Ative Storage
5. Copie as configurações do projeto

### 3. Configuração das Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Preencha as variáveis com suas chaves do Firebase:
```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

### 4. Configuração do Firestore

Crie as seguintes coleções no Firestore:

- `users` - Controle de tipos de usuário
- `profissionais` - Dados dos profissionais
- `empresas` - Dados das empresas
- `contratos` - Contratos entre empresas e profissionais
- `mensagens` - Sistema de mensagens

### 5. Regras de Segurança do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profissionais collection
    match /profissionais/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Empresas collection
    match /empresas/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Contratos collection
    match /contratos/{contractId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.profissionalId || 
         request.auth.uid == resource.data.empresaId);
    }
    
    // Mensagens collection
    match /mensagens/{messageId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.senderId || 
         request.auth.uid == resource.data.receiverId);
    }
  }
}
```

### 6. Executar o Projeto

```bash
npm run dev
```

## 🔧 Funcionalidades

### Autenticação
- ✅ Login/Logout com Firebase Auth
- ✅ Cadastro de profissionais e empresas
- ✅ Verificação de email
- ✅ Recuperação de senha
- ✅ Redirecionamento automático para dashboard

### Profissionais
- ✅ Dashboard personalizado
- ✅ Gestão de perfil e certificados
- ✅ Busca de empresas
- ✅ Sistema de mensagens
- ✅ Gestão de contratos

### Empresas
- ✅ Dashboard empresarial
- ✅ Busca de profissionais
- ✅ Publicação de demandas
- ✅ Sistema de mensagens
- ✅ Relatórios e análises

### Administração
- ✅ Dashboard administrativo
- ✅ Gestão de usuários
- ✅ Relatórios gerais
- ✅ Moderação de conteúdo

## 🛡️ Segurança

- Autenticação Firebase
- Regras de segurança Firestore
- Validação de dados no frontend
- Proteção de rotas
- Verificação de email obrigatória

## 📱 Responsividade

- Design mobile-first
- Breakpoints otimizados
- Interface adaptável
- Performance otimizada

## 🎨 Design System

- Cores da marca LiggaSST
- Tipografia Poppins + Roboto
- Componentes reutilizáveis
- Animações suaves
- Estados de hover/focus

## 📦 Tecnologias

- React 18 + TypeScript
- Vite
- Firebase (Auth, Firestore, Storage)
- Tailwind CSS
- React Router DOM
- React Hook Form
- Lucide React (ícones)
- React Hot Toast

## 🚀 Deploy

O projeto está configurado para deploy automático. Certifique-se de:

1. Configurar as variáveis de ambiente no serviço de deploy
2. Configurar as regras de segurança do Firebase
3. Testar todas as funcionalidades em produção

## 📞 Suporte

Para dúvidas ou problemas:
- Email: suporte@liggasst.com.br
- WhatsApp: (11) 99999-9999