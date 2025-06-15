// filepath: c:\Users\COMPU\OneDrive\Desktop\مشروع اختبارات جديد - Copy\src\levels.js
// تعريف المستويات: كل مستوى يحتاج عدد معين من النقاط
window.levelThresholds = [
    { level: 1, points: 0 },
    { level: 2, points: 10 },
    { level: 3, points: 25 },
    { level: 4, points: 50 },
    { level: 5, points: 80 },
    { level: 6, points: 120 },
    { level: 7, points: 170 },
    { level: 8, points: 230 },
    { level: 9, points: 300 },
    { level: 10, points: 400 }
];

// دالة مساعدة لإرجاع المستوى المناسب حسب النقاط
window.getLevelByPoints = function(points) {
    let level = 1;
    for (let i = 0; i < window.levelThresholds.length; i++) {
        if (points >= window.levelThresholds[i].points) {
            level = window.levelThresholds[i].level;
        }
    }
    return level;
};