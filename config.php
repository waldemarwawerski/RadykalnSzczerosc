<?php

// Database Configuration
define('DB_HOST', 'mariadb118.server233752.nazwa.pl');
define('DB_NAME', 'server233752_RadykalnaSzczerosc');
define('DB_USER', 'server233752_RadykalnaSzczerosc');
define('DB_PASS', 'Winter1970');

// Gemini API Configuration
define('GEMINI_API_KEY', 'AIzaSyDVgFvlYL9d4xkEHWwe2bSmLHw9xXoNMWc');
define('GEMINI_API_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/');

// App Configuration
define('APP_DEBUG', true); // Set to false in production

// Error Reporting
if (APP_DEBUG) {
    ini_set('display_errors', 0); // Changed to 0 to prevent HTML breaking JSON
    ini_set('log_errors', 1);
    ini_set('display_startup_errors', 0);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}

// Start Session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
