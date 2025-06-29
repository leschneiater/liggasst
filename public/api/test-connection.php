<?php
// Test database connection
header('Content-Type: application/json');

// Database connection parameters
$host = 'localhost';
$db   = 'ligga0200980_sst';
$user = 'ligga0200980';
$pass = 'eY4;aYN+Et6o82';
$charset = 'utf8mb4';

// Connect to database
try {
    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Test query
    $stmt = $pdo->query("SELECT 1 AS test");
    $result = $stmt->fetch();
    
    // Check if _test table exists
    $stmt = $pdo->query("SHOW TABLES LIKE '_test'");
    $testTableExists = $stmt->rowCount() > 0;
    
    // Create _test table if it doesn't exist
    if (!$testTableExists) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `_test` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        
        // Insert a test record
        $pdo->exec("INSERT INTO `_test` VALUES ()");
    }
    
    // Get database info
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get MySQL version
    $stmt = $pdo->query("SELECT VERSION() as version");
    $version = $stmt->fetch()['version'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Database connection successful',
        'database' => [
            'name' => $db,
            'tables_count' => count($tables),
            'tables' => $tables,
            'version' => $version
        ]
    ]);
} catch (\PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => $e->getMessage()
    ]);
}