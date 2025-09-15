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

// 5. 디버깅용 상세 분석 함수
function analyzeSTTSimilarity(s1, s2) {
    const result = calculateSTTSimilarity(s1, s2);
    
    console.log(`=== STT 유사도 분석: "${s1}" vs "${s2}" ===`);
    console.log(`Jaro-Winkler: ${result.jaroWinkler}`);
    console.log(`Levenshtein: ${result.levenshtein}`);
    console.log(`Korean Phonetic: ${result.phonetic}`);
    console.log(`가중 평균: ${result.weighted}`);
    console.log('=============================================');
    
    return result;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        jaroWinklerSimilarity,
        levenshteinSimilarity,
        koreanPhoneticSimilarity,
        calculateSTTSimilarity,
        analyzeSTTSimilarity
    };
} else {
    // Browser environment - expose as global object
    window.STTSimilarity = {
        jaroWinklerSimilarity,
        levenshteinSimilarity,
        koreanPhoneticSimilarity,
        calculateSTTSimilarity,
        analyzeSTTSimilarity
    };
}