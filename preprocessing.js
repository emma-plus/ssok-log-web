
// 기본 전처리 (Step 1-3): 한글숫자→아라비아숫자, 소수점 정규화, 단위 정규화
function applyBasePreprocessing(text) {
    let t = text.trim();

    // Step 1. 독립된 한글 숫자만 → 아라비아 숫자
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

    // Step 2. 소수점 표현 정규화
    t = t.replace(/(\d+)\s*(점|쩜|dot|point)\s*(\d+)/gi, "$1.$3");
    t = t.replace(/\b(점|쩜|dot|point)\b/gi, ".");

    // Step 3. 단위 정규화
    // 길이/거리 단위
    t = t.replace(/\b(밀리미터)\b/gi, "미리");
    t = t.replace(/\b(센티미터)\b/gi, "센치");
    t = t.replace(/\b(meter|미터)\b/gi, "미터");
    t = t.replace(/\b(킬로미터)\b/gi, "킬로미터");
    t = t.replace(/\b(inch|인치)\b/gi, "인치");
    t = t.replace(/(\d+)\s*mm\b/gi, "$1미리");
    t = t.replace(/(\d+)\s*cm\b/gi, "$1센치");
    t = t.replace(/(\d+)\s*m\b/gi, "$1미터");
    t = t.replace(/(\d+)\s*km\b/gi, "$1킬로미터");

    // 무게 단위
    t = t.replace(/\b(gram|그램)\b/gi, "그램");
    t = t.replace(/\b(킬로그램)\b/gi, "킬로그램");
    t = t.replace(/\b(밀리그램)\b/gi, "밀리그램");
    t = t.replace(/(\d+)\s*g\b/gi, "$1그램");
    t = t.replace(/(\d+)\s*kg\b/gi, "$1킬로그램");
    t = t.replace(/(\d+)\s*mg\b/gi, "$1밀리그램");

    // 시간 단위
    t = t.replace(/\b(second|초)\b/gi, "초");
    t = t.replace(/\b(minute|분)\b/gi, "분");
    t = t.replace(/\b(hour|시간)\b/gi, "시간");
    t = t.replace(/(\d+)\s*sec\b/gi, "$1초");
    t = t.replace(/(\d+)\s*min\b/gi, "$1분");
    t = t.replace(/(\d+)\s*hr\b/gi, "$1시간");

    // 용량/부피 단위
    t = t.replace(/\b(밀리리터)\b/gi, "밀리리터");
    t = t.replace(/\b(liter|리터)\b/gi, "리터");
    t = t.replace(/(\d+)\s*ml\b/gi, "$1밀리리터");
    t = t.replace(/(\d+)\s*l\b/gi, "$1리터");

    // 퍼센트 단위
    t = t.replace(/\b(percent|퍼센트)\b/gi, "퍼센트");
    t = t.replace(/%/g, "퍼센트");

    // 디지털 용량 단위
    t = t.replace(/\b기가\b/gi, "기가");
    t = t.replace(/\b메가\b/gi, "메가");
    t = t.replace(/\b킬로\b/gi, "킬로");
    t = t.replace(/\b테라\b/gi, "테라");
    t = t.replace(/(\d+)\s*gb\b/gi, "$1기가");
    t = t.replace(/(\d+)\s*mb\b/gi, "$1메가");
    t = t.replace(/(\d+)\s*kb\b/gi, "$1킬로");
    t = t.replace(/(\d+)\s*tb\b/gi, "$1테라");

    return t;
}

// 이중 전처리: 두 가지 버전 생성 (숫자 유지 + 한글 변환)
function preprocessLearningTextDual(text, debugLevel = 0) {
    if (!text) return { numericVersion: "", koreanVersion: "" };

    const originalText = text.trim();
    if (debugLevel >= 2) {
        console.log(`이중 전처리 시작: "${originalText}"`);
    }

    // Step 1-3까지는 공통 적용
    let baseProcessed = applyBasePreprocessing(originalText, debugLevel);

    // 두 가지 버전 생성
    const numericVersion = baseProcessed; // Step 1-3만 적용 (숫자 유지)
    const koreanVersion = numberToKorean(baseProcessed, debugLevel); // Step 4까지 적용 (한글 변환)

    if (debugLevel >= 2) {
        console.log(`이중 전처리 완료:`);
        console.log(`  숫자 유지 버전: "${originalText}" → "${numericVersion}"`);
        console.log(`  한글 변환 버전: "${originalText}" → "${koreanVersion}"`);
    }

    return { numericVersion, koreanVersion };
}

// 기존 함수는 호환성을 위해 유지 (한글 변환 버전 반환으로 복원)
function preprocessLearningText(text, debugLevel) {
    const dual = preprocessLearningTextDual(text, debugLevel);
    // 기존 동작 유지: 한글 변환 버전 반환
    return dual.koreanVersion;
}

// 숫자 → 한글 변환 함수 (텍스트 내 모든 숫자 패턴을 찾아서 변환)
function numberToKorean(text, debugLevel = 0) {
    if (!text || typeof text !== 'string') {
        console.error('숫자 → 한글 변환 함수 에러 : ', text)
        return text;
    }

    // 숫자 패턴을 찾아서 한글로 변환 (정수와 소수점 모두 지원)
    // 단어에 붙어있는 숫자도 포함 (AI6, 8.9m 등)
    return text.replace(/\d+(\.\d+)?/g, (match) => {
        const korean = convertSingleNumberToKorean(match);
        if (debugLevel >= 2) {
            console.log(`    숫자→한글 변환: "${match}" → "${korean}"`);
        }
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
        preprocessLearningText,
        preprocessLearningTextDual,
        applyBasePreprocessing,
        numberToKorean,
        convertSingleNumberToKorean,
        convertIntegerToKorean,
        convertDecimalToKorean
    };
} else {
    // Browser environment - expose as global object
    window.TextPreprocessor = {
        preprocessLearningText,
        preprocessLearningTextDual,
        applyBasePreprocessing,
        numberToKorean,
        convertSingleNumberToKorean,
        convertIntegerToKorean,
        convertDecimalToKorean
    };
}
