/**
 * 역방향 전처리 모듈 (reverse-preprocessing.js)
 * 
 * 기존 전처리와 반대 방향으로 처리:
 * - 한글 숫자/단위 → 아라비아 숫자/영문 단위로 변환
 * - 기존 전처리(숫자→한글)와 성능 비교 목적
 */

// 역방향 기본 전처리 (Step R1-R3): 한글→숫자, 소수점 정규화, 단위→영문
function applyReversePreprocessing(text) {
    let t = text.trim();

    // Step R1. 한글 숫자 → 아라비아 숫자 (기존과 동일)
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

    for (const [k, v] of Object.entries(mapKoreanToDigit)) {
        t = t.replace(new RegExp(`\\b${k}\\b|(?<=\\s)${k}(?=\\s)|^${k}(?=\\s)|(?<=\\s)${k}$|^${k}$`, "g"), v);
    }

    // Step R2. 소수점 표현 정규화 (기존과 동일)
    t = t.replace(/(\\d+)\\s*(점|쩜|dot|point)\\s*(\\d+)/gi, "$1.$3");
    t = t.replace(/\\b(점|쩜|dot|point)\\b/gi, ".");

    // Step R3. 한글 단위 → 영문 단위로 변환 (역방향)
    // 길이/거리 단위
    t = t.replace(/\\b미리\\b/gi, "mm");
    t = t.replace(/\\b센치\\b/gi, "cm");
    t = t.replace(/\\b미터\\b/gi, "m");
    t = t.replace(/\\b킬로미터\\b/gi, "km");
    t = t.replace(/\\b인치\\b/gi, "inch");
    t = t.replace(/(\\d+)미리\\b/gi, "$1mm");
    t = t.replace(/(\\d+)센치\\b/gi, "$1cm");
    t = t.replace(/(\\d+)미터\\b/gi, "$1m");
    t = t.replace(/(\\d+)킬로미터\\b/gi, "$1km");

    // 무게 단위
    t = t.replace(/\\b그램\\b/gi, "g");
    t = t.replace(/\\b킬로그램\\b/gi, "kg");
    t = t.replace(/\\b밀리그램\\b/gi, "mg");
    t = t.replace(/(\\d+)그램\\b/gi, "$1g");
    t = t.replace(/(\\d+)킬로그램\\b/gi, "$1kg");
    t = t.replace(/(\\d+)밀리그램\\b/gi, "$1mg");

    // 시간 단위
    t = t.replace(/\\b초\\b/gi, "sec");
    t = t.replace(/\\b분\\b/gi, "min");
    t = t.replace(/\\b시간\\b/gi, "hr");
    t = t.replace(/(\\d+)초\\b/gi, "$1sec");
    t = t.replace(/(\\d+)분\\b/gi, "$1min");
    t = t.replace(/(\\d+)시간\\b/gi, "$1hr");

    // 용량/부피 단위
    t = t.replace(/\\b밀리리터\\b/gi, "ml");
    t = t.replace(/\\b리터\\b/gi, "l");
    t = t.replace(/(\\d+)밀리리터\\b/gi, "$1ml");
    t = t.replace(/(\\d+)리터\\b/gi, "$1l");

    // 퍼센트 단위
    t = t.replace(/\\b퍼센트\\b/gi, "%");

    // 디지털 용량 단위
    t = t.replace(/\\b기가\\b/gi, "gb");
    t = t.replace(/\\b메가\\b/gi, "mb");
    t = t.replace(/\\b킬로\\b/gi, "kb");
    t = t.replace(/\\b테라\\b/gi, "tb");
    t = t.replace(/(\\d+)기가\\b/gi, "$1gb");
    t = t.replace(/(\\d+)메가\\b/gi, "$1mb");
    t = t.replace(/(\\d+)킬로\\b/gi, "$1kb");
    t = t.replace(/(\\d+)테라\\b/gi, "$1tb");

    return t;
}

// 복합 한글 숫자 → 아라비아 숫자 변환 (사천사백 → 4400)
function convertKoreanNumberToArabic(text, debugLevel = 0) {
    if (!text || typeof text !== 'string') {
        console.error('한글→숫자 변환 함수 에러:', text);
        return text;
    }

    // 복합 한글 숫자 패턴을 찾아서 아라비아 숫자로 변환
    return text.replace(/[영일이삼사오육칠팔구십백천만억조경]+/g, (match) => {
        const arabic = convertSingleKoreanToArabic(match);
        if (debugLevel >= 2) {
            console.log(`    한글→숫자 변환: "${match}" → "${arabic}"`);
        }
        return arabic;
    });
}

// 개별 한글 숫자를 아라비아 숫자로 변환
function convertSingleKoreanToArabic(koreanNum) {
    if (!koreanNum) return "";
    
    const numberMap = {
        '영': 0, '일': 1, '이': 2, '삼': 3, '사': 4,
        '오': 5, '육': 6, '칠': 7, '팔': 8, '구': 9
    };
    
    const unitMap = {
        '십': 10, '백': 100, '천': 1000, 
        '만': 10000, '억': 100000000, '조': 1000000000000, '경': 10000000000000000
    };
    
    let result = 0;
    let current = 0;
    let temp = 0;
    
    for (let char of koreanNum) {
        if (numberMap.hasOwnProperty(char)) {
            temp = numberMap[char];
        } else if (unitMap.hasOwnProperty(char)) {
            const unit = unitMap[char];
            
            if (unit >= 10000) {
                result += (current + temp) * unit;
                current = 0;
                temp = 0;
            } else {
                current += (temp === 0 ? 1 : temp) * unit;
                temp = 0;
            }
        }
    }
    
    result += current + temp;
    return result.toString();
}

// 역방향 전처리: R1-R3 + 한글 숫자 완전 변환
function preprocessReverseComplete(text, debugLevel = 0) {
    if (!text) return "";

    const originalText = text.trim();
    if (debugLevel >= 2) {
        console.log(`역방향 전처리 시작: "${originalText}"`);
    }

    // Step R1-R3: 기본 역방향 전처리
    let processed = applyReversePreprocessing(originalText);
    
    // Step R4: 복합 한글 숫자 → 아라비아 숫자 (사천사백 → 4400)
    processed = convertKoreanNumberToArabic(processed, debugLevel);

    if (debugLevel >= 2) {
        console.log(`역방향 전처리 완료: "${originalText}" → "${processed}"`);
    }

    return processed;
}

// 이중 역방향 전처리: 두 가지 버전 생성
function preprocessReverseTextDual(text, debugLevel = 0) {
    if (!text) return { basicVersion: "", completeVersion: "" };

    const originalText = text.trim();
    if (debugLevel >= 2) {
        console.log(`이중 역방향 전처리 시작: "${originalText}"`);
    }

    // 두 가지 버전 생성
    const basicVersion = applyReversePreprocessing(originalText); // R1-R3만 적용
    const completeVersion = preprocessReverseComplete(originalText, debugLevel); // R1-R4까지 적용

    if (debugLevel >= 2) {
        console.log(`이중 역방향 전처리 완료:`);
        console.log(`  기본 버전: "${originalText}" → "${basicVersion}"`);
        console.log(`  완전 버전: "${originalText}" → "${completeVersion}"`);
    }

    return { basicVersion, completeVersion };
}

// 기존 함수는 호환성을 위해 유지
function preprocessReverseText(text, debugLevel) {
    const dual = preprocessReverseTextDual(text, debugLevel);
    return dual.completeVersion;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        applyReversePreprocessing,
        convertKoreanNumberToArabic,
        convertSingleKoreanToArabic,
        preprocessReverseComplete,
        preprocessReverseTextDual,
        preprocessReverseText
    };
} else {
    // Browser environment - expose as global object
    window.ReversePreprocessor = {
        applyReversePreprocessing,
        convertKoreanNumberToArabic,
        convertSingleKoreanToArabic,
        preprocessReverseComplete,
        preprocessReverseTextDual,
        preprocessReverseText
    };
}