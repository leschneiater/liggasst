<?php
// API principal para integração com o banco de dados
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Tratar requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Incluir configuração do banco de dados
require_once 'db-config.php';

// Obter o caminho da URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = ltrim(str_replace('/api', '', $path), '/');
$segments = explode('/', $path);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Obter método HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Obter dados da requisição
$data = json_decode(file_get_contents('php://input'), true) ?? [];

// Autenticação básica (deve ser melhorada em produção)
function authenticate() {
    // Implementar autenticação adequada
    // Esta é apenas uma implementação básica para exemplo
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return false;
    }
    
    $token = $matches[1];
    // Verificar token (implementação simplificada)
    if ($token === 'seu_token_secreto') {
        return true;
    }
    
    return false;
}

// Resposta de erro
function errorResponse($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// Resposta de sucesso
function successResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Rotas da API
switch ($resource) {
    case 'professionals':
        if ($method === 'GET') {
            if ($id) {
                // Obter um profissional específico
                $professional = fetchOne("SELECT * FROM professionals WHERE id = ?", [$id]);
                if (!$professional) {
                    errorResponse('Profissional não encontrado', 404);
                }
                successResponse($professional);
            } else {
                // Listar profissionais com filtros
                $sql = "SELECT * FROM professionals WHERE 1=1";
                $params = [];
                
                // Aplicar filtros
                if (!empty($_GET['estado'])) {
                    $sql .= " AND estado = ?";
                    $params[] = $_GET['estado'];
                }
                
                if (!empty($_GET['formacao'])) {
                    $sql .= " AND formacao = ?";
                    $params[] = $_GET['formacao'];
                }
                
                // Adicionar mais filtros conforme necessário
                
                $professionals = fetchAll($sql, $params);
                successResponse($professionals);
            }
        } elseif ($method === 'POST') {
            // Criar novo profissional (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            // Validar dados
            if (empty($data['nome']) || empty($data['email'])) {
                errorResponse('Dados incompletos');
            }
            
            $id = insert('professionals', $data);
            successResponse(['id' => $id, 'message' => 'Profissional criado com sucesso'], 201);
        } elseif ($method === 'PUT' && $id) {
            // Atualizar profissional (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            $count = update('professionals', $data, 'id = ?', [$id]);
            if ($count === 0) {
                errorResponse('Profissional não encontrado', 404);
            }
            
            successResponse(['message' => 'Profissional atualizado com sucesso']);
        } elseif ($method === 'DELETE' && $id) {
            // Excluir profissional (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            $count = delete('professionals', 'id = ?', [$id]);
            if ($count === 0) {
                errorResponse('Profissional não encontrado', 404);
            }
            
            successResponse(['message' => 'Profissional excluído com sucesso']);
        } else {
            errorResponse('Método não permitido', 405);
        }
        break;
        
    case 'companies':
        if ($method === 'GET') {
            if ($id) {
                // Obter uma empresa específica
                $company = fetchOne("SELECT * FROM companies WHERE id = ?", [$id]);
                if (!$company) {
                    errorResponse('Empresa não encontrada', 404);
                }
                successResponse($company);
            } else {
                // Listar empresas com filtros
                $sql = "SELECT * FROM companies WHERE 1=1";
                $params = [];
                
                // Aplicar filtros
                if (!empty($_GET['estado'])) {
                    $sql .= " AND estado = ?";
                    $params[] = $_GET['estado'];
                }
                
                if (!empty($_GET['segmento'])) {
                    $sql .= " AND segmento = ?";
                    $params[] = $_GET['segmento'];
                }
                
                // Adicionar mais filtros conforme necessário
                
                $companies = fetchAll($sql, $params);
                successResponse($companies);
            }
        } elseif ($method === 'POST') {
            // Criar nova empresa (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            // Validar dados
            if (empty($data['nome_empresa']) || empty($data['email'])) {
                errorResponse('Dados incompletos');
            }
            
            $id = insert('companies', $data);
            successResponse(['id' => $id, 'message' => 'Empresa criada com sucesso'], 201);
        } elseif ($method === 'PUT' && $id) {
            // Atualizar empresa (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            $count = update('companies', $data, 'id = ?', [$id]);
            if ($count === 0) {
                errorResponse('Empresa não encontrada', 404);
            }
            
            successResponse(['message' => 'Empresa atualizada com sucesso']);
        } elseif ($method === 'DELETE' && $id) {
            // Excluir empresa (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            $count = delete('companies', 'id = ?', [$id]);
            if ($count === 0) {
                errorResponse('Empresa não encontrada', 404);
            }
            
            successResponse(['message' => 'Empresa excluída com sucesso']);
        } else {
            errorResponse('Método não permitido', 405);
        }
        break;
        
    case 'contracts':
        if ($method === 'GET') {
            if ($id) {
                // Obter um contrato específico
                $contract = fetchOne("SELECT * FROM contracts WHERE id = ?", [$id]);
                if (!$contract) {
                    errorResponse('Contrato não encontrado', 404);
                }
                successResponse($contract);
            } else {
                // Listar contratos com filtros
                $sql = "SELECT * FROM contracts WHERE 1=1";
                $params = [];
                
                // Aplicar filtros
                if (!empty($_GET['professional_id'])) {
                    $sql .= " AND professional_id = ?";
                    $params[] = $_GET['professional_id'];
                }
                
                if (!empty($_GET['company_id'])) {
                    $sql .= " AND company_id = ?";
                    $params[] = $_GET['company_id'];
                }
                
                if (!empty($_GET['status'])) {
                    $sql .= " AND status = ?";
                    $params[] = $_GET['status'];
                }
                
                // Adicionar mais filtros conforme necessário
                
                $contracts = fetchAll($sql, $params);
                successResponse($contracts);
            }
        } elseif ($method === 'POST') {
            // Criar novo contrato (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            // Validar dados
            if (empty($data['professional_id']) || empty($data['company_id']) || empty($data['servico'])) {
                errorResponse('Dados incompletos');
            }
            
            $id = insert('contracts', $data);
            successResponse(['id' => $id, 'message' => 'Contrato criado com sucesso'], 201);
        } elseif ($method === 'PUT' && $id) {
            // Atualizar contrato (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            $count = update('contracts', $data, 'id = ?', [$id]);
            if ($count === 0) {
                errorResponse('Contrato não encontrado', 404);
            }
            
            successResponse(['message' => 'Contrato atualizado com sucesso']);
        } elseif ($method === 'DELETE' && $id) {
            // Excluir contrato (requer autenticação)
            if (!authenticate()) {
                errorResponse('Não autorizado', 401);
            }
            
            $count = delete('contracts', 'id = ?', [$id]);
            if ($count === 0) {
                errorResponse('Contrato não encontrado', 404);
            }
            
            successResponse(['message' => 'Contrato excluído com sucesso']);
        } else {
            errorResponse('Método não permitido', 405);
        }
        break;
        
    // Adicionar mais recursos conforme necessário
        
    default:
        errorResponse('Recurso não encontrado', 404);
}