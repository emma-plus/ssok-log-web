/**
 * 벡터 유사도 계산 라이브러리
 * 다양한 유사도 측정 방법을 제공합니다.
 */

// 벡터 크기(magnitude) 계산
function vectorMagnitude(vec) {
    return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

// 1. 코사인 유사도 (표준)
function cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }

    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const magnitude1 = vectorMagnitude(vec1);
    const magnitude2 = vectorMagnitude(vec2);

    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
    }

    const similarity = dotProduct / (magnitude1 * magnitude2);
    // -1과 1 사이로 클램핑 (부동소수점 오차 방지)
    return Math.max(-1, Math.min(1, similarity));
}

// 2. 정규화된 벡터용 빠른 코사인 유사도 (내적만 계산)
function fastCosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    return vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
}

// 3. 유클리드 거리 기반 유사도
function euclideanSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        sum += Math.pow(vec1[i] - vec2[i], 2);
    }
    const distance = Math.sqrt(sum);
    // 0-1 범위로 정규화
    return 1 / (1 + distance);
}

// 4. 맨하탄 거리 기반 유사도
function manhattanSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        sum += Math.abs(vec1[i] - vec2[i]);
    }
    // 0-1 범위로 정규화
    return 1 / (1 + sum);
}

// 5. 가중치 기반 코사인 유사도
function weightedCosineSimilarity(vec1, vec2, weights) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    if (weights && weights.length !== vec1.length) {
        throw new Error("가중치 배열 길이가 벡터와 다릅니다.");
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vec1.length; i++) {
        const w = weights ? weights[i] : 1;
        dotProduct += w * vec1[i] * vec2[i];
        normA += w * vec1[i] * vec1[i];
        normB += w * vec2[i] * vec2[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return Math.max(-1, Math.min(1, dotProduct / denominator));
}

// 6. 피어슨 상관계수
function pearsonCorrelation(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    const n = vec1.length;
    if (n === 0) return 0;
    
    const mean1 = vec1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = vec2.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
    
    for (let i = 0; i < n; i++) {
        const diff1 = vec1[i] - mean1;
        const diff2 = vec2[i] - mean2;
        numerator += diff1 * diff2;
        denominator1 += diff1 * diff1;
        denominator2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(denominator1) * Math.sqrt(denominator2);
    if (denominator === 0) return 0;
    
    return numerator / denominator;
}

// 7. 앙상블 유사도 (여러 방법의 가중 평균)
function ensembleSimilarity(vec1, vec2, weights = { cosine: 0.6, euclidean: 0.25, manhattan: 0.15 }) {
    const cosine = cosineSimilarity(vec1, vec2);
    const euclidean = euclideanSimilarity(vec1, vec2);
    const manhattan = manhattanSimilarity(vec1, vec2);
    
    return (
        weights.cosine * cosine +
        weights.euclidean * euclidean +
        weights.manhattan * manhattan
    );
}

// 8. 자카드 유사도 (이진 벡터용)
function jaccardSimilarity(vec1, vec2, threshold = 0.5) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    // 임계값을 기준으로 이진화
    const bin1 = vec1.map(v => v > threshold ? 1 : 0);
    const bin2 = vec2.map(v => v > threshold ? 1 : 0);
    
    let intersection = 0;
    let union = 0;
    
    for (let i = 0; i < bin1.length; i++) {
        intersection += bin1[i] * bin2[i];
        union += Math.max(bin1[i], bin2[i]);
    }
    
    return union === 0 ? 0 : intersection / union;
}

// 모든 유사도 계산 결과를 한 번에 반환하는 함수
function calculateAllSimilarities(vec1, vec2, options = {}) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    // 벡터 정규화 여부 확인
    const mag1 = vectorMagnitude(vec1);
    const mag2 = vectorMagnitude(vec2);
    const isNormalized = Math.abs(mag1 - 1.0) < 1e-6 && Math.abs(mag2 - 1.0) < 1e-6;
    
    const similarities = {};
    
    try {
        // 기본 코사인 유사도
        similarities.cosine = isNormalized ? 
            fastCosineSimilarity(vec1, vec2) : 
            cosineSimilarity(vec1, vec2);
        
        // 다른 유사도 계산들
        similarities.euclidean = euclideanSimilarity(vec1, vec2);
        similarities.manhattan = manhattanSimilarity(vec1, vec2);
        similarities.pearson = pearsonCorrelation(vec1, vec2);
        similarities.jaccard = jaccardSimilarity(vec1, vec2, options.jaccardThreshold || 0.5);
        
        // 가중치가 제공된 경우 가중 코사인 유사도
        if (options.weights) {
            similarities.weighted_cosine = weightedCosineSimilarity(vec1, vec2, options.weights);
        }
        
        // 앙상블 유사도
        similarities.ensemble = ensembleSimilarity(vec1, vec2, options.ensembleWeights);
        
        // 각 값을 소수점 3자리로 반올림
        Object.keys(similarities).forEach(key => {
            similarities[key] = Math.round(similarities[key] * 1000) / 1000;
        });
        
    } catch (error) {
        console.error('유사도 계산 중 오류:', error);
        // 오류 시 기본값
        Object.keys(similarities).forEach(key => {
            similarities[key] = 0;
        });
    }
    
    return similarities;
}

// STT 특화 하이브리드 유사도 계산 함수
function calculateSTTEnhancedSimilarities(vec1, vec2, text1, text2, options = {}) {
    if (vec1.length !== vec2.length) {
        throw new Error("벡터 길이가 다릅니다.");
    }
    
    // 1. 기존 임베딩 유사도 계산
    const semanticSimilarities = calculateAllSimilarities(vec1, vec2, options);
    
    // 2. STT 특화 메트릭 계산 (STTSimilarity 모듈 사용)
    let sttMetrics = {};
    if (typeof STTSimilarity !== 'undefined') {
        sttMetrics = {
            jaroWinkler: STTSimilarity.jaroWinklerSimilarity(text1, text2),
            levenshtein: STTSimilarity.levenshteinSimilarity(text1, text2),
            phonetic: STTSimilarity.koreanPhoneticSimilarity(text1, text2)
        };
    } else {
        console.warn('STTSimilarity 모듈을 찾을 수 없습니다. STT 메트릭이 비활성화됩니다.');
        sttMetrics = {
            jaroWinkler: 0,
            levenshtein: 0,
            phonetic: 0
        };
    }
    
    // 3. 가중 앙상블 점수 (실험적 가중치)
    const weights = {
        semantic: 0.4,      // 의미적 유사성 (코사인)
        jaroWinkler: 0.25,  // 부분 일치
        phonetic: 0.20,     // 음성학적 유사성
        levenshtein: 0.15   // 편집 거리
    };
    
    const sttScore = (
        weights.semantic * semanticSimilarities.cosine +
        weights.jaroWinkler * sttMetrics.jaroWinkler +
        weights.phonetic * sttMetrics.phonetic +
        weights.levenshtein * sttMetrics.levenshtein
    );
    
    // 4. 모든 메트릭을 포함한 결과 반환
    return {
        ...semanticSimilarities,
        stt_jaro_winkler: Math.round(sttMetrics.jaroWinkler * 1000) / 1000,
        stt_levenshtein: Math.round(sttMetrics.levenshtein * 1000) / 1000,
        stt_phonetic: Math.round(sttMetrics.phonetic * 1000) / 1000,
        stt_ensemble: Math.round(sttScore * 1000) / 1000
    };
}

// 유사도 결과 분석 함수
function analyzeSimilarities(similarities) {
    const methods = Object.keys(similarities);
    const values = Object.values(similarities);
    
    return {
        highest: {
            method: methods[values.indexOf(Math.max(...values))],
            value: Math.max(...values)
        },
        lowest: {
            method: methods[values.indexOf(Math.min(...values))],
            value: Math.min(...values)
        },
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        variance: (() => {
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
            return Math.round(variance * 1000) / 1000;
        })()
    };
}

// Node.js와 브라우저 환경 모두 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        vectorMagnitude,
        cosineSimilarity,
        fastCosineSimilarity,
        euclideanSimilarity,
        manhattanSimilarity,
        weightedCosineSimilarity,
        pearsonCorrelation,
        ensembleSimilarity,
        jaccardSimilarity,
        calculateAllSimilarities,
        calculateSTTEnhancedSimilarities,
        analyzeSimilarities
    };
} else {
    // 브라우저 환경에서는 전역 객체로 노출
    window.SimilarityCalculator = {
        vectorMagnitude,
        cosineSimilarity,
        fastCosineSimilarity,
        euclideanSimilarity,
        manhattanSimilarity,
        weightedCosineSimilarity,
        pearsonCorrelation,
        ensembleSimilarity,
        jaccardSimilarity,
        calculateAllSimilarities,
        calculateSTTEnhancedSimilarities,
        analyzeSimilarities
    };
}