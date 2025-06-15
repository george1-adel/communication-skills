let currentQuestions = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let username = '';
let selectedChapter = null;
let isFullCurriculum = false;
let pendingQuestionCount = null;
let timerInterval = null;
let timerSeconds = 0;

// إضافة متغيرات جديدة لتتبع حالة الاختبار
let quizState = {
    currentQuestions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    selectedChapter: null,
    questionCount: 0,
    isQuizInProgress: false
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showQuestionCountPage() {
    showPage('question-count-page');
}

function selectFullCurriculum() {
    selectedChapter = null;
    isFullCurriculum = true;
    quizState.selectedChapter = null;
    showPage('question-count-page');
}

function selectChapter(chapter) {
    selectedChapter = chapter;
    isFullCurriculum = false;
    quizState.selectedChapter = chapter;
    console.log('تم اختيار الفصل:', chapter);
    console.log('عدد الأسئلة الكلي:', window.questions.length);
    // إصلاح: تجاهل العناصر غير المعرفة أو التي لا تحتوي على خاصية chapter
    const filtered = window.questions.filter(q => q && typeof q.chapter !== 'undefined' && Number(q.chapter) === Number(chapter));
    console.log('عدد أسئلة الفصل المختار:', filtered.length);
    showPage('question-count-page');
}

// دالة لحفظ حالة الاختبار
function saveQuizProgress() {
    const progress = {
        currentQuestions: quizState.currentQuestions,
        userAnswers: quizState.userAnswers,
        currentQuestionIndex: quizState.currentQuestionIndex,
        selectedChapter: quizState.selectedChapter,
        questionCount: quizState.questionCount,
        isQuizInProgress: quizState.isQuizInProgress,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('quiz-progress', JSON.stringify(progress));
}

// دالة لتحميل حالة الاختبار
function loadQuizProgress() {
    const savedProgress = localStorage.getItem('quiz-progress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        // التحقق من أن البيانات المحفوظة حديثة (أقل من 24 ساعة)
        const now = new Date().getTime();
        if (now - progress.timestamp < 24 * 60 * 60 * 1000) {
            quizState = progress;
            return true;
        } else {
            // حذف البيانات القديمة
            localStorage.removeItem('quiz-progress');
        }
    }
    return false;
}

// تعديل دالة startQuiz
function startQuiz(questionCount) {
    let filteredQuestions = window.questions;
    if (isFullCurriculum) {
        filteredQuestions = window.questions.filter(q => q && typeof q.chapter !== 'undefined');
    } else if (selectedChapter) {
        // إصلاح: تجاهل العناصر غير المعرفة أو التي لا تحتوي على خاصية chapter
        filteredQuestions = window.questions.filter(q => q && typeof q.chapter !== 'undefined' && Number(q.chapter) === Number(selectedChapter));
    }

    // تحقق من صحة الأسئلة قبل البدء
    const validationErrors = validateQuestions(filteredQuestions);
    if (validationErrors.length > 0) {
        showSystemModal('يوجد خطأ في بيانات الأسئلة:\n' + validationErrors.join('\n'));
        return;
    }

    quizState.currentQuestions = [...filteredQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, questionCount);
    if (quizState.currentQuestions.length === 0) {
        showSystemModal('لا توجد أسئلة متاحة للفصل المختار. يرجى اختيار فصل آخر.');
        return;
    }
    quizState.userAnswers = new Array(quizState.currentQuestions.length).fill(null);
    quizState.currentQuestionIndex = 0;
    quizState.selectedChapter = selectedChapter;
    quizState.questionCount = questionCount;
    quizState.isQuizInProgress = true;
    saveQuizProgress();
    showPage('quiz-page');
    // المؤقت
    if (window.quizWithTimer) {
        // نصف دقيقة لكل سؤال بدلاً من دقيقة كاملة
        timerSeconds = Math.ceil(questionCount * 30);
        startTimer();
    } else {
        stopTimer();
        updateTimerDisplay();
    }
    displayQuestion();
}

function startTimer() {
    stopTimer();
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
            stopTimer();
            showSystemModal('انتهى الوقت! سيتم تسليم الامتحان تلقائياً.');
            setTimeout(() => submitQuiz(), 1500);
        }
    }, 1000);
    document.getElementById('timer').style.display = 'inline-block';
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    document.getElementById('timer').style.display = 'none';
}

function updateTimerDisplay() {
    const timerDiv = document.getElementById('timer');
    if (!window.quizWithTimer) {
        timerDiv.style.display = 'none';
        timerDiv.textContent = '';
        return;
    }
    timerDiv.style.display = 'inline-block';
    const min = Math.floor(timerSeconds / 60);
    const sec = timerSeconds % 60;
    timerDiv.textContent = `الوقت المتبقي: ${min}:${sec.toString().padStart(2, '0')}`;
}

function displayQuestion(showWarning = false) {
    const question = quizState.currentQuestions[quizState.currentQuestionIndex];
    document.getElementById('question-number').textContent = `سؤال ${quizState.currentQuestionIndex + 1} من ${quizState.currentQuestions.length}`;
    document.getElementById('question-text').textContent = question.question;
    
    const answersContainer = document.getElementById('answers-container');
    answersContainer.innerHTML = '';
    
    question.answers.forEach((answer, index) => {
        const answerElement = document.createElement('div');
        answerElement.className = 'answer-option';
        if (quizState.userAnswers[quizState.currentQuestionIndex] === index) {
            answerElement.classList.add('selected');
        }
        answerElement.textContent = answer;
        answerElement.onclick = () => selectAnswer(index);
        answersContainer.appendChild(answerElement);
    });

    // تمييز السؤال إذا لم يتم الإجابة عليه فقط عند الحاجة
    const questionContainer = document.getElementById('question-container');
    let warning = document.getElementById('unanswered-warning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'unanswered-warning';
        warning.style.color = 'red';
        warning.style.marginTop = '10px';
        questionContainer.appendChild(warning);
    }
    if (showWarning && quizState.userAnswers[quizState.currentQuestionIndex] === null) {
        questionContainer.style.border = '2px solid #dc3545';
        warning.textContent = 'لم تقم بالإجابة على هذا السؤال!';
    } else {
        questionContainer.style.border = '';
        warning.textContent = '';
    }

    // التحكم في ظهور الأزرار
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    prevBtn.style.display = quizState.currentQuestionIndex === 0 ? 'none' : 'inline-block';
    nextBtn.style.display = quizState.currentQuestionIndex === quizState.currentQuestions.length - 1 ? 'none' : 'inline-block';
    submitBtn.style.display = quizState.currentQuestionIndex === quizState.currentQuestions.length - 1 ? 'inline-block' : 'none';

    // تحديث شريط التقدم
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    const progress = ((quizState.currentQuestionIndex + 1) / quizState.currentQuestions.length) * 100;
    if (progressBarFill) progressBarFill.style.width = progress + '%';
    if (progressText) progressText.textContent = `سؤال ${quizState.currentQuestionIndex + 1} من ${quizState.currentQuestions.length}`;
}

// تعديل دالة selectAnswer
function selectAnswer(answerIndex) {
    // إذا كان المستخدم لم يجب بعد على هذا السؤال
    if (quizState.userAnswers[quizState.currentQuestionIndex] === null) {
        quizState.userAnswers[quizState.currentQuestionIndex] = answerIndex;
        // تحقق من صحة الإجابة
        const question = quizState.currentQuestions[quizState.currentQuestionIndex];
        const userAnswer = question.answers ? question.answers[answerIndex] : answerIndex;
        if (question.correctAnswer === userAnswer) {
            // أضف نقطة واحفظها في localStorage
            let points = Number(localStorage.getItem('quizPoints')) || 0;
            points += 1;
            localStorage.setItem('quizPoints', points.toString());
        }
    } else {
        // إذا كان المستخدم عدل إجابته، لا تضف نقاط إضافية
        quizState.userAnswers[quizState.currentQuestionIndex] = answerIndex;
    }
    saveQuizProgress(); // حفظ التقدم بعد كل إجابة
    displayQuestion();
}

// تعديل دالة nextQuestion
function nextQuestion() {
    if (quizState.userAnswers[quizState.currentQuestionIndex] === null) {
        displayQuestion(true);
        return;
    }
    if (quizState.currentQuestionIndex < quizState.currentQuestions.length - 1) {
        quizState.currentQuestionIndex++;
        saveQuizProgress(); // حفظ التقدم عند الانتقال للسؤال التالي
        displayQuestion();
    }
}

// تعديل دالة prevQuestion
function prevQuestion() {
    if (quizState.currentQuestionIndex > 0) {
        quizState.currentQuestionIndex--;
        saveQuizProgress(); // حفظ التقدم عند العودة للسؤال السابق
        displayQuestion();
    }
}

// تعريف رتب النقاط (نفس مصفوفة ranks في points-levels.html)
const ranks = [
    { name: 'فراش كافيه', points: 0, icon: '☕', class: 'rank-bronze' },
    { name: 'بتاع محاضرات', points: 50, icon: '📚', class: 'rank-bronze' },
    { name: 'بتاع شيتات', points: 100, icon: '📝', class: 'rank-bronze' },
    { name: 'بتاع سكاشن', points: 175, icon: '🧑‍🏫', class: 'rank-silver' },
    { name: 'دحيح', points: 250, icon: '🧠', class: 'rank-gold' },
    { name: 'صاحب الدكتور', points: 325, icon: '🤝', class: 'rank-platinum' },
    { name: 'بتاع مشاريع', points: 400, icon: '💻', class: 'rank-platinum' },
    { name: 'أسطورة الامتحانات', points: 450, icon: '🏆', class: 'rank-diamond' },
    { name: 'عميد الدفعة', points: 475, icon: '🎓', class: 'rank-master' },
    { name: 'البرنس الجامعي', points: 500, icon: '🦁', class: 'rank-legend' }
];

function getCurrentRank(points) {
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (points >= ranks[i].points) {
            return { current: ranks[i], next: ranks[i + 1] || null };
        }
    }
    return { current: ranks[0], next: ranks[1] };
}

// نافذة الترقية الاحتفالية
function showRankUpModal(newRank) {
    let modal = document.getElementById('rankup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rankup-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.55)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg,#fffbe6 60%,#ffe0e9 100%); border-radius: 32px; box-shadow: 0 8px 40px #0002; padding: 2.5rem 2.2rem 2.2rem 2.2rem; text-align: center; min-width: 320px; max-width: 90vw; position: relative; animation: rankUp 0.8s cubic-bezier(.7,-0.2,.3,1.4);">
                <span style='position:absolute;top:18px;right:22px;font-size:1.7rem;cursor:pointer;' id='close-rankup-modal'>&times;</span>
                <div style="font-size:3.5rem; margin-bottom: 0.7rem;">🎉</div>
                <div style="font-size:2.1rem; font-weight:900; color:#ff6b6b; margin-bottom:0.5rem;">مبروك الترقية!</div>
                <div style="font-size:1.3rem; color:#333; margin-bottom:1.2rem;">وصلت إلى الرتبة الجديدة:</div>
                <div style="font-size:2.3rem; font-weight:900; color:#764ba2; margin-bottom:0.7rem; display:flex;align-items:center;justify-content:center;gap:0.7rem;">
                    <span style="font-size:2.5rem;">${newRank.icon}</span>
                    <span>${newRank.name}</span>
                </div>
                <div style="font-size:1.1rem; color:#888; margin-bottom:1.5rem;">عدد النقاط: <b>${newRank.points}</b></div>
                <button id='close-rankup-btn' style="background:linear-gradient(45deg,#ff6b6b,#feca57);color:white;border:none;padding:12px 35px;border-radius:25px;font-size:1.1rem;font-weight:700;cursor:pointer;box-shadow:0 4px 15px #0002;transition:all 0.3s;">حسناً</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.querySelector('span#close-rankup-modal').onclick = null;
        modal.querySelector('button#close-rankup-btn').onclick = null;
        modal.style.display = 'flex';
        modal.querySelector('span#close-rankup-modal').style.display = '';
        modal.querySelector('button#close-rankup-btn').style.display = '';
        modal.querySelector('div[style*="font-size:2.3rem"] span:last-child').textContent = newRank.name;
        modal.querySelector('div[style*="font-size:2.3rem"] span:first-child').textContent = newRank.icon;
        modal.querySelector('div[style*="font-size:1.1rem"] b').textContent = newRank.points;
    }
    // إغلاق النافذة
    modal.querySelector('span#close-rankup-modal').onclick = () => { modal.style.display = 'none'; };
    modal.querySelector('button#close-rankup-btn').onclick = () => { modal.style.display = 'none'; };
    // إغلاق عند الضغط خارج النافذة
    modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
}

// تعديل دالة submitQuiz
async function submitQuiz() {
    stopTimer();
    // تحقق من الإجابة على السؤال الأخير
    if (quizState.userAnswers[quizState.currentQuestionIndex] === null) {
        displayQuestion(true);
        return;
    }
    // تحقق من الإجابات كلها
    const unanswered = quizState.userAnswers.findIndex(ans => ans === null);
    if (unanswered !== -1) {
        quizState.currentQuestionIndex = unanswered;
        displayQuestion(true);
        showSystemModal('لازم تجاوب على كل الأسئلة قبل ما تسلم الامتحان!');
        return;
    }


    // حفظ الأسئلة المجاب عليها في localStorage
    let solvedArr = JSON.parse(localStorage.getItem('solvedQuestions') || '[]');
    let correctArr = JSON.parse(localStorage.getItem('correctQuestions') || '[]');
    quizState.currentQuestions.forEach((q, idx) => {
        if (!solvedArr.includes(q.question)) {
            solvedArr.push(q.question);
        }
        if (quizState.userAnswers[idx] === q.correctAnswer && !correctArr.includes(q.question)) {
            correctArr.push(q.question);
        }
    });
    localStorage.setItem('solvedQuestions', JSON.stringify(solvedArr));
    localStorage.setItem('correctQuestions', JSON.stringify(correctArr));

    // حفظ الأسئلة المغلوطة في localStorage بعد كل اختبار
    if (window.saveWrongQuestions) {
        window.saveWrongQuestions(quizState.currentQuestions, quizState.userAnswers);
    } else if (typeof saveWrongQuestions === 'function') {
        saveWrongQuestions(quizState.currentQuestions, quizState.userAnswers);
    }

    // حساب النقاط النهائية (عدد الإجابات الصحيحة)
    const score = quizState.userAnswers.reduce((total, answer, index) => {
        return total + (answer === quizState.currentQuestions[index].correctAnswer ? 1 : 0);
    }, 0);

    // منطق الترقية: احسب الرتبة قبل وبعد إضافة النقاط
    let oldPoints = Number(localStorage.getItem('quizPoints')) || 0;
    let newPoints = oldPoints + score;
    let oldRank = getCurrentRank(oldPoints).current;
    let newRank = getCurrentRank(newPoints).current;

    // إضافة النقاط إلى رصيد النقاط في صفحة المكافآت
    localStorage.setItem('quizPoints', newPoints.toString());

    document.getElementById('score').textContent = score;
    document.getElementById('total-questions').textContent = quizState.currentQuestions.length;

    // بعد عرض النتيجة بثانية واحدة، أظهر نافذة النقاط المكتسبة
    setTimeout(() => {
        showEarnedPointsModal(score);
        // إذا تمت الترقية، أظهر نافذة الترقية بعد نافذة النقاط المكتسبة
        if (newRank.name !== oldRank.name) {
            setTimeout(() => {
                showRankUpModal(newRank);
            }, 1200); // بعد إغلاق نافذة النقاط المكتسبة أو بعد ثانية تقريباً
        }
    }, 1000);
// نافذة النقاط المكتسبة بعد الامتحان
function showEarnedPointsModal(earnedPoints) {
    const modal = document.getElementById('earned-points-modal');
    const valueSpan = document.getElementById('earned-points-value');
    const bar = document.getElementById('earned-points-bar');
    valueSpan.textContent = earnedPoints;
    bar.style.width = '0%';
    modal.style.display = 'flex';
    // تحريك الشريط من 0 إلى نسبة النقاط المكتسبة (من عدد أسئلة الامتحان الحالي)
    let percent = 0;
    let max = quizState.currentQuestions.length;
    if (max < 1) max = 1;
    percent = Math.round((earnedPoints / max) * 100);
    setTimeout(() => {
        bar.style.width = percent + '%';
    }, 100); // تأخير بسيط لجمالية الحركة

    // إصلاح إغلاق النافذة عند الضغط على "حسناً" أو ×
    const closeBtn = document.getElementById('close-earned-points-btn');
    const closeX = document.getElementById('close-earned-points-modal');
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (closeX) closeX.onclick = () => { modal.style.display = 'none'; };
}

    // إضافة الرسالة الفكاهية
    const funnyMessage = getFunnyMessage(score, quizState.currentQuestions.length);
    const messageElement = document.createElement('div');
    messageElement.style.color = '#ff9800';
    messageElement.style.fontSize = '1.2rem';
    messageElement.style.marginTop = '1rem';
    messageElement.textContent = funnyMessage;

    const resultsDiv = document.querySelector('#results-page');
    resultsDiv.appendChild(messageElement);

    // حذف التقدم المحفوظ بعد إنهاء الاختبار
    localStorage.removeItem('quiz-progress');
    quizState.isQuizInProgress = false;

    showPage('results-page');
    // إرسال النتيجة إلى الباك-إند
    try {
        await fetch('/api/submit-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, score })
        });
    } catch (e) {
        // يمكن عرض رسالة خطأ إذا أردت
    }
}

function submitUsername() {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (!name) {
        input.style.border = '2px solid #dc3545';
        input.placeholder = 'اكتب اسمك يا نجم!';
        return;
    }
    input.style.border = '';
    username = name;
    localStorage.setItem('quiz-username', username);
    // تحديث جملة اختيار الفصل باسم المستخدم
    const chapterTitle = document.getElementById('chapter-select-title');
    if (chapterTitle) {
        chapterTitle.textContent = `اختار الفصل أو المنهج يا ${username}`;
    }
    showPage('chapter-select-page');
}

// تعديل window.onload
window.onload = function() {
    const saved = localStorage.getItem('quiz-username');
    if (saved) {
        username = saved;
        // تحديث جملة اختيار الفصل باسم المستخدم
        const chapterTitle = document.getElementById('chapter-select-title');
        if (chapterTitle) {
            chapterTitle.textContent = `اختار الفصل أو المنهج يا ${username}`;
        }
        // التحقق من وجود اختبار محفوظ
        if (loadQuizProgress()) {
            showSystemConfirm(
                'يوجد اختبار غير مكتمل. هل تريد استكماله؟',
                function() { // OK
                    showPage('quiz-page');
                    displayQuestion();
                },
                function() { // Cancel
                    localStorage.removeItem('quiz-progress');
                    showPage('welcome-page');
                }
            );
            return;
        }
        showPage('welcome-page');
    } else {
        showPage('welcome-page');
    }

    // Centralized question loading and deduplication
    // Ensure window.questions is initialized
    if (typeof window.questions === 'undefined') {
        window.questions = [];
    }

    // Concatenate questions from all chapters
    if (typeof window.chapter2Questions !== 'undefined') {
        window.questions = window.questions.concat(window.chapter2Questions);
    }
    if (typeof window.chapter3Questions !== 'undefined') {
        window.questions = window.questions.concat(window.chapter3Questions);
    }
    if (typeof window.chapter4Questions !== 'undefined') {
        window.questions = window.questions.concat(window.chapter4Questions);
    }
    if (typeof window.chapter5Questions !== 'undefined') {
        window.questions = window.questions.concat(window.chapter5Questions);
    }
    // Add other chapters as needed

    // Apply global deduplication after all questions are loaded
    window.questions = window.questions.filter(
        (q, idx, arr) => arr.findIndex(x => x.question === q.question && x.chapter === q.chapter) === idx
    );

    // Existing DOMContentLoaded content that should be implicitly part of window.onload:
    // (This part was moved here from an earlier DOMContentLoaded listener to ensure it's within the main onload flow)
    // The checkTermsAgreement function should be defined elsewhere or handled here.
    // If checkTermsAgreement is part of another DOMContentLoaded, this might create issues.
    // For now, assuming checkTermsAgreement is globally available or defined earlier.

    if (!checkTermsAgreement()) {
        console.log('Terms not agreed, stopping further execution');
        return; // Stop further execution if terms not agreed
    }
    console.log('Terms agreed, continuing with page load');
    updateUserBar();
    createParticles();
    fillQuizButtons();

    // ... any other functions that should be part of window.onload ...
}; // Correct closing brace for window.onload function

async function showLeaderboardPage() {
    showSystemModal('الميزة قيد التطوير 🚧');
    // إذا أردت لاحقاً تفعيل الجدول، أزل السطر أعلاه وأعد الكود القديم
}

function getFunnyMessage(score, total) {
    const low = [
        'شد حيلك يا معلم، الامتحان قرب! 😅',
        'ركز شوية، لسه في أمل! 💪',
        'لسه في وقت تتعلم، متزعلش! 😉',
        'إنت أكيد كنت بتلعب في الامتحان؟ 😂',
        'النتيجة دي مش بتاعتك، جرب تاني! 🤔',
        'الورقة كانت مقلوبة ولا إيه؟ 👀',
        'واضح إنك كنت جعان وانت بتحل! 🍔',
        'الامتحان كان صعب ولا انت اللي كنت نايم؟ 😴',
        'المرة الجاية هتعملها، متقلقش! 🔄',
        'قول يا رب! 🙏',
        'المدرس هيقولك: حاول تذاكر أكتر! 📚',
        'حاسس إنك كنت بتجاوب عشوائي؟ 🎲',
        'أكيد كان في قطة بتلعب جنبك! 🐱',
        'النتيجة دي مش نهاية العالم! 🌍',
        'جرب تشرب شاي قبل الامتحان الجاي! 🍵'
    ];

    const mid = [
        'عاش يا بطل، بس لسه في شوية حاجات! 👏',
        'كويس، بس ممكن أحسن من كده! 😎',
        'نص الطريق يا نجم، كمل! 🚀',
        'قربت تقفل، شوية تركيز! 🔥',
        'مستواك حلو، بس عايزين نشوفك في الصدارة! 🏆',
        'لسه في كام سؤال كانوا محتاجين تركيز! 🤓',
        'انت على الطريق الصح، كمل! 💫',
        'المرة الجاية هتقفل، متقلقش! 🌟',
        'مستواك حلو، بس في حاجات محتاجة مراجعة! 📝',
        'قربت على القمة، شد حيلك! ⭐'
    ];

    const high = [
        'إيه يا معلم! قربت تقفل! 😍',
        'فاضلك سؤال ولا اتنين وتبقى ابن اللعيبة! 💯',
        'مفيش غيرك في الحتة! 👑',
        'مستواك جامد، قربت على القمة! 🥇',
        'الامتحان مش قادر عليك! 🎯',
        'انت بطل بجد! 🏅',
        'مستواك عالي، كمل كده! 🌟',
        'انت من الطراز الأول! 🎖️',
        'مفيش حد يقدر عليك! 💪',
        'انت بطل بمعنى الكلمة! 🏆'
    ];

    const perfect = [
        'إيه يا معلم! انت ابن اللعيبة! 🎯',
        'مفيش حد يقدر عليك! 👑',
        'انت بطل بمعنى الكلمة! 🏆',
        'مستواك فوق الممتاز! 🌟',
        'انت من الطراز الأول! 🎖️',
        'مفيش غيرك في الحتة! 💯',
        'انت بطل بجد! 🏅',
        'مستواك عالي جداً! ⭐',
        'انت من الطراز الأول! 🥇',
        'مفيش حد يقدر عليك! 💪'
    ];

    const percentage = (score / total) * 100;
    let messages;
    
    if (percentage < 50) {
        messages = low;
    } else if (percentage < 75) {
        messages = mid;
    } else if (percentage < 100) {
        messages = high;
    } else {
        messages = perfect;
    }

    return messages[Math.floor(Math.random() * messages.length)];
}

function showReviewPage() {
    showPage('review-page');
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = '';

    quizState.currentQuestions.forEach((question, index) => {
        const userAnswer = quizState.userAnswers[index];
        const isAnswered = userAnswer !== null && userAnswer !== undefined;
        const isCorrect = isAnswered && userAnswer === question.correctAnswer;

        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        const questionHeader = document.createElement('div');
        questionHeader.style.display = 'flex';
        questionHeader.style.justifyContent = 'space-between';
        questionHeader.style.alignItems = 'center';
        questionHeader.style.marginBottom = '10px';

        const questionNumber = document.createElement('h3');
        questionNumber.style.margin = '0';
        questionNumber.textContent = `سؤال ${index + 1}: ${question.question}`;
        questionHeader.appendChild(questionNumber);

        // إضافة زر اسأل ال AI
        const askAIButton = document.createElement('button');
        askAIButton.textContent = 'اسأل ال AI';
        askAIButton.className = 'ask-ai-btn';
        askAIButton.style.backgroundColor = '#007bff';
        askAIButton.style.color = 'white';
        askAIButton.style.border = 'none';
        askAIButton.style.padding = '8px 15px';
        askAIButton.style.borderRadius = '5px';
        askAIButton.style.cursor = 'pointer';
        askAIButton.style.marginRight = '10px';
        askAIButton.onclick = function() {
            // فتح نافذة الشات
            const chatModal = document.getElementById('chat-modal');
            chatModal.style.display = 'flex';
            
            // إرسال السؤال مع طلب الشرح
            const questionText = `السؤال: ${question.question}\n\nالخيارات:\n${question.answers.map((ans, i) => `${i + 1}. ${ans}`).join('\n')}\n\nالإجابة الصحيحة: ${question.answers[question.correctAnswer]}\n\nاشرح لي سبب الإجابة بالتفصيل`;
            document.getElementById('chat-input').value = questionText;
            // محاكاة الضغط على زر الإرسال
            document.getElementById('send-chat-btn').click();
        };
        questionHeader.appendChild(askAIButton);

        reviewItem.appendChild(questionHeader);

        const userAnswerDiv = document.createElement('div');
        userAnswerDiv.className = 'user-answer';

        if (isAnswered) {
            userAnswerDiv.textContent = `إجابتك: ${question.answers[userAnswer]}`;
            userAnswerDiv.style.color = isCorrect ? '#28a745' : '#dc3545';
            reviewItem.appendChild(userAnswerDiv);
        } else {
            userAnswerDiv.textContent = 'لم تجب عليها';
            userAnswerDiv.style.color = '#dc3545';
            reviewItem.appendChild(userAnswerDiv);
        }

        // عرض الإجابة الصحيحة إذا كانت الإجابة خاطئة أو لم يجب
        if (!isCorrect) {
            const correctAnswerDiv = document.createElement('div');
            correctAnswerDiv.className = 'correct-answer';
            correctAnswerDiv.textContent = `الإجابة الصحيحة: ${question.answers[question.correctAnswer]}`;
            reviewItem.appendChild(correctAnswerDiv);
        }

        // إضافة الشرح إذا كان موجوداً
        if (question.explanation) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation';
            explanationDiv.style.backgroundColor = '#f8f9fa';
            explanationDiv.style.padding = '10px';
            explanationDiv.style.marginTop = '10px';
            explanationDiv.style.borderRadius = '5px';
            explanationDiv.style.border = '1px solid #dee2e6';
            explanationDiv.innerHTML = `<strong>الشرح:</strong> ${question.explanation}`;
            reviewItem.appendChild(explanationDiv);
        }

        reviewContainer.appendChild(reviewItem);
    });

    // إضافة زر نسخ المراجعة
    const copyButton = document.getElementById('copy-review-btn');
    copyButton.onclick = function() {
        const reviewText = Array.from(reviewContainer.children)
            .map(item => {
                const question = item.querySelector('h3').textContent;
                const userAnswer = item.querySelector('.user-answer').textContent;
                const correctAnswer = item.querySelector('.correct-answer')?.textContent || '';
                const explanation = item.querySelector('.explanation')?.textContent || '';
                return `${question}\n${userAnswer}\n${correctAnswer}\n${explanation}\n`;
            })
            .join('\n');
        
        navigator.clipboard.writeText(reviewText)
            .then(() => {
                const successMsg = document.createElement('div');
                successMsg.textContent = 'تم نسخ المراجعة!';
                successMsg.style.color = 'green';
                successMsg.style.marginTop = '10px';
                copyButton.parentNode.insertBefore(successMsg, copyButton.nextSibling);
                setTimeout(() => successMsg.remove(), 2000);
            })
            .catch(err => {
                console.error('فشل نسخ النص:', err);
                alert('حدث خطأ أثناء نسخ المراجعة');
            });
    };
}

// معالجة جميع النوافذ
window.addEventListener('DOMContentLoaded', function() {
    // معالجة نافذة التأكيد
    const submitBtn = document.getElementById('submit-btn');
    const submitModal = document.getElementById('submit-modal');
    const confirmSubmitBtn = document.getElementById('confirm-submit-btn');
    const cancelSubmitBtn = document.getElementById('cancel-submit-btn');

    if (submitBtn && submitModal) {
        submitBtn.onclick = function() {
            submitModal.style.display = 'flex';
        };
    }

    if (confirmSubmitBtn && submitModal) {
        confirmSubmitBtn.onclick = function() {
            submitModal.style.display = 'none';
            submitQuiz();
        };
    }

    if (cancelSubmitBtn && submitModal) {
        cancelSubmitBtn.onclick = function() {
            submitModal.style.display = 'none';
        };
    }

    // معالجة نافذة الأسئلة المجاب عليها
    const solvedBtn = document.getElementById('solved-btn');
    const solvedModal = document.getElementById('solved-modal');
    const closeSolvedModal = document.getElementById('close-solved-modal');
    const solvedModalCount = document.getElementById('solved-modal-count');

    if (solvedBtn && solvedModal) {
        solvedBtn.onclick = function() {
            const solvedArr = JSON.parse(localStorage.getItem('solvedQuestions') || '[]');
            const correctArr = JSON.parse(localStorage.getItem('correctQuestions') || '[]');
            solvedModalCount.innerHTML = `عدد الأسئلة التي أجبت عليها: <b>${solvedArr.length}</b><br>عدد الأسئلة التي أجبت عليها صح: <b style='color:#28a745'>${correctArr.length}</b>`;
            solvedModal.style.display = 'flex';
        };
    }

    if (closeSolvedModal && solvedModal) {
        closeSolvedModal.onclick = () => solvedModal.style.display = 'none';
    }

    // معالجة نافذة البريد
    const infoBtn = document.getElementById('info-btn');
    const emailModal = document.getElementById('email-modal');
    const closeEmailModal = document.getElementById('close-email-modal');
    const copyEmailBtn = document.getElementById('copy-email-btn');
    const copySuccess = document.getElementById('copy-success');

    if (infoBtn && emailModal) {
        infoBtn.onclick = function() {
            emailModal.style.display = 'flex';
        };
    }

    if (closeEmailModal && emailModal) {
        closeEmailModal.onclick = () => { emailModal.style.display = 'none'; };
    }

    if (copyEmailBtn) {
        copyEmailBtn.onclick = function() {
            const email = document.getElementById('support-email').textContent;
            navigator.clipboard.writeText(email)
                .then(() => {
                    copySuccess.style.display = 'block';
                    setTimeout(() => {
                        copySuccess.style.display = 'none';
                    }, 2000);
                })
                .catch(err => {
                    console.error('فشل نسخ البريد:', err);
                    alert('حدث خطأ أثناء نسخ البريد');
                });
        };
    }

    // معالجة إغلاق النوافذ عند النقر خارجها
    window.onclick = function(e) {
        if (e.target === submitModal) {
            submitModal.style.display = 'none';
        }
        if (e.target === solvedModal) {
            solvedModal.style.display = 'none';
        }
        if (e.target === emailModal) {
            emailModal.style.display = 'none';
        }
    };

    // زر "شغل المؤقت"
    const startWithTimerBtn = document.getElementById('start-with-timer');
    const startWithoutTimerBtn = document.getElementById('start-without-timer');
    const timerModal = document.getElementById('timer-modal');
    if (startWithTimerBtn && startWithoutTimerBtn && timerModal) {
        startWithTimerBtn.onclick = function() {
            timerModal.style.display = 'none';
            window.quizWithTimer = true;
            if (pendingQuestionCount) startQuiz(pendingQuestionCount);
        };
        startWithoutTimerBtn.onclick = function() {
            timerModal.style.display = 'none';
            window.quizWithTimer = false;
            if (pendingQuestionCount) startQuiz(pendingQuestionCount);
        };
    }
});

function goToNextStep() {
    // إذا كان الاسم محفوظ انتقل مباشرة لاختيار الفصل
    const saved = localStorage.getItem('quiz-username');
    if (saved) {
        username = saved;
        // تحديث جملة اختيار الفصل باسم المستخدم
        const chapterTitle = document.getElementById('chapter-select-title');
        if (chapterTitle) {
            chapterTitle.textContent = `اختار الفصل أو المنهج يا ${username}`;
        }
        showPage('chapter-select-page');
    } else {
        showPage('username-page');
    }
}

function showSystemModal(message) {
    const modal = document.getElementById('system-modal');
    const msgSpan = document.getElementById('system-modal-message');
    const okBtn = document.getElementById('close-system-modal');
    const cancelBtn = document.getElementById('cancel-system-modal');
    msgSpan.textContent = message;
    modal.style.display = 'flex';
    cancelBtn.style.display = 'none';
    okBtn.onclick = function() {
        modal.style.display = 'none';
    };
    modal.onclick = function(e) {
        if (e.target === modal) modal.style.display = 'none';
    };
}

function showSystemConfirm(message, onOk, onCancel) {
    const modal = document.getElementById('system-modal');
    const msgSpan = document.getElementById('system-modal-message');
    const okBtn = document.getElementById('close-system-modal');
    const cancelBtn = document.getElementById('cancel-system-modal');
    msgSpan.textContent = message;
    modal.style.display = 'flex';
    cancelBtn.style.display = 'inline-block';
    okBtn.onclick = function() {
        modal.style.display = 'none';
        cancelBtn.style.display = 'none';
        if (onOk) onOk();
    };
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
        cancelBtn.style.display = 'none';
        if (onCancel) onCancel();
    };
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
            cancelBtn.style.display = 'none';
            if (onCancel) onCancel();
        }
    };
}

function showTimerModal(questionCount) {
    // إذا اختار "أسئلة الفصل كاملا"
    if (questionCount === 'all') {
        let filteredQuestions = window.questions;
        if (isFullCurriculum) {
            filteredQuestions = window.questions.filter(q => q && typeof q.chapter !== 'undefined');
        } else if (selectedChapter) {
            filteredQuestions = window.questions.filter(q => q && typeof q.chapter !== 'undefined' && Number(q.chapter) === Number(selectedChapter));
        }
        pendingQuestionCount = filteredQuestions.length;
    } else {
        pendingQuestionCount = questionCount;
    }
    const timerModal = document.getElementById('timer-modal');
    timerModal.style.display = 'flex';
}

// دالة للتحقق من صحة بيانات الأسئلة
function validateQuestions(questionsArr) {
    const errors = [];
    questionsArr.forEach((q, idx) => {
        if (!q.question || !Array.isArray(q.answers) || typeof q.correctAnswer !== 'number') {
            errors.push(`سؤال رقم ${idx + 1} ناقص بيانات (النص أو الإجابات أو رقم الإجابة الصحيحة)`);
        } else if (q.correctAnswer < 0 || q.correctAnswer >= q.answers.length) {
            errors.push(`سؤال رقم ${idx + 1} رقم الإجابة الصحيحة خارج النطاق`);
        }
    });
    return errors;
}

function resetQuizAll() {
    // إعادة تعيين حالة الاختبار
    quizState = {
        currentQuestions: [],
        userAnswers: [],
        currentQuestionIndex: 0,
        selectedChapter: null,
        questionCount: 0,
        isQuizInProgress: false
    };
    // حذف الأسئلة المجاب عليها من التخزين المحلي
    localStorage.removeItem('quiz-progress');
    // يمكن حذف إحصائيات الحل إذا أردت:
    // localStorage.removeItem('solvedQuestions');
    // localStorage.removeItem('correctQuestions');
    // إيقاف المؤقت
    stopTimer && stopTimer();
    // إزالة الرسائل المؤقتة من صفحة النتائج
    const resultsDiv = document.querySelector('#results-page');
    if (resultsDiv) {
        const funnyMsgs = resultsDiv.querySelectorAll('div');
        funnyMsgs.forEach(div => {
            if (div.style && div.style.color === 'rgb(255, 152, 0)') div.remove();
        });
    }
}

// استبدل في index.html: <button onclick="showQuestionCountPage()" class="btn">ابدأ امتحان جديد</button>
// بـ:
function startNewExam() {
    resetQuizAll();
    showPage('chapter-select-page');
}