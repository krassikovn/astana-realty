// Страницы «Аренда и доходность» (Rent.jsx) и «Рынок и чек-лист» (Market.jsx)
export default {
  // ───── Rent.jsx: шапка и сводка
  'Аренда и доходность': 'Pronájem a výnos',
  'Ставки считаются по объявлениям Крыши о долгосрочной аренде в радиусе 800 м от каждого ЖК. Столбец «В самом ЖК» берёт только объявления из домов в 200 м от точки ЖК, по привязке Крыши к жилому комплексу. Доходность нормирована на метр: аренда за м² в год к цене м² в этом ЖК у BI.':
    'Nájemné vychází z inzerátů na dlouhodobý pronájem na Krisha.kz v okruhu 800 m od každého projektu. Sloupec „Přímo v projektu“ zahrnuje jen inzeráty z domů do 200 m od bodu projektu, které Krisha.kz k danému rezidenčnímu projektu přiřazuje. Výnos je přepočten na metr čtvereční: roční nájemné za m² vůči ceně za m², za kterou v projektu prodává BI Group.',
  'Объявлений аренды собрано': 'Stažených inzerátů na pronájem',
  'продажа: {n}': 'prodej: {n}',
  'Медиана аренды {n}-комн. по собранным': 'Medián nájemného, {n}pokojové byty (stažené inzeráty)',
  'Медианная доходность по ЖК': 'Mediánový hrubý výnos z pronájmu napříč projekty',
  '% в год': '% ročně',
  '{v}% в год': '{v} % ročně',
  'до расходов и налогов': 'před náklady a zdaněním',
  'ЖК с арендой в самом доме': 'Projekty s inzeráty na pronájem přímo v domě',
  'из {n}, по привязке объявлений к комплексу': 'z {n}, podle přiřazení inzerátů k projektu',
  '/мес': '/měs.', '/м²': '/m²', '/м² в мес': '/m² za měs.',

  // ───── таблица по ЖК
  'По каждому ЖК': 'Podle projektů',
  'Нажмите на заголовок столбца, чтобы отсортировать.': 'Kliknutím na záhlaví sloupce tabulku seřadíte.',
  'ЖК': 'Projekt',
  'Объявлений': 'Inzerátů', 'рядом': 'v okolí',
  'Аренда': 'Nájemné', 'в месяц': 'měsíčně', 'за м² в месяц': 'za m² měsíčně', 'за м²': 'za m²',
  'В самом ЖК': 'Přímo v projektu',
  '{n} объявл.': '{n} inz.',
  'Цена BI от': 'Cena BI od', 'Цена BI': 'Cena BI',
  'Вторичка рядом': 'Sekundární trh v okolí',
  'Доходность': 'Hrubý výnos',
  'Комфорт': 'Komfort', 'Комфорт+': 'Komfort+', 'Комфорт lite': 'Komfort lite', 'Бизнес': 'Business', 'Бизнес+': 'Business+', 'Премиум': 'Premium', 'Стандарт': 'Standard',
  'Если объявлений меньше пяти, медиана ненадёжна. В новых районах объявлений мало, потому что дома ещё не сданы.':
    'Při méně než pěti inzerátech není medián spolehlivý. V nových lokalitách je inzerátů málo, protože domy ještě nejsou zkolaudované.',
  'Где {n}-комнатная окупается быстрее': 'Kde se {n}pokojový byt zaplatí nejrychleji',

  // ───── индекс цен по районам
  'Цена метра по районам Астаны': 'Cena za m² podle čtvrtí Astany',
  'Индекс Крыши: средняя цена предложения на вторичном рынке за м², по месяцам.': 'Cenový index Krisha.kz: průměrná nabídková cena na sekundárním trhu za m², po měsících.',
  'все': 'vše', '1-к': '1 pokoj', '2-к': '2 pokoje', '3-к': '3 pokoje',
  'Есильский р-н': 'čtvrť Jesil', 'Алматы р-н': 'čtvrť Almaty', 'Сарыарка р-н': 'čtvrť Saryarka', 'р-н Байконур': 'čtvrť Bajkonur',
  '% за год': '% meziročně',
  'в среднем {c}% в год с {from} · сейчас {p}/м²': 'průměrně {c} % ročně od {from} · nyní {p}/m²',
  'Индекс цен не загрузился. Запустите': 'Cenový index se nepodařilo načíst. Spusťte',

  // ───── официальный ряд аренды
  'Аренда в Астане за три года': 'Nájemné v Astaně za tři roky',
  'Официальный ряд Бюро национальной статистики: арендная плата за благоустроенное жильё за м² в месяц. Цены регистрируют 20-го числа по постоянной выборке 1-3-комнатных квартир.':
    'Oficiální časová řada Úřadu národní statistiky Kazachstánu: nájemné za byty se standardním vybavením, za m² měsíčně. Ceny se zjišťují vždy k 20. dni měsíce na stálém výběrovém souboru jedno- až třípokojových bytů.',
  'Астана, {m}': 'Astana, {m}',
  'по стране {v}': 'celostátně {v}',
  'Рост за год, Астана': 'Meziroční růst, Astana',
  'Рост с января 2024': 'Růst od ledna 2024',
  'с {a} до {b} за м²': 'z {a} na {b} za m²',
  'Двушка 55 м² по этой ставке': 'Dvoupokojový byt 55 m² při tomto nájemném',
  'для сравнения с объявлениями': 'pro srovnání s inzeráty',
  'смена выборки': 'změna výběrového souboru',
  'Астана': 'Astana', 'Казахстан': 'Kazachstán',
  'В январе 2024 года уровень упал с {a} до {b} за м² из-за ежегодной смены выборки, а не из-за цен: официальный индекс за этот месяц равен 100. Сравнивать уровни корректно начиная с января 2024. Источник:':
    'V lednu 2024 hodnota klesla z {a} na {b} za m² kvůli každoroční změně výběrového souboru, nikoli kvůli cenám: oficiální index za tento měsíc činí 100. Úrovně lze korektně srovnávat až od ledna 2024. Zdroj:',
  'бюллетени «Индексы цен и цены на рынке жилья»': 'bulletiny „Cenové indexy a ceny na trhu s bydlením“',
  ', ссылка на файл каждого месяца лежит в': '; odkaz na soubor za každý měsíc je uložen v',
  'Запрашиваемая аренда по обзорам Крыши': 'Nabídkové nájemné podle přehledů Krisha.kz',
  'Медиана цен в объявлениях по Астане, округлённая Крышей до 10 тыс ₸. Обзоры выходят нерегулярно: точек {n}, между сентябрём 2024 и октябрём 2025 их нет, линия там просто соединяет соседние точки.':
    'Medián cen v inzerátech za Astanu, který Krisha.kz zaokrouhluje na 10 tis. ₸. Přehledy vycházejí nepravidelně: datových bodů je {n}, mezi zářím 2024 a říjnem 2025 žádný není a křivka tam pouze spojuje sousední body.',

  // ───── своя история
  'Своя история по ЖК': 'Vlastní historie podle projektů',
  'Архива ставок по отдельным домам нет ни у Крыши, ни у статистики, поэтому сайт копит его сам: каждый запуск npm run fetch:krisha добавляет снимок.':
    'Archiv nájemného za jednotlivé domy nevede Krisha.kz ani statistický úřad, proto si ho web buduje sám: každé spuštění npm run fetch:krisha přidá nový snímek.',
  'Медиана {n}-комн. по ЖК': 'Medián, {n}pokojové byty napříč projekty',
  'Пока один снимок ({d}). Запускайте': 'Zatím je k dispozici jediný snímek ({d}). Spouštějte',
  'раз в месяц, и здесь появится динамика по каждому ЖК.': 'jednou měsíčně a objeví se tu vývoj u každého projektu.',

  // ───── калькулятор
  'Калькулятор на 10 лет': 'Kalkulačka na 10 let',
  'Арифметика с вашими допущениями, не прогноз.': 'Prostý výpočet s vašimi předpoklady, nikoli prognóza.',
  'Ремонт и мебель, млн ₸': 'Dokončení a vybavení, mil. ₸',
  'Месяцев в году сдаётся': 'Pronajato měsíců v roce',
  'Рост аренды, % в год': 'Růst nájemného, % ročně',
  'Рост цены жилья, % в год': 'Růst cen nemovitostí, % ročně',
  '{n}-комн. в {name} от': '{n}pokojový byt v projektu {name} od',
  'Аренда в первый год': 'Nájemné za první rok',
  'Доходность с учётом ремонта': 'Hrubý výnos po započtení dokončení a vybavení',
  'Окупаемость арендой': 'Návratnost investice z nájemného',
  'лет': 'roku',
  'без роста ставки': 'bez růstu nájemného',
  'Аренда за 10 лет': 'Nájemné za 10 let',
  'Цена квартиры через 10 лет': 'Cena bytu za 10 let',
  'Для расчёта нужен ЖК, рядом с которым есть объявления аренды.': 'K výpočtu je potřeba projekt, v jehož okolí jsou inzeráty na pronájem.',

  // ───── Market.jsx: шапка и вывод
  'Рынок и чек-лист': 'Trh a kontrolní seznam',
  'Короткая выжимка из статистики, прессы и обсуждений инвесторов на ноябрь 2026 года, со ссылками на первоисточники. Это обзор чужих оценок, а не инвестиционный совет.':
    'Stručný výtah ze statistik, tisku a diskusí investorů k listopadu 2026 s odkazy na původní zdroje. Jde o přehled cizích odhadů, nikoli o investiční doporučení.',
  'Что из этого следует для выбора.': 'Co z toho plyne pro výběr.',
  'Аренда в Астане даёт порядка 7–10% годовых до расходов, поэтому расчёт «отобьётся за 10 лет» держится в основном на росте цены метра, а не на аренде. Рынок сейчас на стороне покупателя: сделок меньше, застройщики дают скидки, значит в декабре есть предмет для торга. При расхождении прогнозов надёжнее выглядят ликвидные варианты: сданный дом, обжитой район, транспорт рядом.':
    'Pronájem v Astaně vynáší zhruba 7–10 % ročně před náklady, takže úvaha „za 10 let se to zaplatí“ stojí hlavně na růstu ceny za m², ne na nájemném. Trh teď nahrává kupujícím: transakcí ubylo a developeři poskytují slevy, v prosinci je tedy o čem vyjednávat. Když se prognózy rozcházejí, vypadají spolehlivěji likvidní varianty: zkolaudovaný dům, zabydlená lokalita, doprava na dosah.',

  // ───── заметки: цены
  'Что происходит с ценами': 'Co se děje s cenami',
  'По данным Бюро нацстатистики за октябрь 2026 года, новостройки по стране подорожали за год на 10,4%, вторичка на 7,1%, аренда на 14,6%. За январь–октябрь новостройки в Астане прибавили 16,6% к тому же периоду прошлого года.':
    'Podle údajů Úřadu národní statistiky Kazachstánu za říjen 2026 zdražily novostavby v celé zemi meziročně o 10,4 %, byty na sekundárním trhu o 7,1 % a nájemné o 14,6 %. Za leden–říjen si novostavby v Astaně připsaly 16,6 % oproti stejnému období loňského roku.',
  'В июле 2026 года годовой рост цен на новое жильё в Астане был самым высоким среди крупных городов: 19,4%. Эксперт отрасли оценивает, что потребность столицы в новом жилье превышает ввод на 15–20%, а спрос поддерживает миграционный прирост.':
    'V červenci 2026 byl meziroční růst cen nového bydlení v Astaně nejvyšší mezi velkými městy: 19,4 %. Odborník z oboru odhaduje, že potřeba nového bydlení v hlavním městě převyšuje objem dokončované výstavby o 15–20 % a poptávku podporuje migrační přírůstek.',
  'С декабря 2020 по февраль 2026 года новостройки в Астане подорожали на 87%.':
    'Od prosince 2020 do února 2026 zdražily novostavby v Astaně o 87 %.',

  // ───── заметки: прогнозы
  'Прогнозы на 2027 год расходятся': 'Prognózy na rok 2027 se rozcházejí',
  'Оценки экспертов на 2026–2027 годы лежат в диапазоне от роста на 7–12% до коррекции на 10–20% в отдельных сегментах. Общая мысль: рынок расслаивается, качественные квартиры в востребованных районах держат цену лучше.':
    'Odhady odborníků na roky 2026–2027 sahají od růstu o 7–12 % až po korekci o 10–20 % v jednotlivých segmentech. Společný závěr: trh se rozvrstvuje a kvalitní byty v žádaných lokalitách drží cenu lépe.',
  'Один из аналитиков называет базовым сценарием затяжную и неравномерную коррекцию без общего обвала, с давлением на вторичку в начале 2027 года.':
    'Jeden z analytiků považuje za základní scénář vleklou a nerovnoměrnou korekci bez plošného propadu, s tlakem na sekundární trh na začátku roku 2027.',
  'Президент Ассоциации застройщиков говорит, что рынок в стагнации, запуск новых проектов сокращается и считать цену метра на 2027 год пока рано.':
    'Prezident Asociace developerů říká, že trh je ve stagnaci, nových projektů se zahajuje méně a odhadovat cenu za m² na rok 2027 je zatím předčasné.',
  'Противоположное мнение: из-за сокращения новых строек со второго квартала 2027 года возможен рост минимум на 15%. Сейчас застройщики дают скидки до 30%, а покупатели выжидают.':
    'Opačný názor: kvůli útlumu nové výstavby je od druhého čtvrtletí 2027 možný růst nejméně o 15 %. Developeři nyní nabízejí slevy až 30 % a kupující vyčkávají.',
  'Аким Астаны в декабре 2025 года говорил, что в городе одновременно строится 10–11 млн м² жилья и всплеска цен власти не ждут.':
    'Akim (primátor) Astany v prosinci 2025 uvedl, že se ve městě současně staví 10–11 mil. m² bydlení a prudký růst cen vedení města nečeká.',

  // ───── заметки: аренда
  'В октябре 2026 года аренда в Астане была самой дорогой в стране: 6 352 ₸ за м² в месяц{eq}. За январь–октябрь ставки по стране выросли на 13,6%.':
    'V říjnu 2026 bylo nájemné v Astaně nejvyšší v zemi: 6 352 ₸ za m² měsíčně{eq}. Za leden–říjen vzrostlo nájemné v celé zemi o 13,6 %.',
  'По итогам октября аренда в Астане снизилась на 0,6% за месяц. До весны эксперт ждёт стабильных или слегка снижающихся ставок и советует следить за сроком простоя между жильцами.':
    'V říjnu nájemné v Astaně meziměsíčně kleslo o 0,6 %. Do jara odborník očekává stabilní nebo mírně klesající nájemné a doporučuje hlídat délku neobsazenosti mezi nájemníky.',
  'Владелец однушки в Астане посчитал доходность аренды за 12 месяцев: 7,2% годовых. Основной заработок, по его расчёту, дал рост цены метра по Индексу Крыши, около 15% за год.':
    'Majitel jednopokojového bytu v Astaně si spočítal hrubý výnos z pronájmu za 12 měsíců: 7,2 % ročně. Hlavní zisk mu podle jeho výpočtu přinesl růst ceny za m² podle cenového indexu Krisha.kz, zhruba 15 % za rok.',
  'Частный разбор 37 тысяч объявлений Крыши: медианная доходность аренды в Есильском районе 9,4%, в районе Нура 10,5% в год; на правом берегу выше. Методика не раскрыта.':
    'Soukromý rozbor 37 tisíc inzerátů na Krisha.kz: mediánový hrubý výnos z pronájmu činí ve čtvrti Jesil 9,4 % a ve čtvrti Nura 10,5 % ročně; na pravém břehu je vyšší. Metodika nebyla zveřejněna.',
  'Пример риелтора: однушка в GreenLine Aura за 38 млн ₸{a} при аренде 350 тыс ₸{b} окупается примерно за девять лет. При депозитах под 20% вклад иногда выгоднее аренды с учётом всех расходов.':
    'Příklad realitního makléře: jednopokojový byt v projektu GreenLine Aura za 38 mil. ₸{a} se při nájemném 350 tis. ₸{b} zaplatí zhruba za devět let. Při úrocích z vkladů kolem 20 % bývá termínovaný vklad po započtení všech nákladů někdy výhodnější než pronájem.',
  'Сам BI Group оценивает окупаемость арендой в Астане в 12–15 лет.':
    'Sama BI Group odhaduje návratnost investice z nájemného v Astaně na 12–15 let.',
  'Эксперты Tengri Home: окупаемость 8–10 лет считается лучшим случаем, а схема «купить на котловане и перепродать» больше не работает.':
    'Odborníci Tengri Home: návratnost investice za 8–10 let se považuje za nejlepší případ a model „koupit ve fázi výkopu a prodat dál“ už nefunguje.',

  // ───── заметки: транспорт
  'Транспорт': 'Doprava',
  'LRT открылся в мае 2026 года: одна линия, 18 остановок от аэропорта до вокзала «Нұрлы жол», интервал 5–6 минут, проезд 200 ₸{eq}. Линию планируют продлить ещё на 20 остановок: правый берег, Жагалау и Косшы.':
    'LRT zahájilo provoz v květnu 2026: jedna linka, 18 zastávek z letiště na nádraží Nurly Žol, interval 5–6 minut, jízdné 200 ₸{eq}. Linku plánují prodloužit o dalších 20 zastávek: pravý břeh, Žagalau a Kosšy.',
  'К концу 2026 года планировали начать ещё одну линию в сторону улицы Айтматова, ветку до Косшы обещают завершить в 2027 году.':
    'Do konce roku 2026 se plánovalo zahájení další linky směrem k ulici Ajtmatova; větev do Kosšy má být podle slibů dokončena v roce 2027.',

  // ───── чек-лист
  'Что выяснить в декабре': 'Co zjistit v prosinci',
  'По деньгам': 'Peníze',
  'Точная скидка при 100% оплате на каждую из трёх квартир и действует ли она на три лота сразу. В каталоге «лучшая цена» ниже прайса на 10–18% во многих ЖК, но акционных квартир ограниченное число.':
    'Přesná sleva při úhradě celé kupní ceny u každého ze tří bytů a zda platí na všechny tři jednotky najednou. „Nejlepší cena“ je v katalogu u mnoha projektů o 10–18 % pod ceníkem, ale bytů v akci je omezený počet.',
  'Скидка по карте BI Club за покупку трёх квартир сразу.': 'Sleva na kartu BI Club při koupi tří bytů najednou.',
  'Паркинг: место стоит около 5–9 млн ₸{eq} и в бюджет не входит.': 'Parkovací stání: jedno místo stojí zhruba 5–9 mil. ₸{eq} a rozpočet s ním nepočítá.',
  'Что входит в цену: предчистовая отделка или ремонт, и сколько стоит ремонт от застройщика.': 'Co je v ceně: shell & core, nebo dokončený byt, a kolik stojí dokončení od developera.',
  'По срокам': 'Termíny',
  'Дата выдачи ключей. В каталоге она обычно на три месяца позже сдачи дома.': 'Datum předání bytu. V katalogu bývá obvykle o tři měsíce později než kolaudace domu.',
  'Сколько займёт ремонт трёшки: при предчистовой отделке это 2–4 месяца до заселения.': 'Jak dlouho potrvá dokončení třípokojového bytu: ve standardu shell & core jsou to 2–4 měsíce do nastěhování.',
  'Когда реально можно начать сдавать двушки и есть ли у BI управляющая компания для аренды.': 'Kdy lze dvoupokojové byty reálně začít pronajímat a zda má BI Group správcovskou společnost pro pronájem.',
  'По оформлению и качеству': 'Právní náležitosti a kvalita',
  'Как оформить квартиры на владельцев-нерезидентов: доверенность, ЭЦП, налог с аренды. Это вопрос к юристу или нотариусу.': 'Jak byty převést na vlastníky bez daňové rezidence v Kazachstánu: plná moc, kazachstánský elektronický podpis (ECP), daň z příjmů z pronájmu. To je otázka pro právníka nebo notáře.',
  'Разрешение на привлечение денег дольщиков и гарантия по строящимся домам.': 'Povolení k přijímání plateb od kupujících během výstavby a záruka u rozestavěných domů.',
  'На месте: шум, двор, вид из окна на выбранном этаже, качество остекления, резервное тепло и вода на верхних этажах.': 'Na místě: hluk, vnitroblok, výhled z okna ve vybraném podlaží, kvalita zasklení, záložní dodávka tepla a vody ve vyšších podlažích.',
}
