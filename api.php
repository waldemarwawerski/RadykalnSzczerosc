<?php
require_once 'config.php';
// require_once 'vendor/autoload.php'; // Dompdf autoloader - COMMENTED OUT TO FIX 500 ERROR

// use Dompdf\Dompdf; // Dompdf class - COMMENTED OUT

header('Content-Type: application/json');

// Helper function for JSON response
function jsonResponse($status, $message, $data = null) {
    echo json_encode(['status' => $status, 'message' => $message, 'data' => $data]);
    exit;
}

// Database Connection
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    jsonResponse('error', 'Database connection failed: ' . $e->getMessage());
}

// Router
$action = $_POST['action'] ?? '';

switch ($action) {
    case 'login_client':
        loginClient($pdo);
        break;
    case 'register_client':
        registerClient($pdo);
        break;
    case 'create_team':
        createTeam($pdo);
        break;
    case 'get_client_teams':
        getClientTeams($pdo);
        break;
    case 'join_team':
        joinTeam($pdo);
        break;
    case 'submit_test':
        submitTest($pdo);
        break;
    case 'get_team_results':
        getTeamResults($pdo);
        break;
    case 'chat_gemini':
        chatGemini($pdo);
        break;
    case 'get_ai_models':
        getAIModels();
        break;
    case 'generate_report':
        generateTeamReport($pdo);
        break;
    case 'export_pdf':
        exportPdf($pdo);
        break;
    default:
        jsonResponse('error', 'Invalid action');
}

// Functions

function exportPdf($pdo) {
    jsonResponse('error', 'PDF export is temporarily disabled due to server configuration issues.');
    /*
    // This function will generate the PDF report for a respondent or team
    // Input: user_id (for respondent) OR team_id (for manager) AND data (x, y coords, descriptions)
    $reportType = $_POST['report_type'] ?? 'respondent'; // 'respondent' or 'manager'
    $userId = $_SESSION['user_id'] ?? null;
    $teamId = $_POST['team_id'] ?? null;
    $userData = json_decode($_POST['user_data'] ?? '[]', true); // User's x,y, etc.
    $teamData = json_decode($_POST['team_data'] ?? '[]', true); // Team's x,y, etc.

    if ($reportType === 'respondent' && (!$userId || empty($userData))) {
        jsonResponse('error', 'Missing respondent data for PDF export.');
    }
    if ($reportType === 'manager' && (!$teamId || empty($teamData))) {
        jsonResponse('error', 'Missing team data for PDF export.');
    }

    $dompdf = new Dompdf();
    $dompdf->setPaper('A4', 'portrait');

    // Here we will generate the HTML content for the PDF
    // For now, a placeholder
    $html = "
        <h1>Raport Radical Candor</h1>
        <p>Typ raportu: " . htmlspecialchars($reportType) . "</p>
    ";

    if ($reportType === 'respondent') {
        $html .= "<h2>Twój Wynik</h2>";
        $html .= "<p>Współrzędne: X=" . htmlspecialchars($userData['x'] ?? 'N/A') . ", Y=" . htmlspecialchars($userData['y'] ?? 'N/A') . "</p>";
        $html .= "<p>Styl: " . htmlspecialchars($userData['quadrant_name'] ?? 'N/A') . "</p>";
        $html .= "<p>Opis: " . htmlspecialchars($userData['quadrant_desc'] ?? 'N/A') . "</p>";
        $html .= "<p>Skutki: " . htmlspecialchars($userData['quadrant_effects'] ?? 'N/A') . "</p>";
    } elseif ($reportType === 'manager') {
        $html .= "<h2>Raport Zespołu</h2>";
        $html .= "<p>ID Zespołu: " . htmlspecialchars($teamId ?? 'N/A') . "</p>";
        $html .= "<p>Średnia zespołu: X=" . htmlspecialchars($teamData['avg_x'] ?? 'N/A') . ", Y=" . htmlspecialchars($teamData['avg_y'] ?? 'N/A') . "</p>";
        // Include manager AI report if available
        $html .= "<p>Raport AI: " . htmlspecialchars($teamData['ai_report'] ?? 'N/A') . "</p>";
    }


    $dompdf->loadHtml($html);
    $dompdf->render();
    
    // Output PDF to the browser
    $dompdf->stream("raport_radical_candor_" . $reportType . ".pdf", ["Attachment" => false]);
    exit;
    */
}

function registerClient($pdo) {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $companyName = $_POST['company_name'] ?? '';

    if (!$email || !$password) {
        jsonResponse('error', 'Email and password required');
    }

    $hash = password_hash($password, PASSWORD_ARGON2ID);

    try {
        $stmt = $pdo->prepare("INSERT INTO clients (company_name, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$companyName, $email, $hash]);
        jsonResponse('success', 'Client registered');
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse('error', 'Email already exists');
        }
        jsonResponse('error', 'Registration failed');
    }
}

function loginClient($pdo) {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM clients WHERE email = ?");
    $stmt->execute([$email]);
    $client = $stmt->fetch();

    if ($client && password_verify($password, $client['password_hash'])) {
        $_SESSION['client_id'] = $client['id'];
        jsonResponse('success', 'Logged in', ['client' => $client]);
    } else {
        jsonResponse('error', 'Invalid credentials');
    }
}

function createTeam($pdo) {
    if (!isset($_SESSION['client_id'])) {
        jsonResponse('error', 'Unauthorized');
    }

    $name = $_POST['name'] ?? '';
    $code = $_POST['access_code'] ?? '';

    if (!$name || !$code) {
        jsonResponse('error', 'Name and code required');
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO teams (client_id, name, access_code) VALUES (?, ?, ?)");
        $stmt->execute([$_SESSION['client_id'], $name, $code]);
        jsonResponse('success', 'Team created');
    } catch (PDOException $e) {
         if ($e->getCode() == 23000) {
            jsonResponse('error', 'Access code already exists');
        }
        jsonResponse('error', 'Failed to create team');
    }
}

function getClientTeams($pdo) {
    if (!isset($_SESSION['client_id'])) {
        jsonResponse('error', 'Unauthorized');
    }
    
    $stmt = $pdo->prepare("SELECT id, name, access_code, created_at FROM teams WHERE client_id = ? ORDER BY created_at DESC");
    $stmt->execute([$_SESSION['client_id']]);
    $teams = $stmt->fetchAll();
    
    jsonResponse('success', 'Teams retrieved', $teams);
}

function joinTeam($pdo) {
    $teamName = $_POST['team_name'] ?? '';
    $code = $_POST['access_code'] ?? '';

    if (!$teamName || !$code) {
        jsonResponse('error', 'Nazwa zespołu i kod dostępu są wymagane.');
    }

    $stmt = $pdo->prepare("SELECT * FROM teams WHERE name = ? AND access_code = ?");
    $stmt->execute([$teamName, $code]);
    $team = $stmt->fetch();

    if (!$team) {
        jsonResponse('error', 'Nieprawidłowa nazwa zespołu lub kod dostępu.');
    }

    // Create a new respondent user
    $identifier = bin2hex(random_bytes(32));
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (team_id, role, identifier_hash) VALUES (?, 'respondent', ?)");
        $stmt->execute([$team['id'], $identifier]);
        
        $userId = $pdo->lastInsertId();
        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = 'respondent';
        
        jsonResponse('success', 'Joined team', ['user_id' => $userId, 'team_name' => $team['name']]);
    } catch (Exception $e) {
        jsonResponse('error', 'Failed to join team');
    }
}

function submitTest($pdo) {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse('error', 'Unauthorized');
    }

    $answers = $_POST['answers'] ?? []; 
    // Decode JSON string if received as string (from FormData)
    if (is_string($answers)) {
        $answers = json_decode($answers, true);
    }
    
    if (!is_array($answers) || count($answers) !== 12) {
        jsonResponse('error', 'Invalid answers count');
    }

    // Validate inputs (1-7)
    foreach ($answers as $a) {
        if ($a < 1 || $a > 7) jsonResponse('error', 'Invalid answer value');
    }

    // Math Logic
    // S_RC (1-3), S_RE (4-6), S_OA (7-9), S_MI (10-12)
    // Normalization: value - 4
    
    $s_rc = ($answers[0]-4) + ($answers[1]-4) + ($answers[2]-4);
    $s_re = ($answers[3]-4) + ($answers[4]-4) + ($answers[5]-4);
    $s_oa = ($answers[6]-4) + ($answers[7]-4) + ($answers[8]-4);
    $s_mi = ($answers[9]-4) + ($answers[10]-4) + ($answers[11]-4);

    // Y (Care): (S_RC + S_RE) - (S_OA + S_MI)
    $y = ($s_rc + $s_re) - ($s_oa + $s_mi);

    // X (Candor): (S_RC + S_OA) - (S_RE + S_MI)
    $x = ($s_rc + $s_oa) - ($s_re + $s_mi);

    try {
        $sql = "INSERT INTO results (user_id, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12, coord_x, coord_y) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $params = array_merge([$_SESSION['user_id']], $answers, [$x, $y]);
        $stmt->execute($params);

        jsonResponse('success', 'Test submitted', ['x' => $x, 'y' => $y]);
    } catch (Exception $e) {
        jsonResponse('error', 'Database error: ' . $e->getMessage());
    }
}

function getTeamResults($pdo) {
    if (!isset($_SESSION['client_id'])) {
        jsonResponse('error', 'Unauthorized');
    }
    
    $teamId = $_POST['team_id'] ?? 0;
    
    // Check ownership
    $stmt = $pdo->prepare("SELECT id FROM teams WHERE id = ? AND client_id = ?");
    $stmt->execute([$teamId, $_SESSION['client_id']]);
    if (!$stmt->fetch()) {
        jsonResponse('error', 'Team not found or access denied');
    }

    // Count results
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM results r JOIN users u ON r.user_id = u.id WHERE u.team_id = ?");
    $stmt->execute([$teamId]);
    $count = $stmt->fetchColumn();

    if ($count < 5) {
        jsonResponse('error', 'Not enough data (min 5)', ['count' => $count]);
    }

    // Fetch anonymized results
    $stmt = $pdo->prepare("SELECT r.coord_x, r.coord_y FROM results r JOIN users u ON r.user_id = u.id WHERE u.team_id = ?");
    $stmt->execute([$teamId]);
    $results = $stmt->fetchAll();

    jsonResponse('success', 'Data retrieved', $results);
}

function chatGemini($pdo) {
    $prompt = $_POST['prompt'] ?? '';
    $history = $_POST['history'] ?? []; 
    $mode = $_POST['mode'] ?? 'analysis';
    $model = $_POST['model'] ?? 'models/gemini-2.5-flash'; // Default to full name

    if (!$prompt) jsonResponse('error', 'Prompt required');

    $systemPrompt = "";
    if ($mode === 'analysis') {
        $systemPrompt = "Jesteś ekspertem metodyki Radykalna Szczerość (Radical Candor). Przeanalizuj podany feedback. Oceń poziom Troski o Ludzi (Care Personally) i Bezpośredniej Szczerości (Challenge Directly). Jeśli feedback jest słaby (np. agresywny lub zbyt miękki), zaproponuj lepszą wersję zgodnie z zasadami Radykalnej Szczerości.";
    } elseif ($mode === 'roleplay') {
        $systemPrompt = "Jesteś trudnym pracownikiem w symulacji role-play. Użytkownik to Twój manager, który próbuje dać Ci feedback. Odpowiadaj krótko, realistycznie, czasem defensywnie, ale reaguj na dobre zastosowanie Radykalnej Szczerości.";
    }

    $finalPrompt = $systemPrompt . "\n\nKontekst/Wiadomość użytkownika: " . $prompt;
    
    // Call Gemini with selected model
    $response = callGeminiAPI($finalPrompt, $model);
    
    // Log interaction
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare("INSERT INTO ai_logs (user_id, mode, input_text, ai_response) VALUES (?, ?, ?, ?)");
        $stmt->execute([$_SESSION['user_id'], $mode, $prompt, $response]);
    }

    jsonResponse('success', 'AI response', ['response' => $response]);
}

function generateTeamReport($pdo) {
    if (!isset($_SESSION['client_id'])) {
        jsonResponse('error', 'Unauthorized');
    }
    
    $teamId = $_POST['team_id'] ?? 0;
    $model = $_POST['model'] ?? 'models/gemini-2.5-flash'; // Get model from frontend
    
    // Verify ownership
    $stmt = $pdo->prepare("SELECT id FROM teams WHERE id = ? AND client_id = ?");
    $stmt->execute([$teamId, $_SESSION['client_id']]);
    if (!$stmt->fetch()) {
        jsonResponse('error', 'Team not found');
    }

    // Get Data
    $stmt = $pdo->prepare("SELECT r.coord_x, r.coord_y FROM results r JOIN users u ON r.user_id = u.id WHERE u.team_id = ?");
    $stmt->execute([$teamId]);
    $results = $stmt->fetchAll();

    if (count($results) < 5) {
        jsonResponse('error', 'Too few results to generate report (min 5)');
    }

    // Analyze Statistics
    $stats = [
        'count' => count($results),
        'RC' => 0, // Radical Candor
        'OA' => 0, // Obnoxious Aggression
        'RE' => 0, // Ruinous Empathy
        'MI' => 0, // Manipulative Insincerity
        'avg_x' => 0,
        'avg_y' => 0
    ];

    $sum_x = 0; $sum_y = 0;

    foreach ($results as $r) {
        $x = $r['coord_x'];
        $y = $r['coord_y'];
        $sum_x += $x;
        $sum_y += $y;

        if ($x > 0 && $y > 0) $stats['RC']++;
        elseif ($x > 0 && $y <= 0) $stats['OA']++;
        elseif ($x <= 0 && $y > 0) $stats['RE']++;
        else $stats['MI']++;
    }

    $stats['avg_x'] = $sum_x / $stats['count'];
    $stats['avg_y'] = $sum_y / $stats['count'];

    // Construct Prompt
    $prompt = "Jesteś konsultantem biznesowym specjalizującym się w metodologii Radykalna Szczerość (Radical Candor). 
    Przygotuj raport dla managera na podstawie poniższych statystyk zespołu:
    - Liczba osób: {$stats['count']}
    - Radykalna Szczerość (Troska i Szczerość): {$stats['RC']} osób
    - Napastliwa Agresja (Agresja): {$stats['OA']} osób
    - Rujnująca Empatia (Zbyt duża empatia, brak szczerości): {$stats['RE']} osób
    - Manipulacyjna Nieszczerość (Brak szczerości i troski): {$stats['MI']} osób
    - Średnia zespołu: Oś Szczerości (Bezpośrednia Szczerość) = {$stats['avg_x']}, Oś Troski (Troska o Ludzi) = {$stats['avg_y']}.
    (Zakres osi to od -36 do +36).

    Zadanie:
    1. Zdiagnozuj główny problem kultury tego zespołu.
    2. Opisz zagrożenia biznesowe wynikające z tego rozkładu.
    3. Podaj 3 konkretne ćwiczenia lub działania naprawcze dla tego zespołu.
    
    Styl: Merytoryczny, bezpośredni, psychologiczny.";

    // Call AI with selected model
    $aiReport = callGeminiAPI($prompt, $model);

    jsonResponse('success', 'Report generated', ['report' => $aiReport]);
}

function getAIModels() {
    $apiKey = GEMINI_API_KEY;
    $url = "https://generativelanguage.googleapis.com/v1beta/models?key=" . $apiKey;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
    
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        jsonResponse('error', 'cURL Error fetching models: ' . curl_error($ch));
    }
    curl_close($ch);

    $json = json_decode($response, true);
    if (!isset($json['models'])) {
        jsonResponse('error', 'Failed to fetch models list', $json);
    }

    $availableModels = [];
    foreach ($json['models'] as $model) {
        if (strpos($model['name'], 'gemini') !== false && 
            in_array("generateContent", $model['supportedGenerationMethods'] ?? [])) {
            
            // Use full name as ID (e.g., 'models/gemini-2.5-flash')
            $id = $model['name'];
            
            $availableModels[] = [
                'id' => $id,
                'name' => $model['displayName'] ?? $id
            ];
        }
    }

    jsonResponse('success', 'Models retrieved', $availableModels);
}

function callGeminiAPI($text, $model = 'models/gemini-2.5-flash') {
    $apiKey = GEMINI_API_KEY;
    // Construct dynamic URL based on model selection
    // URL structure: BASE_URL + model_name + :generateContent
    $url = GEMINI_API_BASE_URL . $model . ":generateContent?key=" . $apiKey;

    $data = [
        "contents" => [
            [
                "parts" => [
                    ["text" => $text]
                ]
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    // Disable SSL verification for local dev/hosting compatibility if certificates are missing
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        return "cURL Error: " . $error_msg;
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        return "API Error (HTTP $httpCode): " . $response;
    }

    $json = json_decode($response, true);
    return $json['candidates'][0]['content']['parts'][0]['text'] ?? "No response text found in JSON.";
}
?>