// Initialize questions array if not exists
if (typeof window.questions === 'undefined') {
    window.questions = [];
}

// ===== بداية كود الشروط والأحكام =====
// متغيرات الشروط والأحكام
const TERMS_VERSION = '1.0';
const TERMS_AGREED_KEY = 'terms-agreed-version';

// التحقق من موافقة المستخدم على الشروط
function checkTermsAgreement() {
    console.log('Checking terms agreement...');
    const agreedVersion = localStorage.getItem(TERMS_AGREED_KEY);
    console.log('Agreed version:', agreedVersion);
    console.log('Current version:', TERMS_VERSION);
    
    if (agreedVersion !== TERMS_VERSION) {
        console.log('Terms not agreed, showing modal...');
        showTermsModal();
        return false;
    }
    console.log('Terms already agreed');
    return true;
}

// عرض نافذة الشروط
function showTermsModal() {
    console.log('Showing terms modal...');
    const termsModal = document.getElementById('terms-modal');
    if (!termsModal) {
        console.error('Terms modal element not found');
        return;
    }

    // إخفاء جميع الصفحات الأخرى
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // إظهار نافذة الشروط
    termsModal.style.display = 'flex';
    termsModal.classList.add('visible');
    console.log('Terms modal display set to flex');

    // إضافة مستمعي الأحداث للأزرار
    const acceptBtn = document.getElementById('accept-terms');
    const rejectBtn = document.getElementById('reject-terms');

    if (acceptBtn) {
        acceptBtn.onclick = function() {
            console.log('Terms accepted');
            localStorage.setItem(TERMS_AGREED_KEY, TERMS_VERSION);
            termsModal.style.display = 'none';
            termsModal.classList.remove('visible');
            showPage('welcome-page');
        };
    }

    if (rejectBtn) {
        rejectBtn.onclick = function() {
            console.log('Terms rejected');
            alert('لن تتمكن من استخدام المنصة دون الموافقة على الشروط والأحكام');
        };
    }
}
// ===== نهاية كود الشروط والأحكام =====

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    // التحقق من الشروط أولاً
    if (!checkTermsAgreement()) {
        console.log('Terms not agreed, stopping further execution');
        return; // لا نتابع إذا لم يوافق المستخدم
    }
    
    console.log('Terms agreed, continuing with page load');
    // إذا وافق المستخدم، نتابع تحميل الصفحة
    updateUserBar();
    createParticles();
    fillQuizButtons();

    // عند فتح صفحة النقاط والمستويات، حدث البيانات
    var pointsLevelsPage = document.getElementById('points-levels-page');
    if (pointsLevelsPage) {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                if (pointsLevelsPage.classList.contains('active')) {
                    updatePointsLevelsPage();
                }
            });
        });
        observer.observe(pointsLevelsPage, { attributes: true, attributeFilter: ['class'] });
    }
});

// تحديث عرض النقاط والمستوى في صفحة النقاط والمستويات الداخلية
function updatePointsLevelsPage() {
    var points = Number(localStorage.getItem('quizPoints')) || 0;
    // المستويات من levels.js إذا متوفر
    var level = 1;
    if (window.levelThresholds && Array.isArray(window.levelThresholds)) {
        for (let i = 0; i < window.levelThresholds.length; i++) {
            if (points >= window.levelThresholds[i].points) {
                level = window.levelThresholds[i].level;
            }
        }
    }
    var pointsDisplay = document.getElementById('points-display');
    var levelDisplay = document.getElementById('level-display');
    if (pointsDisplay) pointsDisplay.textContent = 'النقاط: ' + points;
    if (levelDisplay) levelDisplay.textContent = 'المستوى: ' + level;
}

// حفظ الأسئلة المغلوطة في localStorage بعد كل اختبار
function saveWrongQuestions(questions, userAnswers) {
    // اجعل الدالة متاحة على window ليستدعيها كود src
    window.saveWrongQuestions = saveWrongQuestions;
    var wrongs = JSON.parse(localStorage.getItem('wrong-questions') || '[]');
    questions.forEach(function(q, i) {
        // تأكد أن المقارنة بين أرقام
        if (typeof userAnswers[i] !== 'undefined' && Number(userAnswers[i]) !== Number(q.correctAnswer)) {
            // لا تكرر السؤال إذا كان موجود
            if (!wrongs.some(w => w.question === q.question)) {
                wrongs.push({
                    question: q.question,
                    userAnswer: userAnswers[i],
                    userAnswerText: q.answers && typeof userAnswers[i] !== 'undefined' ? q.answers[userAnswers[i]] : '',
                    correctAnswer: q.correctAnswer,
                    correctAnswerText: q.answers && typeof q.correctAnswer !== 'undefined' ? q.answers[q.correctAnswer] : '',
                    chapter: q.chapter || null
                });
            }
        }
    });
    localStorage.setItem('wrong-questions', JSON.stringify(wrongs));
}

// دالة بدء حل سؤال مغلوط (تُستخدم من النافذة)
window.startWrongQuestionReal = function(idx) {
    var wrongs = JSON.parse(localStorage.getItem('wrong-questions') || '[]');
    if (!wrongs[idx]) return;
    var q = wrongs[idx];
    // عرض السؤال في نافذة بسيطة (يمكنك تطويرها لاحقاً)
    var userAns = prompt(q.question + '\n(أجب هنا، الإجابة الصحيحة: ' + q.correctAnswer + ')');
    if (userAns && userAns.trim() == q.correctAnswer) {
        // حذف السؤال من القائمة وإعطاء نقاط
        wrongs.splice(idx, 1);
        localStorage.setItem('wrong-questions', JSON.stringify(wrongs));
        var points = Number(localStorage.getItem('quizPoints')) || 0;
        localStorage.setItem('quizPoints', points + 2); // نقطتين لكل سؤال مغلوط
        alert('إجابة صحيحة! تم حذف السؤال من القائمة وأضفنا لك نقطتين.');
    } else {
        alert('إجابة غير صحيحة أو لم تجب بشكل صحيح.');
    }
};

// تحديث بيانات المستخدم والرتبة والشريط المصغر
const ranks = [
    { name: 'مستكشف المنهج ', points: 0, icon: '🔍' },
    { name: 'بتاع محاضرات', points: 50, icon: '📚' },
    { name: 'بتاع شيتات', points: 100, icon: '📝' },
    { name: 'بتاع سكاشن', points: 175, icon: '🧑‍🏫' },
    { name: 'دحيح', points: 250, icon: '🧠' },
    { name: 'صاحب الدكتور', points: 325, icon: '🤝' },
    { name: 'بتاع مشاريع', points: 400, icon: '💻' },
    { name: 'أسطورة الامتحانات', points: 450, icon: '🏆' },
    { name: 'عميد الدفعة', points: 475, icon: '🎓' },
    { name: 'البرنس الجامعي', points: 500, icon: '🦁' }
];

function getCurrentRank(points) {
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (points >= ranks[i].points) {
            return { current: ranks[i], next: ranks[i + 1] || null };
        }
    }
    return { current: ranks[0], next: ranks[1] };
}

function updateUserBar() {
    let username = localStorage.getItem('quiz-username') || 'مستخدم';
    let points = Number(localStorage.getItem('quizPoints')) || 0;
    const { current, next } = getCurrentRank(points);
    const usernameEl = document.getElementById('usernameCompact');
    const rankEl = document.getElementById('userRankCompact');
    const pointsEl = document.getElementById('pointsCompact');
    const progressBar = document.getElementById('miniProgressBar');
    if (usernameEl) usernameEl.textContent = username;
    if (rankEl) rankEl.textContent = current.name;
    if (pointsEl) pointsEl.textContent = points;
    if (progressBar) {
        let progress = 0;
        if (next) {
            progress = ((points - current.points) / (next.points - current.points)) * 100;
        } else {
            progress = 100;
        }
        progressBar.style.width = Math.max(5, progress) + '%';
    }
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        particlesContainer.appendChild(particle);
    }
}

function fillQuizButtons() {
    const quizGrid = document.querySelector('.quiz-grid');
    if (!quizGrid) return;
    quizGrid.innerHTML = '';
    // مثال: الفصول من 1 إلى 5
    const chapters = [
        { num: 1, label: '📚 الفصل الأول', locked: false },
        { num: 2, label: '📖 الفصل الثاني', locked: false },
        { num: 3, label: '📝 الفصل الثالث', locked: false },
        { num: 4, label: '📊 الفصل الرابع', locked: false },
        { num: 5, label: '🏆 الفصل الخامس', locked: false },
        { num: 0, label: '🔒 المحتوى الكامل', locked: true }
    ];
    chapters.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'quiz-button' + (ch.locked ? ' locked' : (ch.num === 5 ? ' complete' : ''));
        btn.innerHTML = ch.label;
        if (ch.locked) {
            btn.onclick = () => alert('🔒 هذا المحتوى مقفل! تحتاج للمزيد من النقاط لفتحه');
        } else {
            btn.onclick = () => showPage('chapter-select-page');
        }
        quizGrid.appendChild(btn);
    });
}

function showPage(pageId) {
    // إخفاء جميع الصفحات
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    // عرض الصفحة المطلوبة
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        activePage.style.display = 'block';
    }
}

// متغيرات عامة للاختبار
window.currentQuizQuestions = [];
window.currentQuizAnswers = [];
window.currentQuizIndex = 0;

// دالة بدء الاختبار
function startQuiz(chapterNum, questionCount) {
    // جلب كل الأسئلة من window.questions
    let allQuestions = window.questions || [];
    
    // التحقق من صحة البيانات
    if (!Array.isArray(allQuestions)) {
        console.error('window.questions is not an array:', allQuestions);
        alert('حدث خطأ في تحميل الأسئلة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        return;
    }

    // التحقق من أن كل سؤال يحتوي على chapter
    allQuestions = allQuestions.filter(q => q && typeof q === 'object' && 'chapter' in q);
    
    if (allQuestions.length === 0) {
        console.error('No valid questions found');
        alert('لم يتم العثور على أسئلة صالحة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
        return;
    }

    let filtered = [];
    if (chapterNum === 'full') {
        filtered = allQuestions;
    } else {
        filtered = allQuestions.filter(q => q.chapter == chapterNum);
    }

    // التحقق من وجود أسئلة للفصل المحدد
    if (filtered.length === 0) {
        console.error('No questions found for chapter:', chapterNum);
        alert('لم يتم العثور على أسئلة للفصل المحدد. يرجى اختيار فصل آخر.');
        return;
    }

    // اختيار عدد الأسئلة المطلوب عشوائيًا
    if (questionCount === 'all' || questionCount >= filtered.length) {
        window.currentQuizQuestions = [...filtered];
    } else {
        // عينة عشوائية
        let shuffled = filtered.sort(() => Math.random() - 0.5);
        window.currentQuizQuestions = shuffled.slice(0, questionCount);
    }
    
    window.currentQuizAnswers = Array(window.currentQuizQuestions.length).fill(null);
    window.currentQuizIndex = 0;
    showPage('quiz-page');
    renderCurrentQuestion();
}

// عرض السؤال الحالي
function renderCurrentQuestion() {
    const qIdx = window.currentQuizIndex;
    const q = window.currentQuizQuestions[qIdx];
    if (!q) return;
    // تحديث رقم السؤال
    const qNumEl = document.getElementById('question-number');
    if (qNumEl) qNumEl.textContent = `سؤال ${qIdx + 1} من ${window.currentQuizQuestions.length}`;
    // نص السؤال
    const qTextEl = document.getElementById('question-text');
    if (qTextEl) qTextEl.textContent = q.question;
    // خيارات الإجابة
    const ansCont = document.getElementById('answers-container');
    if (ansCont) {
        ansCont.innerHTML = '';
        q.answers.forEach((ans, i) => {
            const btn = document.createElement('div');
            btn.className = 'answer-option' + (window.currentQuizAnswers[qIdx] === i ? ' selected' : '');
            btn.textContent = ans;
            btn.onclick = function() {
                window.currentQuizAnswers[qIdx] = i;
                renderCurrentQuestion();
            };
            ansCont.appendChild(btn);
        });
    }
    // إظهار/إخفاء زر "التالي" و"السابق"
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    if (prevBtn) prevBtn.style.display = qIdx === 0 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = qIdx === window.currentQuizQuestions.length - 1 ? 'none' : '';
    if (submitBtn) submitBtn.style.display = qIdx === window.currentQuizQuestions.length - 1 ? '' : 'none';
}

// أزرار التنقل
function prevQuestion() {
    if (window.currentQuizIndex > 0) {
        window.currentQuizIndex--;
        renderCurrentQuestion();
    }
}
function nextQuestion() {
    if (window.currentQuizIndex < window.currentQuizQuestions.length - 1) {
        window.currentQuizIndex++;
        renderCurrentQuestion();
    }
}

// عند اختيار الفصل أو المنهج
function selectChapter(chapterNum) {
    window.selectedChapter = chapterNum;
    showPage('question-count-page');
}
function selectFullCurriculum() {
    window.selectedChapter = 'full';
    showPage('question-count-page');
}

// عند اختيار عدد الأسئلة
function showTimerModal(questionCount) {
    window.selectedQuestionCount = questionCount;

    // تعديل: إذا اختار المستخدم "أسئلة الفصل كاملاً" (questionCount === 'all')
    // نحدد عدد الأسئلة الخاصة بالفصل المختار فقط
    if (questionCount === 'all') {
        let allQuestions = window.questions || [];
        // فلترة الأسئلة حسب الفصل المختار
        let filtered = [];
        if (window.selectedChapter === 'full') {
            // المنهج كامل: نأخذ كل الأسئلة
            window.selectedQuestionCount = 'all';
        } else {
            filtered = allQuestions.filter(q => q && typeof q === 'object' && 'chapter' in q && q.chapter == window.selectedChapter);
            window.selectedQuestionCount = filtered.length;
        }
    }

    var timerModal = document.getElementById('timer-modal');
    if (timerModal) {
        timerModal.style.display = 'flex';
        var startWithTimer = document.getElementById('start-with-timer');
        var startWithoutTimer = document.getElementById('start-without-timer');
        if (startWithTimer && startWithoutTimer) {
            startWithTimer.onclick = function() {
                timerModal.style.display = 'none';
                // منطق بدء الاختبار مع المؤقت
                startQuiz(window.selectedChapter, window.selectedQuestionCount);
            };
            startWithoutTimer.onclick = function() {
                timerModal.style.display = 'none';
                // منطق بدء الاختبار بدون مؤقت
                startQuiz(window.selectedChapter, window.selectedQuestionCount);
            };
        }
    } else {
        // إذا لم توجد نافذة المؤقت، انتقل مباشرة للاختبار
        startQuiz(window.selectedChapter, window.selectedQuestionCount);
    }
}

// دالة عرض ملخص الفصل
function showChapterSummary(chapterNum) {
    // حفظ رقم الفصل المختار في localStorage
    localStorage.setItem('selectedChapter', chapterNum);
    
    // الانتقال إلى صفحة الملخص
    window.location.href = 'chapter-summary.html';
}