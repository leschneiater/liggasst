<?php
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
    echo "Connected to database successfully.\n";
} catch (\PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// Get all tables except system tables
$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

// Start transaction
$pdo->beginTransaction();

try {
    // Disable foreign key checks temporarily
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    
    // Drop each table
    $droppedCount = 0;
    foreach ($tables as $table) {
        // Skip system tables
        if (strpos($table, 'mysql_') === 0 || 
            strpos($table, 'information_schema') === 0 || 
            strpos($table, 'performance_schema') === 0 ||
            strpos($table, 'sys') === 0) {
            continue;
        }
        
        $pdo->exec("DROP TABLE IF EXISTS `$table`");
        echo "Dropped table: $table\n";
        $droppedCount++;
    }
    
    // Re-enable foreign key checks
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    
    // Commit transaction
    $pdo->commit();
    
    echo "Successfully dropped $droppedCount tables.\n";
    echo "Database cleaned successfully while keeping MySQL installed.\n";
} catch (\PDOException $e) {
    // Rollback transaction on error
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}