const app = {
    state: {
        user: null, // {id, role, team_id}
        client: null,
        currentTeam: null,
        token: null,
        // Survey State
        shuffledQuestions: [],
        currentQuestionIndex: 0,
        userAnswers: Array(12).fill(null) // Initialize with null (no answer)
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

    quadrantDescriptions: {
        'RC': {
            name: 'Radykalna Szczerość',
            desc: 'Działasz w sposób bezpośredni i troskliwy. Twoja komunikacja jest jasna, konstruktywna i oparta na wzajemnym szacunku. Budujesz zaufanie i pomagasz innym się rozwijać, jasno stawiając wymagania i dając rzetelną informację zwrotną.',
            effects: 'Wysoka efektywność zespołu, silne relacje, szybki rozwój, innowacyjność. Ludzie czują się bezpiecznie, mogą popełniać błędy i uczyć się na nich. Budujesz kulturę otwartej komunikacji.'
        },
        'OA': {
            name: 'Napastliwa Agresja',
            desc: 'Jesteś bardzo bezpośredni w komunikacji, ale brakuje Ci troski o uczucia innych. Twoje informacje zwrotne mogą być raniące, krytyczne i demotywujące. Skupiasz się na wynikach, ignorując wpływ Twojego zachowania na ludzi.',
            effects: 'Krótkoterminowe wyniki kosztem morale zespołu, wysoka rotacja, strach, unikanie kontaktu. Ludzie boją się wyrażać swoje zdanie, co prowadzi do ukrywania problemów i braku innowacji.'
        },
        'RE': {
            name: 'Rujnująca Empatia',
            desc: 'Jesteś bardzo troskliwy i unikasz konfrontacji, aby nie ranić uczuć innych. Często powstrzymujesz się od dawania szczerej informacji zwrotnej, nawet gdy jest ona niezbędna do rozwoju. Stawiasz dobre relacje ponad prawdę i efektywność.',
            effects: 'Niska efektywność zespołu, stagnacja, brak rozwoju. Ludzie nie wiedzą, co robią źle, a problemy narastają. Brak zaufania do managera, który nie potrafi podjąć trudnych decyzji.'
        },
        'MI': {
            name: 'Manipulacyjna Nieszczerość',
            desc: 'Brakuje Ci zarówno szczerości, jak i troski. Twoja komunikacja jest niejasna, manipulacyjna i często dwulicowa. Możesz stosować plotki, unikać odpowiedzialności lub działać z ukrytych motywów. Twoje działania są często odbierane jako nieszczere i niegodne zaufania.',
            effects: 'Toksyczna atmosfera w zespole, brak zaufania, intrygi, pasywna agresja. Nikt nie czuje się bezpiecznie, ludzie skupiają się na obronie, a nie na pracy. Całkowity brak efektywności i zniszczone relacje.'
        }
    },

    init: function() {
        console.log("Radical Candor App Initialized");
        this.loadAIModels();
    },

    api: async function(action, data = {}) {
        const formData = new FormData();
        formData.append('action', action);
        for (const key in data) {
            formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
        }

        console.log(`API Call: action=${action}`, data); // Log the API call
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            console.log(`API Response for ${action}:`, result); // Log the API response
            return result;
        } catch (error) {
            console.error("API Error (fetch caught):", error); // More specific error
            return { status: 'error', message: 'Connection failed' };
        }
    },

    router: function(viewId) {
        document.querySelectorAll('section').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        const nav = document.getElementById('main_nav');
        if (viewId === 'view_intro' || viewId === 'view_landing' || viewId === 'view_login' || viewId === 'view_register' || viewId === 'view_join') {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'block';
        }

        if (viewId === 'view_dashboard') {
            this.loadDashboard();
        }
    },

    loadAIModels: async function() {
        const selectRespondent = document.getElementById('ai_model_selector');
        const selectManager = document.getElementById('manager_ai_model_selector');
        
        const res = await this.api('get_ai_models');
        
        if (res.status === 'success') {
            const optionsHTML = res.data.map(model => {
                // Set 'models/gemini-2.5-flash' as default if available
                const isSelected = (model.id === 'models/gemini-2.5-flash') ? 'selected' : ''; 
                return `<option value="${model.id}" ${isSelected}>${model.name} (${model.id})</option>`;
            }).join('');

            selectRespondent.innerHTML = optionsHTML;
            if(selectManager) selectManager.innerHTML = optionsHTML;

        } else {
            const errorHTML = '<option>Błąd ładowania modeli</option>';
            selectRespondent.innerHTML = errorHTML;
            if(selectManager) selectManager.innerHTML = errorHTML;
            console.error(res.message);
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
        const teamName = data.team_name;
        const accessCode = data.access_code;
        
        const res = await this.api('join_team', { team_name: teamName, access_code: accessCode });
        if (res.status === 'success') {
            this.state.user = { id: res.data.user_id };
            alert("Dołączono do zespołu: " + res.data.team_name);
            this.startTest(); // Start test after joining
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

    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    startTest: function() {
        // Reset test state
        const questionIndices = Array.from({ length: this.questions.length }, (_, i) => i);
        this.shuffleArray(questionIndices);
        this.state.shuffledQuestions = questionIndices;
        this.state.currentQuestionIndex = 0;
        this.state.userAnswers = Array(this.questions.length).fill(null); // Reset answers to null
        
        this.router('view_test');
        this.renderQuestion();
    },

    renderQuestion: function() {
        // Remove header title for better mobile focus
        const testTitle = document.getElementById('test_title');
        if(testTitle) testTitle.style.display = 'none';

        const qContainer = document.getElementById('current_question_container');
        const qCounter = document.getElementById('question_counter');
        const progressFill = document.getElementById('progress_fill');
        const prevBtn = document.getElementById('prev_question_btn');
        const nextBtn = document.getElementById('next_question_btn');
        const finishBtn = document.getElementById('finish_test_btn');

        const currentQIndexInShuffled = this.state.currentQuestionIndex;
        const originalQIndex = this.state.shuffledQuestions[currentQIndexInShuffled];
        const questionText = this.questions[originalQIndex];
        const currentAnswer = this.state.userAnswers[originalQIndex];

        const options = [
            { val: 1, text: "Zupełnie się nie zgadzam" },
            { val: 2, text: "Nie zgadzam się" },
            { val: 3, text: "Częściowo się nie zgadzam" },
            { val: 4, text: "Trudno powiedzieć" },
            { val: 5, text: "Częściowo się zgadzam" },
            { val: 6, text: "Zgadzam się" },
            { val: 7, text: "Zupełnie się zgadzam" }
        ];

        let optionsHTML = '<div class="options-container">';
        options.forEach(opt => {
            const isSelected = currentAnswer === opt.val ? 'selected' : '';
            optionsHTML += `
                <div class="option-item ${isSelected}" onclick="app.selectOption(${originalQIndex}, ${opt.val})">
                    <span class="option-val">${opt.val}</span>
                    <span class="option-text">${opt.text}</span>
                </div>
            `;
        });
        optionsHTML += '</div>';

        qContainer.innerHTML = `
            <p>${questionText}</p>
            ${optionsHTML}
        `;
        
        qCounter.innerText = `Pytanie ${currentQIndexInShuffled + 1} z ${this.questions.length}`;
        progressFill.style.width = `${((currentQIndexInShuffled + 1) / this.questions.length) * 100}%`;

        // Navigation logic
        prevBtn.style.display = currentQIndexInShuffled === 0 ? 'none' : 'inline-block';
        
        // Next button: show if not last question, disable if no answer
        if (currentQIndexInShuffled < this.questions.length - 1) {
            nextBtn.style.display = 'inline-block';
            nextBtn.disabled = (currentAnswer === null);
            finishBtn.style.display = 'none';
        } else {
            // Last question
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'inline-block';
            finishBtn.disabled = (currentAnswer === null);
        }
    },

    selectOption: function(qIndex, val) {
        this.state.userAnswers[qIndex] = val;
        this.renderQuestion(); // Update UI to show selection

        // Auto-advance if not the last question
        if (this.state.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 350); // Small delay for visual feedback
        }
    },

    nextQuestion: function() {
        if (this.state.currentQuestionIndex < this.questions.length - 1) {
            this.state.currentQuestionIndex++;
            this.renderQuestion();
        }
    },

    prevQuestion: function() {
        if (this.state.currentQuestionIndex > 0) {
            this.state.currentQuestionIndex--;
            this.renderQuestion();
        }
    },

    preventSubmit: function(e) {
        e.preventDefault();
    },

    handleSubmitTest: async function(e) {
        console.log("handleSubmitTest called!"); // Diagnostic log
        e.preventDefault(); // Prevent default form submission
        
        // Check if all questions are answered
        if (this.state.userAnswers.includes(null)) {
            alert("Proszę odpowiedzieć na wszystkie pytania przed zakończeniem.");
            return;
        }

        console.log("Submitting test with answers:", this.state.userAnswers);
        const res = await this.api('submit_test', { answers: this.state.userAnswers });
        
        console.log("API response for submit_test:", res);
        if (res.status === 'success') {
            this.router('view_results_respondent');
            this.renderChart('chart_respondent', [
                { x: res.data.x, y: res.data.y, label: 'TY', color: 'red' }
            ]);
            this.showResultDescription(res.data.x, res.data.y);
        } else {
            alert("Błąd podczas przesyłania testu: " + res.message);
            console.error("Test submission failed:", res);
        }
    },

    showResultDescription: function(x, y) {
        let quadrantKey = "";
        let generalDescription = "";

        if (x > 0 && y > 0) {
            quadrantKey = 'RC'; // Radical Candor
            generalDescription = "Gratulacje! Twoje wyniki wskazują, że preferujesz styl Radykalnej Szczerości. Jesteś zarówno bezpośredni w komunikacji, jak i troszczysz się o dobro innych. To idealna pozycja do budowania efektywnego i zaufanego zespołu. Pamiętaj, aby konsekwentnie utrzymywać ten styl, reagując na zmieniające się potrzeby zespołu.";
        } else if (x > 0 && y <= 0) {
            quadrantKey = 'OA'; // Obnoxious Aggression
            generalDescription = "Twoje wyniki sugerują, że możesz być odbierany jako agresywny w komunikacji. Jesteś bezpośredni, ale brakuje Ci troski o uczucia innych. Skupiasz się na wynikach, lecz możesz nieświadomie ranić i demotywować. Zastanów się, jak możesz wyrażać swoje oczekiwania, zachowując szacunek i empatię.";
        } else if (x <= 0 && y > 0) {
            quadrantKey = 'RE'; // Ruinous Empathy
            generalDescription = "Wygląda na to, że bardzo troszczysz się o innych, ale możesz unikać trudnych rozmów. To prowadzi do Rujnującej Empatii, gdzie z obawy przed zranieniem nie dajesz szczerej informacji zwrotnej. Pomyśl, jak możesz odnaleźć odwagę, by być bardziej bezpośrednim, jednocześnie zachowując swoją empatię.";
        } else {
            quadrantKey = 'MI'; // Manipulative Insincerity
            generalDescription = "Twoje wyniki wskazują na skłonności do Manipulacyjnej Nieszczerości. Być może unikasz bezpośredniej komunikacji i troski, co może prowadzić do nieufności w zespole. To najmniej efektywny styl zarządzania. Skup się na odbudowaniu zaufania poprzez otwartą i szczerą komunikację, nawet jeśli jest trudna.";
        }

        document.getElementById('result_description_general').innerHTML = generalDescription;
        document.getElementById('current_quadrant_name').innerText = this.quadrantDescriptions[quadrantKey].name;
        document.getElementById('current_quadrant_desc').innerText = this.quadrantDescriptions[quadrantKey].desc;
        document.getElementById('current_quadrant_effects').innerText = this.quadrantDescriptions[quadrantKey].effects;
    },

    // --- Chart.js ---

    renderChart: function(canvasId, points) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        const dataPoints = points.map(p => ({
            x: p.x,
            y: p.y
        }));

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Plugin to draw quadrants background
        const quadrantPlugin = {
            id: 'quadrants',
            beforeDraw: (chart) => {
                const {ctx, chartArea: {top, bottom, left, right, width, height}, scales: {x, y}} = chart;
                const midX = x.getPixelForValue(0);
                const midY = y.getPixelForValue(0);

                ctx.save();

                // 1. Top-Right (X>0, Y>0): Radykalna Szczerość -> Green
                ctx.fillStyle = 'rgba(46, 204, 113, 0.2)'; 
                ctx.fillRect(midX, top, right - midX, midY - top);
                
                // 2. Bottom-Right (X>0, Y<0): Napastliwa Agresja -> Yellow
                ctx.fillStyle = 'rgba(241, 196, 15, 0.2)'; 
                ctx.fillRect(midX, midY, right - midX, bottom - midY);

                // 3. Top-Left (X<0, Y>0): Rujnująca Empatia -> Yellow
                ctx.fillStyle = 'rgba(241, 196, 15, 0.2)'; 
                ctx.fillRect(left, top, midX - left, midY - top);

                // 4. Bottom-Left (X<0, Y<0): Manipulacyjna Nieszczerość -> Red
                ctx.fillStyle = 'rgba(231, 76, 60, 0.2)'; 
                ctx.fillRect(left, midY, midX - left, bottom - midY);

                // Labels logic
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#444'; // Darker text

                // Responsive font and multiline
                const isMobile = width < 500;
                const fontSize = isMobile ? 10 : 12;
                ctx.font = `bold ${fontSize}px Arial`;
                const lineHeight = fontSize + 4;

                const drawLabel = (text, x, y) => {
                    if (isMobile) {
                        const words = text.split(' ');
                        // Draw first word slightly above center, second slightly below
                        ctx.fillText(words[0], x, y - lineHeight/2);
                        if (words[1]) ctx.fillText(words[1], x, y + lineHeight/2);
                    } else {
                        ctx.fillText(text, x, y);
                    }
                };

                // RC Label
                drawLabel('RADYKALNA SZCZEROŚĆ', midX + (right - midX)/2, top + (midY - top)/2);
                
                // OA Label
                drawLabel('NAPASTLIWA AGRESJA', midX + (right - midX)/2, midY + (bottom - midY)/2);

                // RE Label
                drawLabel('RUJNUJĄCA EMPATIA', left + (midX - left)/2, top + (midY - top)/2);

                // MI Label
                drawLabel('MANIPULACYJNA NIESZCZEROŚĆ', left + (midX - left)/2, midY + (bottom - midY)/2);

                ctx.restore();
            }
        };

        this.chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Wyniki',
                    data: dataPoints,
                    backgroundColor: points.map(p => p.color || 'blue'),
                    pointRadius: 8, 
                    pointHoverRadius: 10,
                    borderWidth: 1,
                    borderColor: '#fff' // White border to make point pop
                }]
            },
            plugins: [quadrantPlugin],
            options: {
                maintainAspectRatio: false, // Allow chart to fill container height
                scales: {
                    x: {
                        min: -36,
                        max: 36,
                        title: { display: true, text: 'Challenge Directly (Wyzwanie)' },
                        grid: { color: (context) => context.tick.value === 0 ? '#333' : 'rgba(0,0,0,0.1)', lineWidth: (context) => context.tick.value === 0 ? 2 : 1 }
                    },
                    y: {
                        min: -36,
                        max: 36,
                        title: { display: true, text: 'Care Personally (Troska)' },
                        grid: { color: (context) => context.tick.value === 0 ? '#333' : 'rgba(0,0,0,0.1)', lineWidth: (context) => context.tick.value === 0 ? 2 : 1 }
                    }
                },
                plugins: {
                    legend: { display: false } // Hide legend as quadrants explain it
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
        console.log("showCreateTeamModal called!"); 
        try {
            const modal = document.getElementById('modal_create_team');
            if (modal) {
                console.log("Modal 'modal_create_team' found. Current display:", modal.style.display);
                modal.style.display = 'block';
                console.log("Modal 'modal_create_team' should now be visible. New display:", modal.style.display);
            } else {
                console.error("Error: Modal element 'modal_create_team' not found!");
            }
        } catch (e) {
            console.error("Error showing modal:", e);
        }
    },

    loadTeamDetails: async function(teamId, teamName) {
        console.log("loadTeamDetails called with teamId:", teamId, "teamName:", teamName); // Added diagnostic log
        // Check if teamId and teamName are provided
        if (teamId === undefined || teamName === undefined) {
            console.error("loadTeamDetails: teamId or teamName is undefined.");
            // Potentially route to an error page or show a message
            return;
        }

        this.state.currentTeam = teamId;
        document.getElementById('team_details').style.display = 'block';
        document.getElementById('team_details_name').innerText = "Wyniki: " + teamName;
        
        const res = await this.api('get_team_results', { team_id: teamId });
        if (res.status === 'success') {
            const points = res.data.map(p => ({ x: p.coord_x, y: p.coord_y, color: 'rgba(54, 162, 235, 0.5)' }));
            this.renderChart('chart_manager', points);
            // Store team data for PDF export
            this.state.currentTeamData = {
                id: teamId,
                name: teamName,
                results: res.data // Store raw results for potential AI report generation
            };
        } else {
            alert(res.message); // Likely "Not enough data"
        }
    },

    // --- AI Logic ---

    callAI: async function(mode) {
        let prompt = "";
        const model = document.getElementById('ai_model_selector').value;
        const exportBtn = document.getElementById('btn_export_ai_pdf');
        
        if (mode === 'analysis') {
            prompt = document.getElementById('ai_input_analysis').value;
            const outputDiv = document.getElementById('ai_output_analysis');
            outputDiv.innerHTML = "Analizuję...";
            if(exportBtn) exportBtn.style.display = 'none'; // Hide button during loading
            
            const res = await this.api('chat_gemini', { prompt, mode, model });
            if (res.status === 'success') {
                const formatted = this.formatAIResponse(res.data.response);
                outputDiv.innerHTML = `
                    <div class="ai-header" style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 10px;">
                        Analiza AI (${model})
                    </div>
                    ${formatted}
                `;
                if(exportBtn) exportBtn.style.display = 'inline-block'; // Show button on success
            } else {
                outputDiv.innerHTML = "Błąd: " + res.message;
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

    exportResultsToPdf: function(reportType) {
        let chartImgUrl = '';
        let reportTitle = '';
        let summaryHtml = '';
        let detailsHtml = '';
        let filename = 'raport.pdf';

        // 1. Gather Data
        if (reportType === 'respondent') {
            filename = 'moj_wynik_radical_candor.pdf';
            const sourceElement = document.querySelector('#view_results_respondent');
            const canvas = sourceElement.querySelector('canvas');
            if (canvas) chartImgUrl = canvas.toDataURL('image/png');

            reportTitle = "Twój Wynik Radical Candor Matrix";
            
            const generalDesc = document.getElementById('result_description_general').innerText;
            summaryHtml = `<h3>Podsumowanie:</h3><p>${generalDesc}</p>`;

            const quadName = document.getElementById('current_quadrant_name').innerText;
            const quadDesc = document.getElementById('current_quadrant_desc').innerText;
            const quadEffects = document.getElementById('current_quadrant_effects').innerText;

            detailsHtml = `
                <h3 style="color: #e74c3c; margin-top: 20px;">Twój Styl: ${quadName}</h3>
                <p><strong>Opis:</strong> ${quadDesc}</p>
                <p><strong>Przewidywane Skutki:</strong> ${quadEffects}</p>
            `;

        } else if (reportType === 'manager') {
            if (document.getElementById('team_details').style.display === 'none') {
                alert("Najpierw otwórz szczegóły zespołu.");
                return;
            }
            filename = 'raport_zespolu.pdf';
            const sourceElement = document.getElementById('team_details');
            const canvas = sourceElement.querySelector('canvas');
            if (canvas) chartImgUrl = canvas.toDataURL('image/png');

            reportTitle = document.getElementById('team_details_name').innerText;
            // Add manager specific details if needed here
        } else if (reportType === 'ai_analysis') {
            filename = 'analiza_feedbacku.pdf';
            reportTitle = 'Analiza Feedbacku AI';
            
            const userInput = document.getElementById('ai_input_analysis').value;
            const aiOutput = document.getElementById('ai_output_analysis').innerHTML;

            summaryHtml = `<h3>Twój Feedback:</h3><p style="font-style: italic;">"${userInput}"</p>`;
            detailsHtml = `<h3>Analiza AI:</h3><div style="margin-top:10px;">${aiOutput}</div>`;
            
            // Bypass chart check for this type
            chartImgUrl = 'skip'; 
        }

        if (!chartImgUrl) {
            alert("Błąd: Nie udało się pobrać wykresu.");
            return;
        }

        // 2. Open New Window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Zablokowano wyskakujące okno. Proszę zezwolić na pop-upy.");
            return;
        }

        // 3. Write HTML content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportTitle}</title>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    h1 { text-align: center; color: #2c3e50; margin-bottom: 30px; }
                    h3 { border-bottom: 2px solid #3498db; padding-bottom: 5px; color: #2c3e50; margin-top: 20px; }
                    img { display: block; margin: 0 auto 30px auto; max-width: 600px; width: 100%; }
                    p { margin-bottom: 10px; font-size: 14px; }
                    strong { color: #2c3e50; }
                    .ai-header { font-weight: bold; color: #7f8c8d; margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <h1>${reportTitle}</h1>
                ${chartImgUrl !== 'skip' ? `<img src="${chartImgUrl}" alt="Wykres">` : ''}
                ${summaryHtml}
                ${detailsHtml}
                
                <script>
                    window.onload = function() {
                        const opt = {
                            margin:       10,
                            filename:     '${filename}',
                            image:        { type: 'jpeg', quality: 0.98 },
                            html2canvas:  { scale: 2 },
                            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };
                        
                        // Generate PDF
                        html2pdf().set(opt).from(document.body).save().then(function() {
                            // Optional: Close window after download
                            // window.close(); 
                        });
                    };
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close(); // Necessary for IE >= 10
        printWindow.focus(); // Necessary for IE >= 10
    },

    // Helper to determine quadrant key (duplicated from showResultDescription but needed separately)
    getQuadrant: function(x, y) {
        if (x > 0 && y > 0) return 'RC';
        else if (x > 0 && y <= 0) return 'OA';
        else if (x <= 0 && y > 0) return 'RE';
        else return 'MI';
    }
};

// Initialize
window.onload = function() {
    app.init();
};