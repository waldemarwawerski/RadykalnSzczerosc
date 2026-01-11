<?php
require_once 'config.php';

echo "Attempting to connect to database at " . DB_HOST . "...\n";

try {
    // Connect
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Connected successfully.\n";
    echo "Reading SQL file...\n";

    $sqlFile = __DIR__ . '/sql/database.sql';
    if (!file_exists($sqlFile)) {
        die("Error: SQL file not found at $sqlFile\n");
    }

    $sql = file_get_contents($sqlFile);

    // Execute SQL
    // Note: PDO can execute multiple statements in one go if emulation is on (default true)
    echo "Executing SQL queries...\n";
    $pdo->exec($sql);

    echo "Database setup completed successfully! Tables created.\n";

} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
    echo "Check your credentials in config.php.\n";
}

