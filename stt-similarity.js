/**
 * STT 특화 유사도 계산 모듈 (stt-similarity.js)
 * 
 * 음성 인식(STT) 특유의 오류 패턴을 고려한 유사도 메트릭 제공:
 * - Jaro-Winkler Distance: 부분 일치 및 prefix 가중치
 * - Levenshtein Distance: 편집 거리 기반
 * - Korean Phonetic Similarity: 한국어 음성학적 혼동 패턴
 */

// 1. Jaro-Winkler Distance 구현
function jaroWinklerSimilarity(s1, s2) {
    if (!s1 || !s2 || typeof s1 !== 'string' || typeof s2 !== 'string') {
        return 0;
    }
    
    if (s1 === s2) return 1;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    // 매치 윈도우 크기 (두 문자열 길이 중 큰 값의 절반 - 1, 최소 0)
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    if (matchWindow < 0) return 0;
    
    // 매치된 문자들 추적
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // 매치 찾기
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, len2);
        
        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }
    
    if (matches === 0) return 0;
    
    // 전치(transposition) 계산
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        
        while (!s2Matches[k]) k++;
        
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }
    
    // Jaro 유사도 계산
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    // Winkler 수정: prefix 일치에 대한 보너스 (최대 4글자까지)
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
        if (s1[i] === s2[i]) {
            prefix++;
        } else {
            break;
        }
    }
    
    const jaroWinkler = jaro + (0.1 * prefix * (1 - jaro));
    
    return Math.round(jaroWinkler * 1000) / 1000;
}

// 2. Levenshtein Distance 기반 유사도
function levenshteinSimilarity(s1, s2) {
    if (!s1 || !s2 || typeof s1 !== 'string' || typeof s2 !== 'string') {
        return 0;
    }
    
    if (s1 === s2) return 1;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0) return 0;
    if (len2 === 0) return 0;
    
    // 동적 계획법을 위한 2차원 배열 (메모리 최적화 버전)
    let prevRow = new Array(len2 + 1);
    let currRow = new Array(len2 + 1);
    
    // 첫 번째 행 초기화
    for (let j = 0; j <= len2; j++) {
        prevRow[j] = j;
    }
    
    // 편집 거리 계산
    for (let i = 1; i <= len1; i++) {
        currRow[0] = i;
        
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            
            currRow[j] = Math.min(
                currRow[j - 1] + 1,     // 삽입
                prevRow[j] + 1,         // 삭제
                prevRow[j - 1] + cost   // 치환
            );
        }
        
        // 행 교체
        [prevRow, currRow] = [currRow, prevRow];
    }
    
    const editDistance = prevRow[len2];
    const maxLength = Math.max(len1, len2);
    
    // 편집 거리를 0-1 유사도로 변환
    const similarity = 1 - (editDistance / maxLength);
    
    return Math.round(similarity * 1000) / 1000;
}

// 3. 한국어 기본 음성학적 거리 (단순 버전)
function koreanPhoneticSimilarity(s1, s2) {
    if (!s1 || !s2 || typeof s1 !== 'string' || typeof s2 !== 'string') {
        return 0;
    }
    
    if (s1 === s2) return 1;
    
    // 한국어 음성학적 혼동 매핑 (기본 버전)
    const phoneticMap = {
        // 자음 혼동 패턴
        'ㅍ': ['ㅋ', 'ㅂ'],           // 프 ↔ 크, 프 ↔ 브
        'ㅋ': ['ㅍ', 'ㄱ', 'ㅌ'],      // 크 ↔ 프, 크 ↔ 그, 크 ↔ 트
        'ㅌ': ['ㄷ', 'ㅊ', 'ㅋ'],      // 트 ↔ 드, 트 ↔ 치, 트 ↔ 크
        'ㅊ': ['ㅌ', 'ㅈ', 'ㅅ'],      // 치 ↔ 트, 치 ↔ 지, 치 ↔ 시
        'ㅂ': ['ㅍ', 'ㅁ'],           // 브 ↔ 프, 브 ↔ 므
        'ㄷ': ['ㅌ', 'ㄴ'],           // 드 ↔ 트, 드 ↔ 느
        'ㄱ': ['ㅋ'],                // 그 ↔ 크
        'ㅈ': ['ㅊ'],                // 지 ↔ 치
        'ㅅ': ['ㅊ'],                // 시 ↔ 치
        
        // 모음 혼동 패턴
        'ㅓ': ['ㅗ', 'ㅡ'],           // 어 ↔ 오, 어 ↔ 으
        'ㅔ': ['ㅐ', 'ㅖ'],           // 에 ↔ 애, 에 ↔ 예
        'ㅚ': ['ㅞ', 'ㅙ', 'ㅗ'],      // 외 ↔ 웨, 외 ↔ 왜, 외 ↔ 오
        'ㅐ': ['ㅔ', 'ㅙ'],           // 애 ↔ 에, 애 ↔ 왜
        'ㅗ': ['ㅓ', 'ㅚ', 'ㅜ'],      // 오 ↔ 어, 오 ↔ 외, 오 ↔ 우
        'ㅜ': ['ㅡ', 'ㅗ'],           // 우 ↔ 으, 우 ↔ 오
        'ㅡ': ['ㅜ', 'ㅓ'],           // 으 ↔ 우, 으 ↔ 어
        'ㅣ': ['ㅔ'],                // 이 ↔ 에
    };
    
    // 문자별 음성학적 유사도 점수 계산
    function getPhoneticScore(char1, char2) {
        if (char1 === char2) return 1;
        
        // 직접 매핑 확인
        if (phoneticMap[char1] && phoneticMap[char1].includes(char2)) {
            return 0.8; // 높은 음성학적 유사도
        }
        if (phoneticMap[char2] && phoneticMap[char2].includes(char1)) {
            return 0.8;
        }
        
        return 0; // 음성학적 연관성 없음
    }
    
    // 단순 문자 대응 방식 (개선 가능)
    const len1 = s1.length;
    const len2 = s2.length;
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    
    let totalScore = 0;
    let comparisons = 0;
    
    // 동일 위치 문자들의 음성학적 유사도 계산
    for (let i = 0; i < minLen; i++) {
        totalScore += getPhoneticScore(s1[i], s2[i]);
        comparisons++;
    }
    
    // 길이 차이에 대한 패널티 적용
    const lengthPenalty = (maxLen - minLen) / maxLen;
    let similarity = 0;
    
    if (comparisons > 0) {
        similarity = (totalScore / comparisons) * (1 - lengthPenalty * 0.5);
    }
    
    return Math.round(similarity * 1000) / 1000;
}

// 4. STT 통합 유사도 계산 함수
function calculateSTTSimilarity(s1, s2, weights = {}) {
    const defaultWeights = {
        jaroWinkler: 0.4,     // 부분 일치 중시
        levenshtein: 0.3,     // 편집 거리
        phonetic: 0.3         // 음성학적 유사성
    };
    
    const finalWeights = { ...defaultWeights, ...weights };
    
    const metrics = {
        jaroWinkler: jaroWinklerSimilarity(s1, s2),
        levenshtein: levenshteinSimilarity(s1, s2),
        phonetic: koreanPhoneticSimilarity(s1, s2)
    };
    
    // 가중 평균 계산
    const weightedScore = 
        finalWeights.jaroWinkler * metrics.jaroWinkler +
        finalWeights.levenshtein * metrics.levenshtein +
        finalWeights.phonetic * metrics.phonetic;
    
    return {
        ...metrics,
        weighted: Math.round(weightedScore * 1000) / 1000,
        breakdown: metrics
    };
}

// 5. 한국어 특화 STT 오류 패턴 정의 (확장된 버전)
const KOREAN_STT_ERROR_PATTERNS = {
    // 종성 혼동 (받침 소리)
    '끝나는': ['끊나는', '끈나는', '끙나는'],
    '도와드리겠습니다': ['보안드리겠습니다', '도안드리겠습니다', '도와드기겠습니다', '도와드립겠습니다'],
    '준비': ['즌비', '준배', '즁비'],
    '확인': ['화긴', '확긴', '확인해', '확인을'],
    '필요': ['핑요', '비료', '필료', '필요해'],
    
    // 모음 혼동
    '서류': ['서뤼', '설류', '셔류', '서루'],
    '클라우드': ['클라우두', '클라우드로', '클라둣', '클라우드를'],
    '인치': ['인치로', '인지', '인차', '인치를'],
    '외부': ['웨부', '외부를', '외뷰'],
    '고객님': ['고객님께', '고객닙', '고객님이', '고객님을'],
    
    // 자음 혼동 (ㅍ↔ㅋ, ㅌ↔ㄷ 등)
    '티타늄': ['티파늄', '키타늄', '티타니움'],
    '프로': ['크로', '프로를', '플로'],
    '캔바': ['캔바를', '켄바', '캔바스'],
    '스케일러': ['스케일로', '스케일러를', '스케일'],
    
    // 복합 오류 (길이가 긴 단어/구문)
    '번거로우시겠지만': ['번거로우셨지만', '번거로시겠지만', '번거로우시겠습니다만', '번거로우시겠지만서'],
    '죄송하지만': ['죄송합니다만', '죄송하시만', '죄송하지만서', '죄송하지만은'],
    '감사합니다': ['감사합니다요', '감사드립니다', '감사해요', '고맙습니다'],
    
    // 숫자 관련 오류
    '8인치': ['알 인치', '8 인치', '팔 인치', '팔인치'],
    '10분': ['십분', '10 분', '열분', '10분간'],
    '4.2mm': ['4점2미리', '4.2미리', '사점이미리'],
    
    // 기술 용어 관련
    'CCTV': ['씨씨티비', 'CC TV', '시시티비'],
    'WiFi': ['와이파이', '와이 파이', '와파이'],
    'USB': ['유에스비', 'U S B', '유에스비포트']
};

// 6. 패턴 기반 STT 오류 보정 함수
function correctSTTErrorsByPattern(text, targetKeyword) {
    let correctedText = text;
    let corrections = [];
    
    // 각 오류 패턴에 대해 검사 및 보정
    for (const [correct, errors] of Object.entries(KOREAN_STT_ERROR_PATTERNS)) {
        for (const error of errors) {
            if (correctedText.includes(error)) {
                // 대상 키워드와 관련된 경우에만 보정
                if (!targetKeyword || correct.includes(targetKeyword) || targetKeyword.includes(correct)) {
                    correctedText = correctedText.replace(new RegExp(error, 'g'), correct);
                    corrections.push({
                        original: error,
                        corrected: correct,
                        position: text.indexOf(error)
                    });
                }
            }
        }
    }
    
    return {
        correctedText,
        corrections,
        hasCorrections: corrections.length > 0
    };
}

// 7. 향상된 STT 유사도 계산 (패턴 보정 포함)
function calculateEnhancedSTTSimilarity(s1, s2, targetKeyword = null) {
    // 원본 유사도 계산
    const originalResult = calculateSTTSimilarity(s1, s2);
    
    // 패턴 기반 보정 시도
    const correction1 = correctSTTErrorsByPattern(s1, targetKeyword);
    const correction2 = correctSTTErrorsByPattern(s2, targetKeyword);
    
    let maxSimilarity = originalResult.weighted;
    let bestResult = originalResult;
    let appliedCorrections = [];
    
    // s1을 보정한 경우
    if (correction1.hasCorrections) {
        const correctedResult = calculateSTTSimilarity(correction1.correctedText, s2);
        if (correctedResult.weighted > maxSimilarity) {
            maxSimilarity = correctedResult.weighted * 0.95; // 보정 페널티
            bestResult = correctedResult;
            appliedCorrections.push(...correction1.corrections);
        }
    }
    
    // s2를 보정한 경우
    if (correction2.hasCorrections) {
        const correctedResult = calculateSTTSimilarity(s1, correction2.correctedText);
        if (correctedResult.weighted > maxSimilarity) {
            maxSimilarity = correctedResult.weighted * 0.95; // 보정 페널티
            bestResult = correctedResult;
            appliedCorrections = correction2.corrections;
        }
    }
    
    // 양쪽 모두 보정한 경우
    if (correction1.hasCorrections && correction2.hasCorrections) {
        const doubleCorrectedResult = calculateSTTSimilarity(correction1.correctedText, correction2.correctedText);
        if (doubleCorrectedResult.weighted > maxSimilarity) {
            maxSimilarity = doubleCorrectedResult.weighted * 0.9; // 더 큰 보정 페널티
            bestResult = doubleCorrectedResult;
            appliedCorrections = [...correction1.corrections, ...correction2.corrections];
        }
    }
    
    return {
        ...bestResult,
        enhanced: maxSimilarity,
        originalSimilarity: originalResult.weighted,
        corrections: appliedCorrections,
        hasCorrections: appliedCorrections.length > 0
    };
}

// 8. Wrapper 함수들 (기존 코드 호환성을 위해)
function calculateJaroWinkler(s1, s2) {
    return jaroWinklerSimilarity(s1, s2);
}

function calculateLevenshtein(s1, s2) {
    return levenshteinSimilarity(s1, s2);
}

function calculatePhonetic(s1, s2) {
    return koreanPhoneticSimilarity(s1, s2);
}

function calculateEnsemble(s1, s2, targetKeyword = null) {
    const enhanced = calculateEnhancedSTTSimilarity(s1, s2, targetKeyword);
    return enhanced.enhanced || enhanced.weighted;
}

// 9. 디버깅용 상세 분석 함수
function analyzeSTTSimilarity(s1, s2, targetKeyword = null) {
    const enhanced = calculateEnhancedSTTSimilarity(s1, s2, targetKeyword);
    
    console.log(`=== STT 유사도 분석: "${s1}" vs "${s2}" ===`);
    console.log(`Jaro-Winkler: ${enhanced.jaroWinkler}`);
    console.log(`Levenshtein: ${enhanced.levenshtein}`);
    console.log(`Korean Phonetic: ${enhanced.phonetic}`);
    console.log(`원본 가중 평균: ${enhanced.originalSimilarity}`);
    console.log(`보정 후 점수: ${enhanced.enhanced}`);
    
    if (enhanced.hasCorrections) {
        console.log('적용된 보정:');
        enhanced.corrections.forEach(corr => {
            console.log(`  - "${corr.original}" → "${corr.corrected}"`);
        });
    } else {
        console.log('보정 적용 안됨');
    }
    
    console.log('=============================================');
    
    return enhanced;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        jaroWinklerSimilarity,
        levenshteinSimilarity,
        koreanPhoneticSimilarity,
        calculateSTTSimilarity,
        analyzeSTTSimilarity,
        
        // 새로 추가된 함수들
        correctSTTErrorsByPattern,
        calculateEnhancedSTTSimilarity,
        calculateJaroWinkler,
        calculateLevenshtein,
        calculatePhonetic,
        calculateEnsemble,
        
        // 상수
        KOREAN_STT_ERROR_PATTERNS
    };
} else {
    // Browser environment - expose as global object
    window.STTSimilarity = {
        jaroWinklerSimilarity,
        levenshteinSimilarity,
        koreanPhoneticSimilarity,
        calculateSTTSimilarity,
        analyzeSTTSimilarity,
        
        // 새로 추가된 함수들
        correctSTTErrorsByPattern,
        calculateEnhancedSTTSimilarity,
        calculateJaroWinkler,
        calculateLevenshtein,
        calculatePhonetic,
        calculateEnsemble,
        
        // 상수
        KOREAN_STT_ERROR_PATTERNS
    };
}