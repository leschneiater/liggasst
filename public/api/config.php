<?php
// Configurações gerais da API
define('API_VERSION', '1.0.0');
define('API_NAME', 'LiggaSST API');
define('API_DESCRIPTION', 'API para a plataforma LiggaSST');

// Configurações de segurança
define('JWT_SECRET', 'seu_segredo_jwt_aqui'); // Altere para um valor seguro em produção
define('TOKEN_EXPIRY', 86400); // 24 horas em segundos

// Configurações de email
define('SMTP_HOST', 'mail.liggasst.com.br');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'contato@liggasst.com.br');
define('SMTP_PASSWORD', 'sua_senha_smtp');
define('SMTP_FROM_EMAIL', 'contato@liggasst.com.br');
define('SMTP_FROM_NAME', 'LiggaSST');

// Configurações de upload
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']);

// Configurações de log
define('LOG_DIR', __DIR__ . '/../logs/');
define('LOG_LEVEL', 'error'); // debug, info, warning, error

// Configurações de cache
define('CACHE_ENABLED', true);
define('CACHE_DIR', __DIR__ . '/../cache/');
define('CACHE_EXPIRY', 3600); // 1 hora em segundos

// Configurações de CORS
define('CORS_ALLOWED_ORIGINS', ['https://liggasst.com.br', 'http://localhost:3000']);
define('CORS_ALLOWED_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
define('CORS_ALLOWED_HEADERS', ['Content-Type', 'Authorization']);
define('CORS_MAX_AGE', 86400); // 24 horas em segundos

// Função para gerar resposta de erro
function apiError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// Função para gerar resposta de sucesso
function apiSuccess($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Função para registrar log
function logMessage($level, $message) {
    if (!in_array($level, ['debug', 'info', 'warning', 'error'])) {
        $level = 'info';
    }
    
    // Verificar se o nível de log está habilitado
    $logLevels = ['debug' => 0, 'info' => 1, 'warning' => 2, 'error' => 3];
    if ($logLevels[$level] < $logLevels[LOG_LEVEL]) {
        return;
    }
    
    // Criar diretório de log se não existir
    if (!is_dir(LOG_DIR)) {
        mkdir(LOG_DIR, 0755, true);
    }
    
    $logFile = LOG_DIR . date('Y-m-d') . '.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// Inicializar configurações
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Configurar manipulador de erros
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    logMessage('error', "$errstr in $errfile on line $errline");
    return true;
});

// Configurar manipulador de exceções
set_exception_handler(function($exception) {
    logMessage('error', $exception->getMessage() . ' in ' . $exception->getFile() . ' on line ' . $exception->getLine());
    apiError('Erro interno do servidor', 500);
});