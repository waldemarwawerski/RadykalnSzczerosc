<?php
require_once 'config.php';

$apiKey = GEMINI_API_KEY;
// Using the base URL from config which should be .../v1beta/
$url = GEMINI_API_BASE_URL . "models?key=" . $apiKey;

echo "<h1>Diagnostyka Modeli Gemini</h1>";
echo "<p>Pobieranie listy modeli z: <code>$url</code></p>";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); 
$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "<p style='color:red'>cURL Error: " . curl_error($ch) . "</p>";
} else {
    $json = json_decode($response, true);
    if (isset($json['models'])) {
        echo "<h2>Dostępne modele:</h2><ul>";
        foreach ($json['models'] as $model) {
            echo "<li><strong>" . $model['name'] . "</strong><br>";
            echo "Metody: " . implode(", ", $model['supportedGenerationMethods'] ?? []) . "</li>";
        }
        echo "</ul>";
    } else {
        echo "<h2>Błąd API:</h2>";
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
    }
}
curl_close($ch);
?>
