To jest kompletna, profesjonalna dokumentacja techniczna ("Software Design Document"), przygotowana do bezpośredniego wdrożenia. Dokumentacja uwzględnia architekturę Single Page Application (SPA) w oparciu o Vanilla JS/PHP oraz integrację z modelem Gemini Flash.

---

# Dokumentacja Techniczna Systemu "Radical Candor Matrix AI"

## 1. Przegląd Projektu (Executive Summary)
System diagnozy stylu zarządzania oparty na metodologii "Radical Candor". Aplikacja webowa typu SPA (Single Page Application) działająca jako PWA (Progressive Web App). Umożliwia przeprowadzanie testów, wizualizację wyników na interaktywnej matrycy oraz trening kompetencji miękkich z wykorzystaniem AI (Google Gemini).

**Kluczowe założenia:**
*   **Stos technologiczny:** Czysty PHP (api.php), Czysty JS/HTML/CSS (index.html), MySQL.
*   **Architektura:** Mobile First, SPA, PWA.
*   **Model matematyczny:** Algorytm wektorowy (Skala 1-7).
*   **AI:** Google Gemini Flash (tryb analizy tekstu i role-play).
*   **Prywatność:** Agregacja wyników zespołu widoczna dopiero od 5 respondentów.

---

## 2. Struktura Danych (MySQL Schema)

Do wykonania w `phpMyAdmin` lub przez skrypt SQL.

### Tabela: `clients` (Zamawiający)
Przechowuje konta firm/menedżerów zamawiających badania.
```sql
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `teams` (Zespoły)
Jeden Klient może mieć wiele zespołów (np. Dział IT, Dział Sprzedaży).
```sql
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    access_code VARCHAR(20) UNIQUE NOT NULL, -- Kod dla pracownika (np. "IT-2024")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
```

### Tabela: `users` (Respondenci + Admin)
Tabela płaska. Rozróżnienie ról: 'super_admin' (Ty), 'respondent' (Pracownik).
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NULL, -- NULL dla Super Admina
    role ENUM('super_admin', 'respondent') DEFAULT 'respondent',
    identifier_hash VARCHAR(64) UNIQUE, -- Anonimowy token sesji (cookie)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);
```

### Tabela: `results` (Wyniki Testu)
Przechowuje surowe odpowiedzi (skala 1-7) oraz przeliczone wektory.
```sql
CREATE TABLE results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    -- Pytania 1-12 (Troska: 1-3, Chronienie: 4-6, Atak: 7-9, Manipulacja: 10-12)
    q1 TINYINT, q2 TINYINT, q3 TINYINT,
    q4 TINYINT, q5 TINYINT, q6 TINYINT,
    q7 TINYINT, q8 TINYINT, q9 TINYINT,
    q10 TINYINT, q11 TINYINT, q12 TINYINT,
    -- Współrzędne kartezjańskie
    coord_x FLOAT NOT NULL, -- Oś Szczerości
    coord_y FLOAT NOT NULL, -- Oś Troski
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Tabela: `ai_logs` (Historia Treningów)
```sql
CREATE TABLE ai_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mode ENUM('analysis', 'roleplay') NOT NULL,
    input_text TEXT,
    ai_response TEXT, -- JSON z API
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 3. Specyfikacja Backend (`api.php`)

Plik `api.php` obsługuje wszystkie żądania AJAX. Musi zawierać router typu `switch($_POST['action'])`.

### Zadanie B1: Konfiguracja i Bezpieczeństwo
*   Połączenie z bazą PDO.
*   Obsługa CORS (jeśli potrzebna) i nagłówków JSON.
*   Funkcja `verifyAuth()` sprawdzająca sesję PHP.

### Zadanie B2: Algorytm Obliczeniowy (Matematyka)
Implementacja logiki dla skali 1-7.
*   **Zakres:** Każde pytanie 1-7. Środek neutralny to 4.
*   **Normalizacja:** Od każdego pytania odejmujemy 4 (zakres zmienia się na -3 do +3).
*   **Wzory:**
    *   $S_{RC} = (q1-4) + (q2-4) + (q3-4)$
    *   $S_{RE} = (q4-4) + (q5-4) + (q6-4)$
    *   $S_{OA} = (q7-4) + (q8-4) + (q9-4)$
    *   $S_{MI} = (q10-4) + (q11-4) + (q12-4)$
    *   **Oś Y (Troska):** $(S_{RC} + S_{RE}) - (S_{OA} + S_{MI})$
        *   Min/Max absolutne: Zakres osi $[-36, 36]$.
    *   **Oś X (Szczerość):** $(S_{RC} + S_{OA}) - (S_{RE} + S_{MI})$
        *   Min/Max absolutne: Zakres osi $[-36, 36]$.

### Zadanie B3: Endpointy API
1.  `login_client`: Weryfikacja email/hasło klienta.
2.  `join_team`: Respondent podaje kod, system tworzy user_id w sesji.
3.  `submit_test`: Zapisuje odpowiedzi, oblicza X/Y, zwraca wynik usera.
4.  `get_team_results`:
    *   Pobiera wyniki dla danego `team_id`.
    *   **Logika bezpieczeństwa:** `IF count(results) < 5 THEN return ERROR("Za mało danych")`.
    *   Zwraca anonimową tablicę punktów `[{x, y}, {x, y}...]`.
5.  `admin_get_all`: (Dla Ciebie) Zwraca pełne drzewo Klient -> Zespół -> Wyniki bez limitów.

### Zadanie B4: Integracja AI (Gemini Flash)
Funkcja `callGeminiAPI($prompt, $history = [])`.
*   **Tryb 1 (Analiza):** Prompt systemowy: *"Jesteś ekspertem Radical Candor. Przeanalizuj podany feedback. Oceń Troskę i Szczerość. Jeśli jest zły, napisz go na nowo."*
*   **Tryb 2 (Role-Play):** Utrzymywanie kontekstu czatu (tablica historii wiadomości).
*   **Tryb 3 (Raport Zespołu):** Pobiera wszystkie wyniki zespołu (np. "3 osoby w agresji, 5 w empatii") i wysyła do Gemini: *"Na podstawie tych statystyk przygotuj raport psychologiczny dla managera z rekomendacjami."*

---

## 4. Specyfikacja Frontend (`index.html`)

Architektura SPA. Całość w jednym pliku, sekcje ukrywane przez CSS.

### Zadanie F1: Struktura HTML i Routing
*   Kontenery `<section id="view_login">`, `<section id="view_test">`, `<section id="view_dashboard">`, etc.
*   JS Router: funkcja `navigateTo(viewId)` zmieniająca klasę `active`.
*   **Mobile First:** Flexbox/Grid, duże przyciski dotykowe.

### Zadanie F2: Formularz Testu
*   12 pytań wyświetlanych jedno pod drugim lub w sliderze (dla mobile lepiej 1 pytanie na ekran).
*   Slider (suwak) 1-7 z opisami skrajnymi (np. "Nigdy" - "Zawsze").

### Zadanie F3: Wizualizacja (Chart.js)
*   **Wykres:** Scatter Plot.
*   **Tło:** Obrazek matrycy (ćwiartki).
*   **Logika renderowania:**
    *   User widzi 2 punkty: "TY" (czerwony X) i "Średnia Zespołu" (niebieska kropka).
    *   Manager widzi chmurę punktów (heatmapę) wszystkich pracowników.
*   **Skalowanie:** Przeliczenie zakresu $[-36, 36]$ na współrzędne canvas $[0, 100]$.

### Zadanie F4: Moduł AI UI
*   **Zakładka "Trening Feedbacku":** Textarea na wpisanie sytuacji -> Przycisk "Analizuj" -> Wyświetlenie odpowiedzi AI (krytyka + poprawiona wersja).
*   **Zakładka "Symulacja (Role-Play)":** Interfejs czatu (dymki wiadomości). Użytkownik pisze, AI odpisuje jako "Trudny pracownik".

### Zadanie F5: Dashboard Managera
*   Lista jego zespołów.
*   Status: "Liczba wypełnionych ankiet: 3/10" (z info: "Wyniki dostępne od 5").
*   Przycisk: "Generuj Raport AI Zespołu" (dostępny po przekroczeniu progu).

### Zadanie F6: PWA (Service Worker)
*   Manifest.json (w osadzonym tagu `<link>` data URI lub oddzielnym pliku, jeśli serwer pozwala).
*   Meta tagi `viewport`, `theme-color`.

---

## 5. Plan Realizacji (Krok po Kroku)

### Faza 1: Fundamenty (Backend)
1.  Utworzenie bazy danych MySQL wg schematu.
2.  Stworzenie pustego `api.php`.
3.  Implementacja logowania i rejestracji zespołów (Backend).

### Faza 2: Logika Biznesowa
4.  Oprogramowanie algorytmu wektorowego w PHP (Zadanie B2).
5.  Stworzenie formularza HTML (pytania z PDF) i podpięcie wysyłania do API.
6.  Testowanie poprawności obliczeń (czy skrajne odpowiedzi dają skrajne wyniki na wykresie).

### Faza 3: Wizualizacja i Dashboardy
7.  Integracja Chart.js w `index.html`.
8.  Implementacja widoku Managera (blokada < 5 osób).
9.  Implementacja widoku Super Admina (dostęp do wszystkiego).

### Faza 4: Inteligencja (AI)
10. Podpięcie API Gemini w PHP.
11. Stworzenie interfejsu Treningu i Role-Play w HTML.
12. Oprogramowanie generowania raportu zespołowego.

### Faza 5: UX/UI Polish
13. Stylowanie CSS (nowoczesny, czysty look, mobile-first).
14. Optymalizacja PWA.

---

## Przykładowy Prompt dla Raportu Zespołowego (System Prompt)

> "Jesteś konsultantem biznesowym specjalizującym się w Radical Candor. Otrzymasz dane statystyczne zespołu.
> Dane: [Liczba osób w Ruinous Empathy: X, w Obnoxious Aggression: Y, itd., Średnia zespołu: X=..., Y=...].
> Zadanie:
> 1. Zdiagnozuj główny problem kultury tego zespołu.
> 2. Opisz zagrożenia biznesowe wynikające z tego rozkładu.
> 3. Podaj 3 konkretne ćwiczenia dla tego zespołu.
> Styl: Merytoryczny, bezpośredni, psychologiczny."

Czy ta specyfikacja jest wystarczająco szczegółowa dla Twojego procesu developmentu, czy dodać przykłady kodu dla konkretnych modułów?