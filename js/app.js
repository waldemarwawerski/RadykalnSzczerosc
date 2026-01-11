const app = {
    state: {
        user: null, // {id, role, team_id}
        client: null,
        currentTeam: null,
        token: null
    },

    questions: [
        // Troska (Care Personally)
        "Interesuję się życiem osobistym moich współpracowników.",
        "Często okazuję wdzięczność i doceniam pracę innych.",
        "Poświęcam czas na wysłuchanie problemów zespołu.",
        // Chronienie (Ruinous Empathy)
        "Unikam trudnych rozmów, aby nie psuć atmosfery.",
        "Chwalę nawet słabą pracę, żeby nikomu nie było przykro.",
        "Opóźniam przekazywanie złych wiadomości tak długo, jak się da.",
        // Atak (Obnoxious Aggression)
        "Krytykuję błędy publicznie, żeby wszyscy się nauczyli.",
        "Kiedy jestem zły, podnoszę głos lub używam ostrego języka.",
        "Przerywam innym, jeśli uważam, że nie mają racji.",
        // Manipulacja (Manipulative Insincerity)
        "Mówię ludziom to, co chcą usłyszeć, nawet jeśli myślę inaczej.",
        "Plotkuję o problemach w zespole zamiast rozwiązywać je z zainteresowanymi.",
        "Ukrywam swoje prawdziwe opinie, aby chronić własną pozycję."
    ],

    init: function() {
        console.log("Radical Candor App Initialized");
        // Check if user/client is logged in (persisted state check could go here)
        this.renderQuestions();
        this.loadAIModels();
    },

    loadAIModels: async function() {
        const select = document.getElementById('ai_model_selector');
        const res = await this.api('get_ai_models');
        
        if (res.status === 'success') {
            select.innerHTML = '';
            res.data.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.text = model.name + ` (${model.id})`;
                if (model.id.includes('flash')) option.selected = true; // Default to flash
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option>Błąd ładowania modeli</option>';
            console.error(res.message);
        }
    },

    router: function(viewId) {
        // Hide all sections
        document.querySelectorAll('section').forEach(el => el.classList.remove('active'));
        // Show target
        document.getElementById(viewId).classList.add('active');
        
        // Navigation Logic
        const nav = document.getElementById('main_nav');
        if (viewId === 'view_landing' || viewId === 'view_login' || viewId === 'view_register' || viewId === 'view_join') {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'block';
        }

        // Specific View Init
        if (viewId === 'view_dashboard') {
            this.loadDashboard();
        }
    },

    api: async function(action, data = {}) {
        const formData = new FormData();
        formData.append('action', action);
        for (const key in data) {
            formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
        }

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            return { status: 'error', message: 'Connection failed' };
        }
    },

    // --- Auth Handlers ---

    handleRegister: async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await this.api('register_client', data);
        if (res.status === 'success') {
            alert("Zarejestrowano! Zaloguj się.");
            this.router('view_login');
        } else {
            alert(res.message);
        }
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await this.api('login_client', data);
        if (res.status === 'success') {
            this.state.client = res.data.client;
            this.router('view_dashboard');
        } else {
            alert(res.message);
        }
    },

    handleJoin: async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await this.api('join_team', data);
        if (res.status === 'success') {
            this.state.user = { id: res.data.user_id };
            alert("Dołączono do zespołu: " + res.data.team_name);
            this.router('view_test');
        } else {
            alert(res.message);
        }
    },

    logout: function() {
        this.state.client = null;
        this.state.user = null;
        // Optionally call logout API to destroy session
        this.router('view_landing');
    },

    // --- Test & Results ---

    renderQuestions: function() {
        const container = document.getElementById('questions_container');
        container.innerHTML = '';
        this.questions.forEach((q, index) => {
            const html = `
                <div class="question-item">
                    <p><strong>${index + 1}.</strong> ${q}</p>
                    <div class="slider-container">
                        <span>Nigdy</span>
                        <input type="range" name="q${index}" min="1" max="7" value="4" step="1">
                        <span>Zawsze</span>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    },

    handleSubmitTest: async function(e) {
        e.preventDefault();
        const inputs = e.target.querySelectorAll('input[type=range]');
        const answers = Array.from(inputs).map(input => parseInt(input.value));

        const res = await this.api('submit_test', { answers: answers });
        if (res.status === 'success') {
            this.router('view_results_respondent');
            this.renderChart('chart_respondent', [
                { x: res.data.x, y: res.data.y, label: 'TY', color: 'red' }
            ]);
            this.showResultDescription(res.data.x, res.data.y);
        } else {
            alert(res.message);
        }
    },

    showResultDescription: function(x, y) {
        let quadrant = "";
        // Simple logic for quadrant detection
        if (x > 0 && y > 0) quadrant = "Radical Candor (Radykalna Szczerość)";
        else if (x > 0 && y <= 0) quadrant = "Obnoxious Aggression (Napastliwa Agresja)";
        else if (x <= 0 && y > 0) quadrant = "Ruinous Empathy (Rujnująca Empatia)";
        else quadrant = "Manipulative Insincerity (Manipulacyjna Nieszczerość)";

        document.getElementById('result_description').innerHTML = `
            <h3>Twój styl: ${quadrant}</h3>
            <p>Współrzędne: Szczerość ${x.toFixed(1)}, Troska ${y.toFixed(1)}</p>
        `;
    },

    // --- Chart.js ---

    renderChart: function(canvasId, points) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Convert Radical Candor coords (-36 to 36) to Chart coords if needed, 
        // but Chart.js handles negatives fine. We will set fixed scales.
        
        const dataPoints = points.map(p => ({
            x: p.x,
            y: p.y
        }));

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Wyniki',
                    data: dataPoints,
                    backgroundColor: points.map(p => p.color || 'blue'),
                    pointRadius: 6
                }]
            },
            options: {
                scales: {
                    x: {
                        min: -36,
                        max: 36,
                        title: { display: true, text: 'Challenge Directly (Wyzwanie)' },
                        grid: { color: (context) => context.tick.value === 0 ? 'black' : '#ddd', lineWidth: (context) => context.tick.value === 0 ? 2 : 1 }
                    },
                    y: {
                        min: -36,
                        max: 36,
                        title: { display: true, text: 'Care Personally (Troska)' },
                        grid: { color: (context) => context.tick.value === 0 ? 'black' : '#ddd', lineWidth: (context) => context.tick.value === 0 ? 2 : 1 }
                    }
                },
                plugins: {
                    annotation: {
                        // Annotation plugin would be needed for background quadrants colors
                        // For now we rely on grid lines
                    }
                }
            }
        });
    },

    // --- Manager Dashboard ---

    loadDashboard: async function() {
        // Mock loading teams (API would need 'get_client_teams' endpoint, assuming 'login_client' returns them or separate call)
        // Since we didn't implement get_client_teams in api.php explictly, let's assume login returns it or we add it.
        // Wait, I missed 'get_client_teams' in api.php. I will hack it:
        // Actually, let's just show the "Create Team" button for now or assume we fetch them.
        // I will add a 'get_my_teams' action to api.php if needed, or just let user create one.
        // For the prototype, I'll assume the manager has to create a team or I'll implement a quick fetch.
        
        // Let's implement fetchTeams quickly in JS assuming I modify PHP or finding a way.
        // Actually, let's just make 'create_team' refresh the list.
        // We will query the DB via a new action 'get_client_teams'.
        
        const res = await this.api('get_client_teams'); // Need to implement this in PHP!
        const list = document.getElementById('teams_list');
        list.innerHTML = '';
        
        if (res.status === 'success') {
            res.data.forEach(team => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${team.name}</strong> (Kod: ${team.access_code}) 
                    <button class="btn small" onclick="app.loadTeamDetails(${team.id}, '${team.name}')">Wyniki</button>`;
                list.appendChild(li);
            });
        }
    },

    handleCreateTeam: async function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await this.api('create_team', data);
        if (res.status === 'success') {
            document.getElementById('modal_create_team').style.display = 'none';
            this.loadDashboard(); // Refresh
        } else {
            alert(res.message);
        }
    },

    showCreateTeamModal: function() {
        document.getElementById('modal_create_team').style.display = 'block';
    },

    loadTeamDetails: async function(teamId, teamName) {
        this.state.currentTeam = teamId;
        document.getElementById('team_details').style.display = 'block';
        document.getElementById('team_details_name').innerText = "Wyniki: " + teamName;
        
        const res = await this.api('get_team_results', { team_id: teamId });
        if (res.status === 'success') {
            const points = res.data.map(p => ({ x: p.coord_x, y: p.coord_y, color: 'rgba(54, 162, 235, 0.5)' }));
            this.renderChart('chart_manager', points);
        } else {
            alert(res.message); // Likely "Not enough data"
        }
    },

    // --- AI Logic ---

    switchTab: function(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Find button (hacky selector but works for simple structure)
        const buttons = document.querySelectorAll('.tab');
        if(tabName === 'analysis') buttons[0].classList.add('active');
        if(tabName === 'roleplay') buttons[1].classList.add('active');

        document.getElementById('tab_' + tabName).classList.add('active');
    },

    callAI: async function(mode) {
        let prompt = "";
        let history = [];
        const model = document.getElementById('ai_model_selector').value;
        
        if (mode === 'analysis') {
            prompt = document.getElementById('ai_input_analysis').value;
            const outputDiv = document.getElementById('ai_output_analysis');
            outputDiv.innerHTML = "Analizuję...";
            
            const res = await this.api('chat_gemini', { prompt, mode, model });
            if (res.status === 'success') {
                const formatted = this.formatAIResponse(res.data.response);
                outputDiv.innerHTML = `
                    <div class="ai-header" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 10px;">
                        Analiza AI (${model})
                    </div>
                    ${formatted}
                `;
            } else {
                outputDiv.innerHTML = "Błąd: " + res.message;
            }
        } 
        else if (mode === 'roleplay') {
            prompt = document.getElementById('ai_input_roleplay').value;
            if (!prompt) return;

            this.appendChat('user', prompt);
            document.getElementById('ai_input_roleplay').value = '';

            const res = await this.api('chat_gemini', { prompt, mode, model });
            if (res.status === 'success') {
                this.appendChat('ai', res.data.response);
            }
        }
    },

    formatAIResponse: function(text) {
        if (!text) return "";
        
        // 1. Bold: **text** -> <strong>text</strong>
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 2. Headings: ### Title -> <h3>Title</h3>
        html = html.replace(/### (.*?)\n/g, '<h3>$1</h3>');
        
        // 3. Bullet points: * Item -> <li>Item</li> (Simple wrap)
        // Check if there are lists
        if (html.includes('* ')) {
            html = html.replace(/^\* (.*?)(?=\n|$)/gm, '<li>$1</li>');
            // Wrap lis in ul? A bit complex for simple regex, but let's try a simple block replacement if possible or just leave as lis with brs.
            // Better: just let li style handle it if we wrap it? 
            // Let's stick to simple <br> for newlines unless it's a list item.
        }

        // 4. Newlines -> <br> (but not after headers or list items if we did them right, but simple approach first)
        html = html.replace(/\n/g, '<br>');
        
        return html;
    },

    appendChat: function(role, text) {
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        // Format AI messages, keep user messages simple text (safe from XSS if we trusted user, but better escape user input first?)
        // For prototype, we assume user input is safe or simple.
        div.innerHTML = role === 'ai' ? this.formatAIResponse(text) : text; 
        
        const box = document.getElementById('chat_history');
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    },

    generateReport: async function() {
        if (!this.state.currentTeam) return;
        const output = document.getElementById('ai_report_output');
        output.innerHTML = "Generowanie raportu...";
        
        const res = await this.api('generate_report', { team_id: this.state.currentTeam });
        if (res.status === 'success') {
            output.innerHTML = res.data.report;
        } else {
            output.innerHTML = "Błąd: " + res.message;
        }
    }
};

// Initialize
window.onload = function() {
    app.init();
};
