<?php
// Configuração de conexão com o banco de dados
$host = 'localhost';
$db   = 'ligga0200980_sst';
$user = 'ligga0200980';
$pass = 'eY4;aYN+Et6o82';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

// Função para executar consultas SQL
function query($sql, $params = []) {
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

// Função para obter um único registro
function fetchOne($sql, $params = []) {
    $stmt = query($sql, $params);
    return $stmt->fetch();
}

// Função para obter múltiplos registros
function fetchAll($sql, $params = []) {
    $stmt = query($sql, $params);
    return $stmt->fetchAll();
}

// Função para inserir dados
function insert($table, $data) {
    global $pdo;
    
    $keys = array_keys($data);
    $fields = implode(', ', $keys);
    $placeholders = implode(', ', array_fill(0, count($keys), '?'));
    
    $sql = "INSERT INTO $table ($fields) VALUES ($placeholders)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_values($data));
    
    return $pdo->lastInsertId();
}

// Função para atualizar dados
function update($table, $data, $where, $whereParams = []) {
    global $pdo;
    
    $sets = [];
    foreach (array_keys($data) as $key) {
        $sets[] = "$key = ?";
    }
    
    $sql = "UPDATE $table SET " . implode(', ', $sets) . " WHERE $where";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge(array_values($data), $whereParams));
    
    return $stmt->rowCount();
}

// Função para excluir dados
function delete($table, $where, $params = []) {
    global $pdo;
    
    $sql = "DELETE FROM $table WHERE $where";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->rowCount();
}