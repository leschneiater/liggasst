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

// Start transaction
$pdo->beginTransaction();

try {
    // Create users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `email` VARCHAR(255) NOT NULL UNIQUE,
        `password` VARCHAR(255) NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `user_type` ENUM('professional', 'company', 'admin') NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: users\n";

    // Create professionals table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `professionals` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `cpf` VARCHAR(14) UNIQUE,
        `phone` VARCHAR(20),
        `zip_code` VARCHAR(10),
        `city` VARCHAR(100),
        `state` VARCHAR(2),
        `address` TEXT,
        `formation` VARCHAR(255),
        `specialization` TEXT,
        `experience` INT,
        `registration` VARCHAR(50),
        `service_radius` INT,
        `hourly_rate` DECIMAL(10,2),
        `availability` TEXT,
        `description` TEXT,
        `verified` BOOLEAN DEFAULT FALSE,
        `specializations` TEXT,
        `rating` DECIMAL(3,2) DEFAULT 0,
        `total_ratings` INT DEFAULT 0,
        `total_contracts` INT DEFAULT 0,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: professionals\n";

    // Create companies table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `companies` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `cnpj` VARCHAR(18) UNIQUE,
        `phone` VARCHAR(20),
        `zip_code` VARCHAR(10),
        `city` VARCHAR(100),
        `state` VARCHAR(2),
        `address` TEXT,
        `segment` VARCHAR(100),
        `employees_count` VARCHAR(50),
        `responsible_name` VARCHAR(255),
        `responsible_position` VARCHAR(100),
        `responsible_email` VARCHAR(255),
        `responsible_phone` VARCHAR(20),
        `description` TEXT,
        `needs` TEXT,
        `verified` BOOLEAN DEFAULT FALSE,
        `rating` DECIMAL(3,2) DEFAULT 0,
        `total_ratings` INT DEFAULT 0,
        `total_contracts` INT DEFAULT 0,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: companies\n";

    // Create certificates table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `certificates` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `professional_id` INT NOT NULL,
        `name` VARCHAR(255) NOT NULL,
        `type` VARCHAR(100) NOT NULL,
        `upload_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `expiry_date` DATE,
        `status` ENUM('approved', 'pending', 'rejected') DEFAULT 'pending',
        `file_url` VARCHAR(255),
        `notes` TEXT,
        FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: certificates\n";

    // Create contracts table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `contracts` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `professional_id` INT,
        `company_id` INT,
        `service` VARCHAR(255) NOT NULL,
        `amount` DECIMAL(10,2) NOT NULL,
        `start_date` DATE NOT NULL,
        `end_date` DATE NOT NULL,
        `status` ENUM('pending', 'active', 'completed', 'canceled') DEFAULT 'pending',
        `progress` INT DEFAULT 0,
        `description` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: contracts\n";

    // Create messages table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `messages` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `sender_id` INT,
        `receiver_id` INT,
        `content` TEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `read` BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: messages\n";

    // Create demands table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `demands` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `company_id` INT NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `description` TEXT NOT NULL,
        `service_type` VARCHAR(100) NOT NULL,
        `deadline` DATE,
        `budget` DECIMAL(10,2),
        `budget_type` ENUM('fixed', 'hourly', 'negotiable'),
        `location` VARCHAR(100),
        `state` VARCHAR(2),
        `modality` ENUM('in-person', 'remote', 'hybrid'),
        `urgency` ENUM('low', 'medium', 'high'),
        `requirements` TEXT,
        `status` ENUM('active', 'closed', 'expired') DEFAULT 'active',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: demands\n";

    // Create reviews table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `reviews` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `contract_id` INT,
        `reviewer_id` INT,
        `reviewed_id` INT,
        `rating` INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        `comment` TEXT,
        `service` VARCHAR(255),
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`reviewed_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: reviews\n";

    // Create subscription_plans table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `subscription_plans` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `description` TEXT,
        `price_monthly` DECIMAL(10,2) NOT NULL,
        `price_yearly` DECIMAL(10,2) NOT NULL,
        `features` JSON,
        `user_type` ENUM('professional', 'company') NOT NULL,
        `is_active` BOOLEAN DEFAULT TRUE,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: subscription_plans\n";

    // Create user_subscriptions table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `user_subscriptions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `plan_id` INT,
        `status` ENUM('active', 'canceled', 'expired') DEFAULT 'active',
        `billing_cycle` ENUM('monthly', 'yearly') DEFAULT 'monthly',
        `start_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `end_date` TIMESTAMP NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: user_subscriptions\n";

    // Create test table for connection testing
    $pdo->exec("CREATE TABLE IF NOT EXISTS `_test` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Created table: _test\n";

    // Insert sample data into subscription_plans
    $pdo->exec("INSERT INTO `subscription_plans` 
        (`name`, `description`, `price_monthly`, `price_yearly`, `features`, `user_type`) VALUES
        ('Gratuito', 'Plano básico para profissionais', 0, 0, '{\"features\": [\"Cadastro de perfil básico\", \"Até 3 certificados\", \"Receber até 5 contatos/mês\", \"Suporte por e-mail\", \"Acesso a biblioteca básica\"]}', 'professional'),
        ('Profissional', 'Plano completo para profissionais', 49, 490, '{\"features\": [\"Perfil completo com destaque\", \"Certificados ilimitados\", \"Contatos ilimitados\", \"Selo de verificado\", \"Relatórios detalhados\", \"Biblioteca completa SST\", \"Suporte prioritário\", \"Ferramentas de gestão\"]}', 'professional'),
        ('Premium', 'Plano premium para profissionais', 99, 990, '{\"features\": [\"Todos os recursos do Profissional\", \"Posição prioritária nas buscas\", \"Análise de performance\", \"Calendário integrado\", \"API para integrações\", \"Treinamentos exclusivos\", \"Consultoria personalizada\"]}', 'professional'),
        ('Starter', 'Plano básico para empresas', 0, 0, '{\"features\": [\"Cadastro da empresa\", \"Busca por profissionais\", \"Até 3 contatos/mês\", \"Perfil básico da empresa\", \"Suporte por e-mail\"]}', 'company'),
        ('Business', 'Plano completo para empresas', 149, 1490, '{\"features\": [\"Contatos ilimitados\", \"Relatórios completos\", \"Gestão de múltiplos projetos\", \"Integração com sistemas\", \"Suporte prioritário\", \"Perfil premium da empresa\", \"Análise de fornecedores\"]}', 'company'),
        ('Enterprise', 'Plano personalizado para empresas', 999, 9990, '{\"features\": [\"Todos os recursos do Business\", \"API dedicada\", \"Gestor de conta dedicado\", \"Treinamentos personalizados\", \"Integrações customizadas\", \"SLA garantido\", \"Consultoria estratégica\"]}', 'company')");
    echo "Inserted sample subscription plans\n";

    // Insert a test record
    $pdo->exec("INSERT INTO `_test` VALUES ()");
    echo "Inserted test record\n";

    // Commit transaction
    $pdo->commit();
    
    echo "Basic tables created successfully.\n";
} catch (\PDOException $e) {
    // Rollback transaction on error
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}