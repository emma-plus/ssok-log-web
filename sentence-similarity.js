/**
 * 문장 특화 유사도 계산 모듈 (sentence-similarity.js)
 * 
 * 이 모듈은 문장 간의 유사도를 정교하게 계산하는 기능을 제공합니다:
 * - 길이 페널티 및 문장 완성도 평가
 * - 키워드 중심성 강화
 * - 문맥 분석 및 STT 오류 보정
 * - 통합 문장 유사도 계산
 */

/**
 * 문장 길이 기반 페널티 계산
 * @param {string} expectedText - 정답 문장
 * @param {string} candidateText - 사용자 발화 문장
 * @returns {number} - 길이 페널티 점수 (0~1)
 */
function calculateLengthPenalty(expectedText, candidateText) {
    const expectedLen = expectedText.trim().length;
    const candidateLen = candidateText.trim().length;
    
    // 빈 문자열 처리
    if (candidateLen === 0) return 0;
    
    // 길이 비율 계산 (0~1)
    const lengthRatio = Math.min(candidateLen, expectedLen) / Math.max(candidateLen, expectedLen);
    
    // 극히 짧은 문장 페널티 (10글자 미만)
    const shortPenalty = candidateLen < 10 ? 0.5 : 1.0;
    
    // 길이 차이가 큰 경우 페널티 (30% 이하로 짧으면 절반 페널티)
    const lengthPenalty = lengthRatio > 0.3 ? lengthRatio : lengthRatio * 0.5;
    
    return lengthPenalty * shortPenalty;
}

/**
 * 문장 완성도 평가
 * @param {string} text - 평가할 문장
 * @param {string} keyword - 필수 키워드
 * @returns {number} - 완성도 점수 (0~1)
 */
function calculateCompletenessScore(text, keyword) {
    if (!text || text.trim().length === 0) return 0;
    
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.trim().length > 0);
    
    let score = 0;
    
    // 완전한 문장 구조 여부 (20점)
    const hasCompleteStructure = sentences.some(s => 
        s.includes('습니다') || s.includes('해요') || s.includes('입니다') ||
        s.includes('드리겠습니다') || s.includes('드릴게요') || s.includes('됩니다')
    );
    if (hasCompleteStructure) score += 0.2;
    
    // 적절한 단어 수 (15점)
    if (words.length >= 5) score += 0.15;
    if (words.length >= 10) score += 0.1; // 추가 보너스
    
    // 키워드 주변 문맥 존재 (25점)
    const keywordIndex = text.indexOf(keyword);
    if (keywordIndex > 0 && keywordIndex < text.length - keyword.length) {
        score += 0.25;
    }
    
    // 문장 부호 포함 (10점)
    if (/[.!?]/.test(text)) score += 0.1;
    
    // 존댓말/정중한 표현 (15점)
    const politeExpressions = ['고객님', '부탁드립니다', '죄송합니다', '감사합니다', '안내', '도와드리겠습니다'];
    const hasPoliteExpression = politeExpressions.some(expr => text.includes(expr));
    if (hasPoliteExpression) score += 0.15;
    
    // 숫자나 구체적 정보 포함 (5점)
    if (/\d+/.test(text)) score += 0.05;
    
    return Math.min(score, 1.0);
}

/**
 * 키워드 주변 문맥 추출
 * @param {string} text - 전체 텍스트
 * @param {string} keyword - 키워드
 * @param {number} windowSize - 앞뒤로 추출할 단어 수
 * @returns {string} - 키워드 주변 문맥
 */
function extractKeywordContext(text, keyword, windowSize = 3) {
    const words = text.split(/\s+/);
    const keywordIndex = words.findIndex(word => word.includes(keyword));
    
    if (keywordIndex === -1) return '';
    
    const start = Math.max(0, keywordIndex - windowSize);
    const end = Math.min(words.length, keywordIndex + windowSize + 1);
    
    return words.slice(start, end).join(' ');
}

/**
 * 문맥 유사도 계산 (간단한 자카드 유사도 기반)
 * @param {string} context1 - 첫 번째 문맥
 * @param {string} context2 - 두 번째 문맥
 * @returns {number} - 문맥 유사도 (0~1)
 */
function calculateContextSimilarity(context1, context2) {
    if (!context1 || !context2) return 0;
    
    const words1 = new Set(context1.toLowerCase().split(/\s+/));
    const words2 = new Set(context2.toLowerCase().split(/\s+/));
    
    // 자카드 유사도 계산
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
}

/**
 * 키워드 가중 유사도 계산
 * @param {string} expectedText - 정답 문장
 * @param {string} candidateText - 사용자 발화 문장
 * @param {string} keyword - 키워드
 * @param {number} baseSimilarity - 기본 임베딩 유사도
 * @returns {number} - 키워드 가중 유사도
 */
function calculateKeywordWeightedSimilarity(expectedText, candidateText, keyword, baseSimilarity) {
    // 키워드 포함 여부 확인 (대소문자 무시)
    const keywordIncluded = candidateText.toLowerCase().includes(keyword.toLowerCase());
    
    if (!keywordIncluded) {
        // 키워드 미포함 시 STT 오류 가능성 확인
        let sttSimilarity = 0;
        if (typeof STTSimilarity !== 'undefined') {
            sttSimilarity = STTSimilarity.calculateJaroWinkler(keyword, candidateText);
        }
        
        if (sttSimilarity < 0.7) {
            return baseSimilarity * 0.3; // 키워드 없으면 대폭 감점
        }
    }
    
    // 키워드 주변 문맥 분석
    const keywordContext = extractKeywordContext(candidateText, keyword);
    const expectedContext = extractKeywordContext(expectedText, keyword);
    
    // 문맥 유사도 계산
    const contextSimilarity = calculateContextSimilarity(keywordContext, expectedContext);
    
    // 키워드 포함 보너스
    const keywordBonus = keywordIncluded ? 0.1 : 0;
    
    // 최종 가중 유사도
    return Math.min((baseSimilarity * 0.6) + (contextSimilarity * 0.3) + keywordBonus, 1.0);
}

/**
 * 문장 특화 STT 오류 패턴 (기존 stt-similarity.js의 패턴을 참조)
 */
function getSentenceSTTErrorPatterns() {
    // stt-similarity.js의 패턴을 재사용하거나 확장
    if (typeof STTSimilarity !== 'undefined' && STTSimilarity.KOREAN_STT_ERROR_PATTERNS) {
        return STTSimilarity.KOREAN_STT_ERROR_PATTERNS;
    }
    
    // 기본 패턴 (stt-similarity.js가 로드되지 않은 경우)
    return {
    // 종성 혼동
    '끝나는': ['끊나는', '끈나는', '끙나는'],
    '도와드리겠습니다': ['보안드리겠습니다', '도안드리겠습니다', '도와드기겠습니다'],
    '준비': ['즌비', '준비해', '준배'],
    
    // 모음 혼동
    '서류': ['서뤼', '설류', '셔류'],
    '확인': ['화긴', '확긴', '확인해'],
    '필요': ['핑요', '비료', '필료'],
    
    // 자음 혼동
    '클라우드': ['클라우두', '클라우드로', '클라둣'],
    '인치': ['인치로', '인지', '인차'],
    '고객님': ['고객님께', '고객닙', '고객님이'],
    
    // 복합 오류
    '번거로우시겠지만': ['번거로우셨지만', '번거로시겠지만', '번거로우시겠습니다만'],
    '죄송하지만': ['죄송합니다만', '죄송하시만', '죄송하지만서']
    };
}

/**
 * 향상된 STT 오류 검사 및 보정
 * @param {string} expected - 정답 텍스트
 * @param {string} candidate - 사용자 발화 텍스트
 * @returns {number} - STT 보정 유사도
 */
function enhancedSTTErrorCheck(expected, candidate) {
    // 기존 STT 메트릭 (STTSimilarity가 있는 경우)
    let maxSimilarity = 0;
    if (typeof STTSimilarity !== 'undefined') {
        maxSimilarity = STTSimilarity.calculateEnsemble(expected, candidate);
    }
    
    // 패턴 기반 오류 체크
    const errorPatterns = getSentenceSTTErrorPatterns();
    for (const [correct, errors] of Object.entries(errorPatterns)) {
        if (expected.includes(correct)) {
            for (const error of errors) {
                if (candidate.includes(error)) {
                    // 오류 패턴 매칭 시 보정
                    const corrected = candidate.replace(error, correct);
                    
                    // 보정된 텍스트로 유사도 재계산
                    let correctedSimilarity = 0;
                    if (typeof STTSimilarity !== 'undefined') {
                        correctedSimilarity = STTSimilarity.calculateEnsemble(expected, corrected);
                    }
                    
                    // 약간의 페널티를 적용하여 최대값 업데이트
                    maxSimilarity = Math.max(maxSimilarity, correctedSimilarity * 0.9);
                }
            }
        }
    }
    
    return maxSimilarity;
}

/**
 * 통합 문장 유사도 계산 (메인 함수)
 * @param {Array} expectedEmbedding - 정답의 임베딩 벡터
 * @param {Array} candidateEmbedding - 사용자 발화의 임베딩 벡터
 * @param {string} expectedText - 정답 문장
 * @param {string} candidateText - 사용자 발화 문장
 * @param {string} keyword - 키워드
 * @returns {Object} - 상세한 유사도 분석 결과
 */
function calculateSentenceEnhancedSimilarity(expectedEmbedding, candidateEmbedding, expectedText, candidateText, keyword) {
    // 1. 기본 임베딩 유사도 (SimilarityCalculator가 있는 경우)
    let baseSimilarity = 0.5; // 기본값
    if (typeof SimilarityCalculator !== 'undefined') {
        baseSimilarity = SimilarityCalculator.fastCosineSimilarity(expectedEmbedding, candidateEmbedding);
    }
    
    // 2. 길이 페널티
    const lengthPenalty = calculateLengthPenalty(expectedText, candidateText);
    
    // 3. 문장 완성도
    const completeness = calculateCompletenessScore(candidateText, keyword);
    
    // 4. 키워드 가중 유사도
    const keywordWeighted = calculateKeywordWeightedSimilarity(expectedText, candidateText, keyword, baseSimilarity);
    
    // 5. STT 오류 보정
    const sttCorrected = enhancedSTTErrorCheck(expectedText, candidateText);
    
    // 6. 최종 점수 계산 (가중 평균)
    const weights = {
        keywordWeighted: 0.4,    // 키워드 중심 유사도 (40%)
        baseSimilarity: 0.25,    // 기본 임베딩 유사도 (25%)
        sttCorrected: 0.2,       // STT 보정 유사도 (20%)
        completeness: 0.15       // 문장 완성도 (15%)
    };
    
    const weightedScore = (
        keywordWeighted * weights.keywordWeighted +
        baseSimilarity * weights.baseSimilarity +
        sttCorrected * weights.sttCorrected +
        completeness * weights.completeness
    );
    
    // 7. 길이 페널티 적용
    const finalScore = Math.min(weightedScore * lengthPenalty, 1.0);
    
    return {
        finalScore: finalScore,
        components: {
            baseSimilarity: baseSimilarity,
            keywordWeighted: keywordWeighted,
            sttCorrected: sttCorrected,
            completeness: completeness,
            lengthPenalty: lengthPenalty
        },
        analysis: {
            keywordIncluded: candidateText.toLowerCase().includes(keyword.toLowerCase()),
            candidateLength: candidateText.trim().length,
            expectedLength: expectedText.trim().length,
            lengthRatio: candidateText.trim().length / expectedText.trim().length,
            wordCount: candidateText.split(/\s+/).filter(w => w.trim().length > 0).length
        }
    };
}

/**
 * 문장 유사도 품질 진단
 * @param {string} candidateText - 사용자 발화 문장
 * @param {string} keyword - 키워드
 * @returns {Object} - 품질 진단 결과
 */
function diagnoseSentenceQuality(candidateText, keyword) {
    const issues = [];
    const suggestions = [];
    
    // 빈 문자열 체크
    if (!candidateText || candidateText.trim().length === 0) {
        issues.push('발화 내용이 없습니다');
        suggestions.push('음성 인식이 제대로 되었는지 확인해주세요');
        return { issues, suggestions, quality: 'very_low' };
    }
    
    // 키워드 포함 여부
    if (!candidateText.toLowerCase().includes(keyword.toLowerCase())) {
        issues.push('키워드가 포함되지 않았습니다');
        suggestions.push(`"${keyword}" 키워드가 포함된 문장으로 발화해주세요`);
    }
    
    // 문장 길이 체크
    if (candidateText.trim().length < 10) {
        issues.push('발화가 너무 짧습니다');
        suggestions.push('완전한 문장으로 발화해주세요');
    }
    
    // 단어 수 체크
    const wordCount = candidateText.split(/\s+/).filter(w => w.trim().length > 0).length;
    if (wordCount < 3) {
        issues.push('단어 수가 부족합니다');
        suggestions.push('더 자세한 내용으로 발화해주세요');
    }
    
    // 문장 완성도 체크
    const completeness = calculateCompletenessScore(candidateText, keyword);
    if (completeness < 0.3) {
        issues.push('문장이 불완전합니다');
        suggestions.push('정중한 표현과 완전한 문장으로 발화해주세요');
    }
    
    // 품질 등급 결정
    let quality = 'high';
    if (issues.length >= 3) quality = 'very_low';
    else if (issues.length === 2) quality = 'low';
    else if (issues.length === 1) quality = 'medium';
    
    return { issues, suggestions, quality };
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateLengthPenalty,
        calculateCompletenessScore,
        extractKeywordContext,
        calculateContextSimilarity,
        calculateKeywordWeightedSimilarity,
        enhancedSTTErrorCheck,
        calculateSentenceEnhancedSimilarity,
        diagnoseSentenceQuality,
        getSentenceSTTErrorPatterns
    };
} else {
    // Browser environment - expose as global object
    window.SentenceSimilarity = {
        calculateLengthPenalty,
        calculateCompletenessScore,
        extractKeywordContext,
        calculateContextSimilarity,
        calculateKeywordWeightedSimilarity,
        enhancedSTTErrorCheck,
        calculateSentenceEnhancedSimilarity,
        diagnoseSentenceQuality,
        getSentenceSTTErrorPatterns
    };
}