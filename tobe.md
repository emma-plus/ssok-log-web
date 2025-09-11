# STT 특화 유사도 개선 로드맵

## 📋 개요

현재 임베딩 기반 유사도 측정의 한계를 극복하고 STT(Speech-to-Text) 특유의 음성학적 오류 패턴을 반영한 하이브리드 유사도 시스템을 구축합니다.

### 핵심 문제 사례 및 목표

**1. 음성학적 혼동 (자음 유사성)**
- "프로스케일러" vs "크로스케일러" → 현재 0.159 → **목표 0.75+**
- "티타늄" vs "티파늄" → 현재 낮음 → **목표 0.8+** (ㅌ/ㅍ 혼동)

**2. 부분 일치 및 생략**
- "캔바" vs "캔바 캔" → 현재 낮음 → **목표 0.85+** (중복어 패턴)
- "도어 캠프" vs "도어캠" → 현재 낮음 → **목표 0.9+** (공백 제거)
- "알 인치" vs "8인치" → 현재 낮음 → **목표 0.85+** (한글→숫자 혼동)

**3. 음성학적 대체 및 탈락**
- "아티빗 보이스" vs "안티딥보이스" → 현재 낮음 → **목표 0.7+** (복합 음성 오류)
- "예뻐 티파늄" vs "티타늄" → 현재 극낮음 → **목표 0.6+** (무관 텍스트 + 핵심어)

**4. 숫자 표현 변환**
- "4천 사백" vs "4400" → 현재 낮음 → **목표 0.95+** (한글숫자→아라비아숫자)

**전체 시스템 목표**:
- 기존 0.3 이하 케이스의 **70%** 이상을 0.6+ 달성
- 사용자 승인률 **25%** 이상 증가
- STT 특화 케이스에서 평균 유사도 **40%** 개선 

---

## 🎯 Phase 1: 즉시 적용 가능 (1-2주)

### 1.1 Character-level 유사도 메트릭 추가

**목표**: 부분 일치 및 편집 거리 기반 유사도 추가

**작업 파일**: `stt-similarity.js` (신규 생성)

```javascript
/**
 * STT 특화 유사도 계산 모듈
 */

// 1. Jaro-Winkler Distance 구현
function jaroWinklerSimilarity(s1, s2) {
    // 구현 요구사항:
    // - 부분 일치에 대한 부분 점수 제공
    // - "프로스케일러" vs "크로스케일러" → 0.85+ 반환
    // - prefix 가중치 적용 (시작 부분 일치 시 점수 상승)
}

// 2. Levenshtein Distance 기반 유사도
function levenshteinSimilarity(s1, s2) {
    // 구현 요구사항:
    // - 편집 거리를 0-1 유사도로 변환
    // - 공식: 1 - (editDistance / maxLength)
    // - 삽입/삭제/치환 비용 동일
}

// 3. 한국어 기본 음성학적 거리 (단순 버전)
function koreanPhoneticSimilarity(s1, s2) {
    // 구현 요구사항:
    // - 자소 분해 후 음성학적 유사 문자 매핑
    // - ㅍ↔ㅋ, ㅂ↔ㅍ, ㅌ↔ㄷ, ㅊ↔ㅌ 등
    // - 유사 문자는 완전 일치로 처리
}

// 4. 통합 export
window.STTSimilarity = {
    jaroWinklerSimilarity,
    levenshteinSimilarity,
    koreanPhoneticSimilarity
};
```

**구현 지침**:
1. `stt-similarity.js` 파일 생성
2. 각 함수별로 단위 테스트 가능하도록 구현
3. 기존 `similarity.js`와 독립적으로 작동
4. 브라우저 환경에서 전역 객체로 노출

### 1.2 하이브리드 메트릭 시스템

**목표**: 기존 임베딩 유사도와 새 메트릭을 조합한 STT 특화 점수

**작업 파일**: `similarity.js` (기존 파일 확장)

```javascript
// calculateAllSimilarities 함수에 추가
function calculateSTTEnhancedSimilarities(vec1, vec2, text1, text2, options = {}) {
    // 1. 기존 임베딩 유사도 계산
    const semanticSimilarities = calculateAllSimilarities(vec1, vec2, options);
    
    // 2. STT 특화 메트릭 계산
    const sttMetrics = {
        jaroWinkler: STTSimilarity.jaroWinklerSimilarity(text1, text2),
        levenshtein: STTSimilarity.levenshteinSimilarity(text1, text2),
        phonetic: STTSimilarity.koreanPhoneticSimilarity(text1, text2)
    };
    
    // 3. 가중 앙상블 점수 (실험적 가중치)
    const sttScore = (
        0.4 * semanticSimilarities.cosine +     // 의미적 유사성
        0.25 * sttMetrics.jaroWinkler +         // 부분 일치
        0.20 * sttMetrics.phonetic +           // 음성학적 유사성
        0.15 * sttMetrics.levenshtein          // 편집 거리
    );
    
    return {
        ...semanticSimilarities,
        stt_jaro_winkler: sttMetrics.jaroWinkler,
        stt_levenshtein: sttMetrics.levenshtein,
        stt_phonetic: sttMetrics.phonetic,
        stt_ensemble: Math.round(sttScore * 1000) / 1000
    };
}
```

**구현 지침**:
1. `similarity.js`의 기존 함수들 유지
2. 새 함수 `calculateSTTEnhancedSimilarities` 추가
3. 텍스트 인자 2개 추가로 받도록 인터페이스 확장
4. 결과 객체에 STT 메트릭들 포함

### 1.3 UI 통합

**목표**: STT 특화 메트릭 결과를 사용자 인터페이스에 표시

**작업 파일**: `index.html` (기존 파일 수정)

**수정 위치 1**: 전처리 옵션 섹션
```html
<!-- 기존 전처리 체크박스 아래에 추가 -->
<div style="margin-top: 15px; padding: 10px; background: #2a2a2a; border-radius: 5px;">
    <label style="display: flex; align-items: center; font-weight: normal; cursor: pointer;">
        <input type="checkbox" name="enableSTTMetrics" checked style="margin-right: 8px;">
        <span style="color: #4caf50;">STT 특화 메트릭 활성화</span>
    </label>
    <div style="color: #888; font-size: 0.8rem; margin-top: 5px;">
        음성 인식 특화 유사도 계산 (문자 단위, 음성학적 거리 포함)
    </div>
</div>
```

**수정 위치 2**: 유사도 계산 로직 (1040번째 줄 근처)
```javascript
// 기존 코드 수정
if (expectedEmbedding && candidateEmbedding) {
    // STT 메트릭 활성화 여부 확인
    const enableSTT = document.querySelector('input[name="enableSTTMetrics"]:checked');
    
    let similarities;
    if (enableSTT) {
        // STT 특화 유사도 계산
        similarities = calculateSTTEnhancedSimilarities(
            expectedEmbedding, 
            candidateEmbedding,
            expectedText,
            candidateText
        );
    } else {
        // 기존 방식
        similarities = SimilarityCalculator.calculateAllSimilarities(expectedEmbedding, candidateEmbedding);
    }
    
    // 나머지 로직 동일...
}
```

**수정 위치 3**: 결과 표시 HTML (1220번째 줄 근처)
```javascript
// similarityDetailsHTML 생성 부분에 STT 메트릭 구분 표시
const similarityDetailsHTML = Object.keys(similarities).map(method => {
    const value = similarities[method];
    let className = 'similarity-method';
    
    // STT 메트릭 구분
    if (method.startsWith('stt_')) {
        className += ' stt-metric';
    }
    
    // 기존 best/worst 로직...
    return `<span class="${className}">${method}: ${value}</span>`;
}).join(' ');
```

**구현 지침**:
1. 기존 UI 레이아웃 최대한 유지
2. STT 메트릭은 별도 스타일로 구분 표시
3. 토글 방식으로 기존 방식과 선택 가능
4. 결과에서 STT 메트릭을 시각적으로 구분

---

## 🎯 Phase 2: 단기 개발 (3-4주)

### 2.1 고도화된 한국어 음성학적 거리 모델

**목표**: 실제 STT 오류 패턴을 반영한 정교한 음성학적 거리 계산

**작업 파일**: `korean-phonetics.js` (신규 생성)

```javascript
/**
 * 한국어 음성학적 거리 계산 모듈
 * 실제 STT 데이터 기반 혼동 매트릭스 활용
 */

const KOREAN_PHONETIC_CONFUSION = {
    // 자음 혼동 매트릭스 (가중치 포함)
    consonants: {
        'ㅍ': [['ㅋ', 0.8], ['ㅂ', 0.7], ['ㄷ', 0.3]],
        'ㅋ': [['ㄱ', 0.8], ['ㅍ', 0.8], ['ㅌ', 0.5]],
        'ㅌ': [['ㄷ', 0.8], ['ㅊ', 0.7], ['ㅋ', 0.5]],
        'ㅊ': [['ㅌ', 0.7], ['ㅈ', 0.6], ['ㅅ', 0.4]],
        // ... 실제 데이터로 확장
    },
    
    // 모음 혼동 매트릭스
    vowels: {
        'ㅓ': [['ㅗ', 0.7], ['ㅡ', 0.6]],
        'ㅔ': [['ㅐ', 0.9], ['ㅖ', 0.8]],
        'ㅚ': [['ㅞ', 0.8], ['ㅙ', 0.7]],
        // ... 실제 데이터로 확장
    }
};

class KoreanPhoneticAnalyzer {
    constructor() {
        this.confusionMatrix = KOREAN_PHONETIC_CONFUSION;
    }
    
    // 자소 분해
    decomposeHangul(char) {
        // 한글 문자를 초성/중성/종성으로 분해
        // 구현 요구사항: Unicode 범위 활용
    }
    
    // 음성학적 거리 계산
    calculatePhoneticDistance(text1, text2) {
        // 구현 요구사항:
        // 1. 문자열을 자소 단위로 분해
        // 2. 각 자소별 혼동 가중치 적용
        // 3. 전체 거리를 0-1 유사도로 변환
    }
    
    // 혼동 패턴 학습
    learnFromData(corrections) {
        // 구현 요구사항:
        // 사용자 승인/거절 데이터로 가중치 업데이트
    }
}

// Export
window.KoreanPhonetics = KoreanPhoneticAnalyzer;
```

**구현 지침**:
1. 한글 자소 분해 알고리즘 구현
2. 혼동 매트릭스는 점진적 확장 가능하도록 설계
3. 학습 기능은 향후 확장을 위한 인터페이스만 제공
4. 성능 최적화 (캐싱 활용)

### 2.2 다층적 메트릭 앙상블

**목표**: 4단계 계층적 유사도 측정 시스템

**작업 파일**: `multi-level-similarity.js` (신규 생성)

```javascript
/**
 * 다층적 유사도 측정 시스템
 */

class MultiLevelSimilarityCalculator {
    constructor() {
        this.phoneticAnalyzer = new KoreanPhonetics();
        this.weights = {
            level1_phonetic: 0.3,   // 음성학적 거리
            level2_character: 0.25, // 문자 단위 유사성
            level3_word: 0.2,       // 단어 단위 유사성
            level4_semantic: 0.25   // 의미적 유사성
        };
    }
    
    calculateMultiLevelSimilarity(expected, candidate, embeddings = null) {
        const results = {
            level1_phonetic: this.phoneticAnalyzer.calculatePhoneticDistance(expected, candidate),
            level2_character: STTSimilarity.jaroWinklerSimilarity(expected, candidate),
            level3_word: this.calculateWordLevelSimilarity(expected, candidate),
            level4_semantic: embeddings ? this.calculateSemanticSimilarity(embeddings) : 0
        };
        
        // 가중 앙상블
        const finalScore = Object.keys(this.weights).reduce((sum, key) => {
            return sum + (this.weights[key] * results[key]);
        }, 0);
        
        return {
            ...results,
            finalScore: Math.round(finalScore * 1000) / 1000,
            breakdown: this.generateBreakdown(results)
        };
    }
    
    // 가중치 동적 조정
    adjustWeights(feedbackData) {
        // 구현 요구사항: 사용자 피드백 기반 가중치 최적화
    }
}

// Export
window.MultiLevelSimilarity = MultiLevelSimilarityCalculator;
```

**구현 지침**:
1. 각 레벨별 독립적 계산 가능
2. 가중치 조정 인터페이스 제공
3. 상세 분석 결과 제공 (breakdown)
4. 기존 시스템과 호환성 유지

### 2.3 학습 시스템 기반 구조

**목표**: 사용자 피드백을 통한 지속적 개선

**작업 파일**: `feedback-learner.js` (신규 생성)

```javascript
/**
 * 사용자 피드백 기반 학습 시스템
 */

class STTFeedbackLearner {
    constructor() {
        this.feedbackData = [];
        this.confusionPatterns = new Map();
        this.performanceMetrics = {};
    }
    
    // 피드백 수집
    collectFeedback(expected, candidate, userApproval, similarities) {
        const feedback = {
            timestamp: Date.now(),
            expected,
            candidate,
            approved: userApproval,
            similarities,
            phoneticDistance: this.extractPhoneticFeatures(expected, candidate)
        };
        
        this.feedbackData.push(feedback);
        this.updateConfusionPatterns(feedback);
    }
    
    // 혼동 패턴 분석
    analyzeConfusionPatterns() {
        // 구현 요구사항:
        // 1. 자주 혼동되는 문자 조합 식별
        // 2. 승인/거절 패턴 분석
        // 3. 가중치 조정 제안
    }
    
    // 성능 리포트 생성
    generatePerformanceReport() {
        // 구현 요구사항:
        // 1. 정확도 개선 추이
        // 2. 메트릭별 기여도 분석
        // 3. 추천 설정값
    }
}

// Export
window.STTFeedbackLearner = STTFeedbackLearner;
```

**구현 지침**:
1. localStorage 활용한 데이터 지속성
2. 개인정보 고려한 데이터 수집
3. 분석 결과의 시각화 준비
4. 관리자 대시보드 인터페이스 제공

---

## 🎯 Phase 3: 중장기 개발 (2-3개월)

### 3.1 도메인 특화 임베딩 모델 통합

**목표**: STT 특화 사전 훈련 모델 또는 파인튜닝 모델 적용

**기술 스택**: Hugging Face Transformers.js 또는 ONNX.js

**작업 범위**:
- 한국어 STT 특화 BERT 모델 조사
- 클라이언트 사이드 추론 최적화
- 기존 OpenAI 임베딩과 성능 비교

### 3.2 실시간 성능 최적화

**목표**: 대용량 데이터 처리 최적화

**최적화 영역**:
- WebWorker 활용 병렬 처리
- 임베딩 캐싱 시스템
- 배치 처리 최적화
- 메모리 사용량 개선

### 3.3 고급 분석 대시보드

**목표**: 관리자용 분석 도구

**기능 요구사항**:
- 실시간 성능 모니터링
- A/B 테스트 프레임워크
- 혼동 패턴 시각화
- 자동 파라미터 튜닝

---

## 🔧 구현 우선순위 및 일정

### Week 1-2: Phase 1 기본 구현
- [ ] `stt-similarity.js` 모듈 생성
- [ ] Jaro-Winkler Distance 구현
- [ ] Levenshtein Distance 구현
- [ ] 기본 한국어 음성학적 매핑
- [ ] UI 통합 (토글 옵션)

### Week 3-4: Phase 1 완성 및 테스트
- [ ] 하이브리드 메트릭 시스템 구현
- [ ] UI 결과 표시 개선
- [ ] 성능 테스트 및 최적화
- [ ] 사용자 테스트 및 피드백 수집

### Week 5-8: Phase 2 고도화
- [ ] `korean-phonetics.js` 구현
- [ ] 다층적 메트릭 시스템 구현
- [ ] 피드백 학습 시스템 기초 구현
- [ ] 성능 분석 및 가중치 튜닝

### Week 9-12: Phase 2 완성
- [ ] 학습 시스템 고도화
- [ ] 성능 리포트 시스템
- [ ] 관리자 인터페이스
- [ ] 전체 시스템 통합 테스트

---

## 📊 예상 성능 개선

**실제 문제 케이스 및 목표**:

**음성학적 혼동**:
- "프로스케일러" vs "크로스케일러": 0.159 → **0.75+** (ㅍ/ㅋ 혼동)
- "티타늄" vs "티파늄": 현재 낮음 → **0.8+** (ㅌ/ㅍ 혼동)

**부분 일치 및 형태 변형**:
- "캔바" vs "캔바 캔": 현재 낮음 → **0.85+** (중복어)
- "도어 캠프" vs "도어캠": 현재 낮음 → **0.9+** (공백 처리)
- "알 인치" vs "8인치": 현재 낮음 → **0.85+** (한글→숫자)

**복합 오류 패턴**:
- "아티빗 보이스" vs "안티딥보이스": 현재 낮음 → **0.7+** (복합 변형)
- "예뻐 티파늄" vs "티타늄": 현재 극낮음 → **0.6+** (노이즈 + 핵심어)

**숫자 표현**:
- "4천 사백" vs "4400": 현재 낮음 → **0.95+** (한글숫자 변환)
- "8.9미터" vs "팔점구미터": 0.3 → **0.85+** (복합 숫자)

**메트릭별 기여도 예상**:
- Jaro-Winkler: +0.3~0.4 (부분 일치)
- 음성학적 거리: +0.2~0.3 (ㅍ/ㅋ 혼동)
- 편집 거리: +0.1~0.2 (오탈자 보정)
- 앙상블 효과: +0.1~0.15 (시너지)

---

## 🎯 성공 기준

### Phase 1 완료 기준
- [ ] 기존 0.3 이하 케이스 50% 이상이 0.6+ 달성
- [ ] UI에서 STT 메트릭 결과 정상 표시
- [ ] 성능 저하 없이 실시간 계산 가능

### Phase 2 완료 기준  
- [ ] 전체 유사도 정확도 20% 이상 개선
- [ ] 사용자 승인율 15% 이상 증가
- [ ] 혼동 패턴 학습 시스템 정상 작동

### Phase 3 완료 기준
- [ ] 도메인 특화 모델 성능 검증
- [ ] 대용량 데이터 처리 성능 최적화
- [ ] 관리자 대시보드 완성

---

## 📚 참고 자료

### 학술 논문
- "Phoneme Similarity Modeling for STT Error Analysis"
- "Hybrid Similarity Metrics for Speech Recognition Evaluation"  
- "Korean Phonetic Confusion Matrix for ASR Systems"

### 구현 참고
- Jaro-Winkler Algorithm Implementation
- Korean Unicode Processing
- Hangul Decomposition Libraries

### 도구 및 라이브러리
- Hangul.js (한글 처리)
- Transformers.js (임베딩 모델)
- Chart.js (시각화)

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.*