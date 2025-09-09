/**
 * Text Preprocessing Library
 * Provides text normalization and domain-specific processing for improved similarity calculations
 */

// 1. Basic Normalization Functions
function basicNormalization(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .toLowerCase()                    // Convert to lowercase
        .trim()                          // Remove leading/trailing whitespace
        .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
        .normalize('NFD')               // Unicode normalization
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
        .replace(/[^\w\s\u3131-\u3163\uac00-\ud7a3.]/g, ' ') // Keep alphanumeric, Korean (complete range), spaces, and decimal points
        .replace(/\s+/g, ' ')           // Clean up spaces again
        .trim();
}

// Korean-specific normalization
function koreanNormalization(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, '')    // Remove standalone Korean consonants/vowels
        .replace(/(.)\1{2,}/g, '$1$1')   // Reduce 3+ repeated characters to 2
        .replace(/\s+/g, ' ')           // Clean spaces
        .trim();
}

// Remove noise and clean text
function cleanText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/&[#\w]+;/g, '')       // Remove HTML entities
        .replace(/<[^>]*>/g, '')        // Remove HTML tags
        .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
        .replace(/[^\w\s\u3131-\u3163\uac00-\ud7a3.]/g, ' ') // Remove special characters but preserve Korean and decimal points
        // .replace(/\d+/g, '')            // Remove numbers (commented out to preserve numbers in text)
        .replace(/\s+/g, ' ')           // Clean spaces
        .trim();
}

// 3. Domain-Specific Processing
const domainMappings = {
    // Learning/Education domain - 학습 서비스에 특화
    // 숫자, 단위를 정답과 일치하게 발음해야함
    // 그 외 기술용어의 경우 유사도로 판별 예정, 유사도가 너무 낮은 단어의 경우 핫워드 등록을 통해 유사도 올리기 필요
    learning: {
        // 숫자 한글 표현을 아라비아 숫자로 정규화
        '0': ['영', '공', '제로', 'zero'],
        '1': ['일', '하나', '원', 'one'],
        '2': ['이', '둘', '투', 'two'],
        '3': ['삼', '셋', '쓰리', 'three'],
        '4': ['사', '넷', '포', 'four'],
        '5': ['오', '다섯', '파이브', 'five'],
        '6': ['육', '여섯', '식스', 'six'],
        '7': ['칠', '일곱', '세븐', 'seven'],
        '8': ['팔', '여덟', '에이트', 'eight'],
        '9': ['구', '아홉', '나인', 'nine'],
        '10': ['십', '열', '텐', 'ten'],

        // 소수점 표현
        '.': ['점', '쩜', 'dot', 'point'],

        // 시간 단위
        '초': ['sec', 'second', 'seconds', '세컨드'],
        '분': ['min', 'minute', 'minutes', '미닛'],
        '시간': ['hour', 'hours', '아워'],

        // 길이/거리 단위 (학습에서 중요)
        '미리': ['mm', 'millimeter', '밀리미터', 'MM'],
        '센치': ['cm', 'centimeter', '센티미터', 'CM'],
        '인치': ['inch', 'inches', 'INCH'],
        '미터': ['m', 'meter', 'meters', '메터'],

        // // 기술 용어
        // '스냅드래곤': ['snapdragon', '퀄컴', 'qualcomm', '스냅드래 곰', '스냅 드래곤'],
        // '갤럭시': ['galaxy', 'samsung galaxy', '삼성 갤럭시'],
        // '아이폰': ['iphone', 'apple iphone', '애플 아이폰']
    },

    // Technology domain
    tech: {
        'AI': ['A.I.', 'A.I', 'artificial intelligence', '인공지능', 'AI'],
        'ML': ['machine learning', '머신러닝', 'ML'],
        'DL': ['deep learning', '딥러닝', 'DL'],
        'CPU': ['processor', '프로세서', 'central processing unit'],
        'GPU': ['graphics card', '그래픽카드', 'graphics processing unit'],
        'RAM': ['memory', '메모리', 'random access memory'],
        '스냅드래곤': ['snapdragon', '퀄컴', 'qualcomm', '스냅드래 곰'],
        '갤럭시': ['galaxy', 'samsung galaxy', '삼성 갤럭시'],
        '아이폰': ['iphone', 'apple iphone', '애플 아이폰']
    },

    // Brand domain
    brand: {
        '삼성': ['samsung', '삼성전자', 'samsung electronics'],
        '애플': ['apple', 'apple inc', '애플사'],
        '구글': ['google', 'alphabet', '구글사'],
        'LG': ['lg electronics', 'LG전자', 'lg corp'],
        '화웨이': ['huawei', 'HUAWEI Technologies'],
        '샤오미': ['xiaomi', 'mi', '미'],
        '원플러스': ['oneplus', '1+', 'one plus']
    },

    // General terms
    general: {
        '좋은': ['훌륭한', '멋진', '우수한', '뛰어난', 'good', 'great', 'excellent'],
        '나쁜': ['안좋은', '별로인', '형편없는', 'bad', 'poor', 'terrible'],
        '빠른': ['신속한', '고속의', 'fast', 'quick', 'rapid'],
        '느린': ['더딘', '지연된', 'slow', 'sluggish', 'delayed']
    }
};

// Apply domain-specific normalization
function domainSpecificProcessing(text, domain = 'general') {
    if (!text || typeof text !== 'string') {
        return '';
    }

    let processedText = text;
    const mappings = domainMappings[domain] || domainMappings.general;

    // Apply domain mappings
    for (const [standard, variants] of Object.entries(mappings)) {
        for (const variant of variants) {
            const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            processedText = processedText.replace(regex, standard);
        }
    }

    return processedText;
}

// STT 오류 및 숫자 표현 정규화 함수
function normalizeNumericExpressions(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    let processedText = text;

    // 복합패턴 제외 - 경우의 수를 다 커버할 수 없어 제외함.
    // // 복합 숫자 표현 처리 (예: "팔점구" → "8.9")
    // const complexNumberPatterns = {
    //     // 소수점 표현
    //     '팔점구': '8.9',
    //     '팔쩜구': '8.9',
    //     '팔 점 구': '8.9',
    //     '팔 쩜 구': '8.9',
    //     '일점오': '1.0',
    //     '일쩜오': '1.0',
    //     '이점오': '2.0',
    //     '이쩜오': '2.0',
    //     '삼점오': '3.0',
    //     '삼쩜오': '3.0',
    //     '사점오': '4.0',
    //     '사쩜오': '4.0',
    //     '오점오': '5.0',
    //     '오쩜오': '5.0',

    //     // 시간 표현
    //     '일초': '1초',
    //     '이초': '2초',
    //     '삼초': '3초',
    //     '사초': '4초',
    //     '오초': '5초',
    //     '육초': '6초',
    //     '칠초': '7초',
    //     '팔초': '8초',
    //     '구초': '9초',
    //     '십초': '10초',

    //     // 제품명 표현
    //     '스냅드래 곰': '스냅드래곤',
    //     '스냅 드래 곤': '스냅드래곤',
    //     '스냅 드래곤': '스냅드래곤',
    // };

    // // 복합 패턴 먼저 처리
    // for (const [pattern, replacement] of Object.entries(complexNumberPatterns)) {
    //     const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    //     processedText = processedText.replace(regex, replacement);
    // }

    // 단일 숫자 변환 (단어 경계 고려)
    const singleDigitMap = {
        '영': '0', '공': '0', '제로': '0',
        '일': '1', '하나': '1', '원': '1',
        '이': '2', '둘': '2', '투': '2',
        '삼': '3', '셋': '3', '쓰리': '3',
        '사': '4', '넷': '4', '포': '4',
        '오': '5', '다섯': '5', '파이브': '5',
        '육': '6', '여섯': '6', '식스': '6',
        '칠': '7', '일곱': '7', '세븐': '7',
        '팔': '8', '여덟': '8', '에이트': '8',
        '구': '9', '아홉': '9', '나인': '9',
        '십': '10', '열': '10', '텐': '10'
    };

    // 단일 숫자 변환 (한글은 단어 경계가 제대로 작동하지 않으므로 다른 방식 사용)
    for (const [korean, digit] of Object.entries(singleDigitMap)) {
        const regex = new RegExp(korean, 'gi');
        processedText = processedText.replace(regex, digit);
    }

    // 소수점 표현 정규화
    processedText = processedText.replace(/\b점\b/g, '.');
    processedText = processedText.replace(/\b쩜\b/g, '.');

    // 단위 정규화 - 중요한 단위는 보존하면서 STT 오류만 수정
    processedText = processedText.replace(/\b세컨드\b/gi, '초');
    processedText = processedText.replace(/\b미닛\b/gi, '분');
    processedText = processedText.replace(/\b아워\b/gi, '시간');

    // 길이/거리 단위 보존 (학습에서 중요)
    // 미리미터 관련
    processedText = processedText.replace(/\b밀리미터\b/gi, '미리');
    processedText = processedText.replace(/\bmm\b/gi, '미리');
    processedText = processedText.replace(/\bMillimeter\b/gi, '미리');

    // 센티미터 관련
    processedText = processedText.replace(/\b센티미터\b/gi, '센치');
    processedText = processedText.replace(/\bcm\b/gi, '센치');
    processedText = processedText.replace(/\bCentimeter\b/gi, '센치');

    // 인치 관련
    processedText = processedText.replace(/\binch\b/gi, '인치');
    processedText = processedText.replace(/\bInch\b/gi, '인치');

    return processedText;
}

// Auto-detect domain based on text content
function detectDomain(text) {
    if (!text || typeof text !== 'string') {
        return 'general';
    }

    const lowerText = text.toLowerCase();

    // Learning domain indicators (숫자나 단위가 포함된 경우)
    const learningKeywords = ['초', '분', '시간', 'sec', 'min', 'hour', '점', '쩜', '미리', '센치', '인치', '미터', 'mm', 'cm', 'inch', 'meter'];
    const hasNumbers = /\d/.test(text) || /[영일이삼사오육칠팔구십]/.test(text);
    const learningScore = learningKeywords.filter(keyword => lowerText.includes(keyword)).length;

    if (hasNumbers || learningScore > 0) {
        return 'learning';
    }

    // Tech indicators
    const techKeywords = ['cpu', 'gpu', 'ram', 'processor', '프로세서', 'ai', '인공지능',
                         'snapdragon', '스냅드래곤', 'chipset', '칩셋'];
    const techScore = techKeywords.filter(keyword => lowerText.includes(keyword)).length;

    // Brand indicators
    const brandKeywords = ['samsung', '삼성', 'apple', '애플', 'lg', 'huawei', '화웨이',
                          'xiaomi', '샤오미', 'google', '구글'];
    const brandScore = brandKeywords.filter(keyword => lowerText.includes(keyword)).length;

    if (techScore > brandScore && techScore > 0) {
        return 'tech';
    } else if (brandScore > 0) {
        return 'brand';
    }

    return 'general';
}

// Main preprocessing function
function preprocessText(text, options = {}) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    let processedText = text;
    const originalText = text;

    // Step 0: STT 숫자 표현 정규화 (학습 도메인에서 가장 중요)
    if (options.numericNormalization !== false) {
        processedText = normalizeNumericExpressions(processedText);
    }

    // Step 1: Basic normalization (always applied unless explicitly disabled)
    if (options.normalize !== false) {
        const detectedDomain = options.domain || detectDomain(processedText);
        if (detectedDomain === 'learning') {
            // 학습 도메인에서는 매우 신중한 정규화만 수행 - 단위 보존이 최우선
            processedText = processedText
                .toLowerCase()
                .trim()
                .replace(/\s+/g, ' ')
                .trim();
        } else {
            processedText = basicNormalization(processedText);
        }

        // Korean-specific normalization
        if (options.korean !== false && detectedDomain !== 'learning') {
            processedText = koreanNormalization(processedText);
        }
    }

    // Step 2: Clean text (remove noise) - 학습 도메인에서는 더 신중하게 적용
    if (options.clean !== false) {
        // 학습 도메인에서는 숫자와 단위 제거 방지를 위해 매우 신중한 정리만 수행
        const detectedDomain = options.domain || detectDomain(processedText);
        if (detectedDomain === 'learning') {
            // 학습 도메인에서는 HTML 태그와 URL만 제거하고 숫자와 한글 단위는 완전히 보존
            processedText = processedText
                .replace(/&[#\w]+;/g, '')       // Remove HTML entities
                .replace(/<[^>]*>/g, '')        // Remove HTML tags
                .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
                .replace(/\s+/g, ' ')           // Clean spaces
                .trim();
        } else {
            processedText = cleanText(processedText);
        }
    }

    // Step 3: Domain-specific processing
    if (options.domainProcessing !== false) {
        const domain = options.domain || detectDomain(processedText);
        processedText = domainSpecificProcessing(processedText, domain);
    }

    // Final cleanup
    processedText = processedText.replace(/\s+/g, ' ').trim();

    // Log preprocessing if debug mode
    if (options.debug) {
        console.log('Preprocessing:', {
            original: originalText,
            processed: processedText,
            domain: options.domain || detectDomain(originalText),
            steps: {
                numericNormalization: options.numericNormalization !== false,
                normalize: options.normalize !== false,
                korean: options.korean !== false,
                clean: options.clean !== false,
                domainProcessing: options.domainProcessing !== false
            },
            changes: originalText !== processedText
        });
    }

    return processedText;
}

// Batch preprocessing for multiple texts
function preprocessTexts(texts, options = {}) {
    if (!Array.isArray(texts)) {
        return [];
    }

    return texts.map(text => preprocessText(text, options));
}

// Compare preprocessing effectiveness
function comparePreprocessingMethods(originalText, methods = ['none', 'basic', 'full']) {
    const results = {};

    methods.forEach(method => {
        switch (method) {
            case 'none':
                results[method] = originalText;
                break;
            case 'basic':
                results[method] = preprocessText(originalText, {
                    normalize: true,
                    clean: false,
                    domainProcessing: false
                });
                break;
            case 'full':
                results[method] = preprocessText(originalText, {
                    normalize: true,
                    clean: true,
                    domainProcessing: true,
                    debug: true
                });
                break;
            default:
                results[method] = preprocessText(originalText, method);
        }
    });

    return results;
}

// Add new domain mapping
function addDomainMapping(domain, mappings) {
    if (!domainMappings[domain]) {
        domainMappings[domain] = {};
    }

    Object.assign(domainMappings[domain], mappings);
}

// Get available domains
function getAvailableDomains() {
    return Object.keys(domainMappings);
}

// 새로운 단계별 학습용 텍스트 전처리 함수
function preprocessLearningText(text) {
    if (!text) return "";

    let t = text.trim();
    console.log(`전처리 시작: "${t}"`);

    // Step 1. 독립된 한글 숫자만 → 아라비아 숫자 (단어 경계 고려)
    const mapKoreanToDigit = {
        "영": "0", "공": "0",
        "일": "1", "하나": "1", 
        "이": "2", "둘": "2",
        "삼": "3", "셋": "3",
        "사": "4", "넷": "4",
        "오": "5", "다섯": "5",
        "육": "6", "여섯": "6",
        "칠": "7", "일곱": "7",
        "팔": "8", "여덟": "8",
        "구": "9", "아홉": "9",
        "십": "10", "열": "10"
    };
    
    // 단어 경계를 고려한 안전한 변환 (완전한 단어로만 매칭)
    for (const [k, v] of Object.entries(mapKoreanToDigit)) {
        const before = t;
        // 공백이나 문장 시작/끝에서만 매칭되도록 수정
        t = t.replace(new RegExp(`\\b${k}\\b|(?<=\\s)${k}(?=\\s)|^${k}(?=\\s)|(?<=\\s)${k}$|^${k}$`, "g"), v);
        if (before !== t) {
            console.log(`  Step 1 (한글→숫자): "${before}" → "${t}"`);
        }
    }

    // Step 2. 소수점 표현 정규화 (숫자 사이의 점/쩜 등을 . 으로 변환)
    const beforeStep2 = t;
    // 숫자 사이에 있는 점/쩜 등을 소수점으로 변환
    t = t.replace(/(\d+)\s*(점|쩜|dot|point)\s*(\d+)/gi, "$1.$3");
    // 독립적인 점/쩜도 변환 (단어 경계 고려)
    t = t.replace(/\b(점|쩜|dot|point)\b/gi, ".");
    if (beforeStep2 !== t) {
        console.log(`  Step 2 (소수점): "${beforeStep2}" → "${t}"`);
    }

    // Step 3. 단위 정규화 (한국에서 주로 사용되는 단위들)
    const beforeStep3 = t;
    
    // 길이/거리 단위
    t = t.replace(/\b(mm|밀리미터)\b/gi, "미리");
    t = t.replace(/\b(cm|센티미터)\b/gi, "센치");
    t = t.replace(/\b(m|meter|미터)\b/gi, "미터");
    t = t.replace(/\b(km|킬로미터)\b/gi, "킬로미터");
    t = t.replace(/\b(inch|인치)\b/gi, "인치");
    
    // 무게 단위
    t = t.replace(/\b(g|gram|그램)\b/gi, "그램");
    t = t.replace(/\b(kg|킬로그램)\b/gi, "킬로그램");
    t = t.replace(/\b(mg|밀리그램)\b/gi, "밀리그램");
    
    // 시간 단위
    t = t.replace(/\b(sec|second|초)\b/gi, "초");
    t = t.replace(/\b(min|minute|분)\b/gi, "분");
    t = t.replace(/\b(hr|hour|시간)\b/gi, "시간");
    
    // 용량/부피 단위
    t = t.replace(/\b(ml|밀리리터)\b/gi, "밀리리터");
    t = t.replace(/\b(l|liter|리터)\b/gi, "리터");
    
    // 온도 단위 (한국식 표현)
    t = t.replace(/\b도\b/gi, "도");
    
    // 퍼센트 단위
    t = t.replace(/\b(percent|퍼센트)\b/gi, "퍼센트");
    t = t.replace(/%/g, "퍼센트");
    
    // 디지털 용량 단위
    t = t.replace(/\b(gb|기가)\b/gi, "기가");
    t = t.replace(/\b(mb|메가)\b/gi, "메가");
    t = t.replace(/\b(kb|킬로)\b/gi, "킬로");
    t = t.replace(/\b(tb|테라)\b/gi, "테라");
    
    if (beforeStep3 !== t) {
        console.log(`  Step 3 (단위): "${beforeStep3}" → "${t}"`);
    }

    // Step 4. 숫자 → 한글 변환
    const beforeStep4 = t;
    t = numberToKorean(t);
    if (beforeStep4 !== t) {
        console.log(`  Step 4 (숫자→한글): "${beforeStep4}" → "${t}"`);
    }

    console.log(`전처리 완료: "${text}" → "${t}"`);
    return t;
}

// 숫자 → 한글 변환 함수 (텍스트 내 모든 숫자 패턴을 찾아서 변환)
function numberToKorean(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    // 숫자 패턴을 찾아서 한글로 변환 (정수와 소수점 모두 지원)
    // 단어에 붙어있는 숫자도 포함 (AI6, 8.9m 등)
    return text.replace(/\d+(\.\d+)?/g, (match) => {
        const korean = convertSingleNumberToKorean(match);
        console.log(`    숫자→한글 변환: "${match}" → "${korean}"`);
        return korean;
    });
}

// 개별 숫자를 한국어로 변환 (정수 + 소수점 지원)
function convertSingleNumberToKorean(numInput) {
    if (!numInput) return "";

    // 소수점이 있는 경우 처리
    if (numInput.includes('.')) {
        const [integerPart, decimalPart] = numInput.split('.');
        const integerKorean = convertIntegerToKorean(parseInt(integerPart, 10));
        const decimalKorean = convertDecimalToKorean(decimalPart);
        return `${integerKorean}점${decimalKorean}`;
    }

    // 정수만 있는 경우
    const num = parseInt(numInput, 10);
    if (isNaN(num)) return numInput;

    return convertIntegerToKorean(num);
}

// 정수를 한국어로 변환
function convertIntegerToKorean(num) {
    if (num === 0) return "영";

    const units = ["", "만", "억", "조", "경"];
    const smallUnits = ["", "십", "백", "천"];
    const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

    let result = "";
    let unitPos = 0;
    let n = num;

    while (n > 0) {
        let part = n % 10000; // 네 자리씩 나눔
        let partStr = "";

        for (let i = 0; i < 4; i++) {
            const digit = part % 10;
            if (digit > 0) {
                partStr = digits[digit] + smallUnits[i] + partStr;
            }
            part = Math.floor(part / 10);
        }

        if (partStr !== "") {
            result = partStr + units[unitPos] + result;
        }

        n = Math.floor(n / 10000);
        unitPos++;
    }

    // "일십", "일백", "일천" → "십", "백", "천"
    result = result
        .replace(/일십/g, "십")
        .replace(/일백/g, "백")
        .replace(/일천/g, "천");

    return result;
}

// 소수점 이하를 한글로 변환
function convertDecimalToKorean(decimalStr) {
    const digits = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    return decimalStr.split('').map(d => digits[parseInt(d)]).join('');
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        basicNormalization,
        koreanNormalization,
        cleanText,
        normalizeNumericExpressions,
        domainSpecificProcessing,
        detectDomain,
        preprocessText,
        preprocessTexts,
        comparePreprocessingMethods,
        addDomainMapping,
        getAvailableDomains,
        domainMappings,
        preprocessLearningText,
        numberToKorean,
        convertSingleNumberToKorean,
        convertIntegerToKorean,
        convertDecimalToKorean
    };
} else {
    // Browser environment - expose as global object
    window.TextPreprocessor = {
        basicNormalization,
        koreanNormalization,
        cleanText,
        normalizeNumericExpressions,
        domainSpecificProcessing,
        detectDomain,
        preprocessText,
        preprocessTexts,
        comparePreprocessingMethods,
        addDomainMapping,
        getAvailableDomains,
        domainMappings,
        preprocessLearningText,
        numberToKorean,
        convertSingleNumberToKorean,
        convertIntegerToKorean,
        convertDecimalToKorean
    };
}
