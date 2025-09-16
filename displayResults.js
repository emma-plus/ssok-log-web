/**
 * 결과 표시 및 렌더링 모듈 (displayResults.js)
 *
 * 이 모듈은 분석 결과를 UI에 표시하는 기능을 제공합니다:
 * - 단어/문장 데이터 결과 표시
 * - 유사도 상세 정보 렌더링
 * - 전처리 비교 결과 표시
 * - STT 메트릭 시각화
 */

/**
 * 단어 분석 결과 표시 함수
 * @param {Array} analysisResults - 분석 결과 배열
 * @param {Object} approvalStatus - 승인/거절 상태 객체
 */
function displayWordResults(analysisResults, approvalStatus) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    analysisResults.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';

        const candidatesHTML = result.candidates.map(candidate => {
            const similarityClass = candidate.similarity >= 0.8 ? 'similarity-high' :
                                   candidate.similarity >= 0.6 ? 'similarity-medium' : 'similarity-low';

            const candidateId = `${result.id}_${candidate.candidate_word}`;
            const status = approvalStatus[candidateId] || '';

            // 유사도 상세 정보 생성 (단어용)
            const similarities = candidate.similarities || {};
            const analysis = SimilarityCalculator.analyzeSimilarities(similarities);

            // STT 외의 최고 유사도 메트릭 찾기
            const nonSTTSimilarities = Object.keys(similarities)
                .filter(method => !method.startsWith('stt_'))
                .reduce((obj, method) => {
                    obj[method] = similarities[method];
                    return obj;
                }, {});

            const nonSTTAnalysis = Object.keys(nonSTTSimilarities).length > 0 ?
                SimilarityCalculator.analyzeSimilarities(nonSTTSimilarities) : null;

            // STT Ensemble 점수 가져오기
            const sttEnsembleScore = similarities.stt_ensemble || null;

            const similarityDetailsHTML = Object.keys(similarities).map(method => {
                const value = similarities[method];
                let className = 'similarity-method';

                // STT 메트릭 구분 표시
                if (method.startsWith('stt_')) {
                    className += ' stt-metric';
                }

                if (analysis.highest && method === analysis.highest.method) {
                    className += ' best';
                } else if (analysis.lowest && method === analysis.lowest.method) {
                    className += ' worst';
                }

                // STT 메트릭의 경우 더 친숙한 이름으로 표시
                let displayName = method;
                if (method === 'stt_jaro_winkler') displayName = 'STT Jaro-Winkler';
                else if (method === 'stt_levenshtein') displayName = 'STT Levenshtein';
                else if (method === 'stt_phonetic') displayName = 'STT Korean Phonetic';
                else if (method === 'stt_ensemble') displayName = 'STT Ensemble ⭐';

                return `<span class="${className}">${displayName}: ${value}</span>`;
            }).join(' ');

            // 전처리 비교 결과 HTML 생성 (선택된 단계만) - 단어용
            const preprocessingComparisonHTML = generatePreprocessingComparisonHTML(candidate, candidateId);

            return `
                <div class="candidate-item ${status}" id="candidate_${candidateId}">
                    <div class="candidate-info">
                        <div class="candidate-word">${candidate.candidate_word}</div>
                        <div class="candidate-stats">
                            Log ID: [${candidate.log_id.join(', ')}] |
                            주요 유사도: <span class="${similarityClass}">${nonSTTAnalysis && nonSTTAnalysis.highest ? `${candidate.similarity} (${nonSTTAnalysis.highest.method})` : candidate.similarity}</span>${sttEnsembleScore ? ` / STT Ensemble: <span class="similarity-method stt-metric">${sttEnsembleScore}</span>` : ''}
                            <button class="similarity-toggle" onclick="toggleSimilarityDetails('${candidateId}')">상세보기</button>
                            <br>
                            출현횟수: ${candidate.frequency}회 |
                            원본판정: <span class="${candidate.origin_judge === 'true' ? 'similarity-high' : 'similarity-low'}">${candidate.origin_judge}</span>
                        </div>
                        <div class="similarity-details" id="similarity_${candidateId}" style="display: none;">
                            <strong>모든 유사도 계산 결과:</strong><br>
                            ${similarityDetailsHTML}
                            <br><br>
                            <strong>분석:</strong><br>
                            • 최고점: ${analysis.highest ? `${analysis.highest.method} (${analysis.highest.value})` : 'N/A'}<br>
                            • 최저점: ${analysis.lowest ? `${analysis.lowest.method} (${analysis.lowest.value})` : 'N/A'}<br>
                            • 평균: ${analysis.average ? analysis.average.toFixed(3) : 'N/A'}<br>
                            • 분산: ${analysis.variance ? analysis.variance.toFixed(3) : 'N/A'}
                            ${preprocessingComparisonHTML}
                        </div>
                    </div>
                    <div class="candidate-actions">
                        <button class="btn-approve" onclick="approveCandidate('${candidateId}')">승인</button>
                        <button class="btn-reject" onclick="rejectCandidate('${candidateId}')">거절</button>
                    </div>
                </div>
            `;
        }).join('');

        resultDiv.innerHTML = `
            <div class="result-header">
                <h3>ID: ${result.id}</h3>
                <div class="expected">정답: "${result.expected_answer}"</div>
            </div>
            <div class="candidates-list">
                ${candidatesHTML}
            </div>
        `;

        resultsContainer.appendChild(resultDiv);
    });
}

/**
 * 문장 분석 결과 표시 함수
 * @param {Array} analysisResults - 분석 결과 배열
 * @param {Object} approvalStatus - 승인/거절 상태 객체
 */
function displaySentenceResults(analysisResults, approvalStatus) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    analysisResults.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';

        const candidatesHTML = result.candidates.map(candidate => {
            const similarityClass = candidate.similarity >= 0.8 ? 'similarity-high' :
                                   candidate.similarity >= 0.6 ? 'similarity-medium' : 'similarity-low';

            const keywordClass = candidate.keyword_included ? 'similarity-high' : 'similarity-low';

            const candidateId = `${result.id}_${candidate.candidate_word}`;
            const status = approvalStatus[candidateId] || '';

            // 유사도 상세 정보 생성 (문장용)
            const similarities = candidate.similarities || {};
            const analysis = SimilarityCalculator.analyzeSimilarities(similarities);

            // STT 외의 최고 유사도 메트릭 찾기
            const nonSTTSimilarities = Object.keys(similarities)
                .filter(method => !method.startsWith('stt_'))
                .reduce((obj, method) => {
                    obj[method] = similarities[method];
                    return obj;
                }, {});

            const nonSTTAnalysis = Object.keys(nonSTTSimilarities).length > 0 ?
                SimilarityCalculator.analyzeSimilarities(nonSTTSimilarities) : null;

            // STT Ensemble 점수 가져오기
            const sttEnsembleScore = similarities.stt_ensemble || null;

            const similarityDetailsHTML = Object.keys(similarities).map(method => {
                const value = similarities[method];
                let className = 'similarity-method';

                // STT 메트릭 구분 표시
                if (method.startsWith('stt_')) {
                    className += ' stt-metric';
                }

                if (analysis.highest && method === analysis.highest.method) {
                    className += ' best';
                } else if (analysis.lowest && method === analysis.lowest.method) {
                    className += ' worst';
                }

                // STT 메트릭의 경우 더 친숙한 이름으로 표시
                let displayName = method;
                if (method === 'stt_jaro_winkler') displayName = 'STT Jaro-Winkler';
                else if (method === 'stt_levenshtein') displayName = 'STT Levenshtein';
                else if (method === 'stt_phonetic') displayName = 'STT Korean Phonetic';
                else if (method === 'stt_ensemble') displayName = 'STT Ensemble ⭐';

                return `<span class="${className}">${displayName}: ${value}</span>`;
            }).join(' ');

            // 전처리 비교 결과 HTML 생성 (선택된 단계만) - 문장용
            const preprocessingComparisonHTML = generatePreprocessingComparisonHTML(candidate, candidateId);

            return `
                <div class="candidate-item ${status}" id="candidate_${candidateId}">
                    <div class="candidate-info">
                        <div class="candidate-word" style="font-size: 0.95rem; line-height: 1.4;">${candidate.candidate_word}</div>
                        <div class="candidate-stats">
                            Log ID: [${candidate.log_id.join(', ')}] |
                            키워드: <strong>${candidate.keyword}</strong> |
                            키워드 포함: <span class="${keywordClass}">${candidate.keyword_included ? 'YES' : 'NO'}</span>
                            <br>
                            주요 유사도: <span class="${similarityClass}">${nonSTTAnalysis && nonSTTAnalysis.highest ? `${candidate.similarity} (${nonSTTAnalysis.highest.method})` : candidate.similarity}</span>${sttEnsembleScore ? ` / STT Ensemble: <span class="similarity-method stt-metric" >${sttEnsembleScore}</span>` : ''}
                            <button class="similarity-toggle" onclick="toggleSimilarityDetails('${candidateId}')">상세보기</button>
                            <br>
                            출현횟수: ${candidate.frequency}회 |
                            원본판정: <span class="${candidate.origin_judge === 'true' ? 'similarity-high' : 'similarity-low'}">${candidate.origin_judge}</span>
                        </div>
                        <div class="similarity-details" id="similarity_${candidateId}" style="display: none;">
                            <strong>모든 유사도 계산 결과:</strong><br>
                            ${similarityDetailsHTML}
                            <br><br>
                            <strong>분석:</strong><br>
                            • 최고점: ${analysis.highest ? `${analysis.highest.method} (${analysis.highest.value})` : 'N/A'}<br>
                            • 최저점: ${analysis.lowest ? `${analysis.lowest.method} (${analysis.lowest.value})` : 'N/A'}<br>
                            • 평균: ${analysis.average ? analysis.average.toFixed(3) : 'N/A'}<br>
                            • 분산: ${analysis.variance ? analysis.variance.toFixed(3) : 'N/A'}
                            ${preprocessingComparisonHTML}
                        </div>
                    </div>
                    <div class="candidate-actions">
                        <button class="btn-approve" onclick="approveCandidate('${candidateId}')">승인</button>
                        <button class="btn-reject" onclick="rejectCandidate('${candidateId}')">거절</button>
                    </div>
                </div>
            `;
        }).join('');

        resultDiv.innerHTML = `
            <div class="result-header">
                <h3>ID: ${result.id} | 키워드: "${result.keyword || result.expected_answer}"</h3>
                <div class="expected" style="font-size: 0.95rem; line-height: 1.4; margin-top: 10px;">정답: "${result.expected_answer}"</div>
            </div>
            <div class="candidates-list">
                ${candidatesHTML}
            </div>
        `;

        resultsContainer.appendChild(resultDiv);
    });
}

/**
 * 전처리 비교 결과 HTML 생성 함수
 * @param {Object} candidate - 후보 데이터
 * @param {string} candidateId - 후보 ID
 * @returns {string} - 전처리 비교 결과 HTML
 */
function generatePreprocessingComparisonHTML(candidate, candidateId) {
    if (!candidate.preprocessingComparison || Object.keys(candidate.preprocessingComparison).length === 0) {
        return '';
    }

    const stageNames = {
        'original': '원본',
        'step13': '1-3단계',
        'step14': '1-4단계',
    };

    return `
        <div style="margin-top: 15px; padding: 10px; background: #333; border-radius: 5px;">
            <strong>전처리 비교 결과:</strong><br>
            ${Object.keys(candidate.preprocessingComparison).map(stage => {
                const comparison = candidate.preprocessingComparison[stage];
                const stageName = stageNames[stage] || stage;
                const isBest = candidate.bestPreprocessingMethod === stage;

                // 각 단계별 주요 유사도만 표시 (코사인 + STT Ensemble)
                let stageMetrics = `<span class="similarity-method${isBest ? ' best' : ''}">${stageName}: ${comparison.similarity.toFixed(3)}</span>`;

                // STT Ensemble 점수가 있다면 추가 표시
                if (comparison.similarities && comparison.similarities.stt_ensemble) {
                    stageMetrics += ` <span class="similarity-method stt-metric" >STT: ${comparison.similarities.stt_ensemble}</span>`;
                }

                return `
                    <div style="margin-bottom: 8px;">
                        ${stageMetrics}
                        <span style="color: #888; font-size: 0.8rem; display: block; margin-left: 10px;">
                            ("${comparison.expectedText}" vs "${comparison.candidateText}")
                        </span>
                        ${comparison.similarities && Object.keys(comparison.similarities).filter(k => k.startsWith('stt_')).length > 1 ? `
                            <div style="margin-left: 10px; margin-top: 3px;">
                                <button class="similarity-toggle" onclick="toggleStageSTTDetails('${candidateId}_${stage}')" style="font-size: 0.75rem; padding: 2px 6px;">STT 상세</button>
                                <div id="stt_details_${candidateId}_${stage}" style="display: none; margin-top: 5px; font-size: 0.8rem;">
                                    ${Object.keys(comparison.similarities).filter(k => k.startsWith('stt_')).map(method => {
                                        const value = comparison.similarities[method];
                                        let displayName = method;
                                        if (method === 'stt_jaro_winkler') displayName = 'Jaro-Winkler';
                                        else if (method === 'stt_levenshtein') displayName = 'Levenshtein';
                                        else if (method === 'stt_phonetic') displayName = 'Korean Phonetic';
                                        else if (method === 'stt_ensemble') displayName = 'Ensemble ⭐';
                                        return `<span class="stt-metric" >${displayName}: ${value}</span>`;
                                    }).join(' ')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
            ${candidate.bestPreprocessingMethod ? `
                <span style="color: #4fc3f7; font-weight: bold; margin-top: 5px; display: block;">
                    최적 방법: ${stageNames[candidate.bestPreprocessingMethod] || candidate.bestPreprocessingMethod}
                </span>
            ` : ''}
        </div>
    `;
}

/**
 * STT 상세 정보 토글 함수 (전처리 비교용)
 * @param {string} stageId - 단계 ID
 */
function toggleStageSTTDetails(stageId) {
    const element = document.getElementById(`stt_details_${stageId}`);
    if (element) {
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        displayWordResults,
        displaySentenceResults,
        generatePreprocessingComparisonHTML,
        toggleStageSTTDetails
    };
} else {
    // Browser environment - expose as global object
    window.DisplayResults = {
        displayWordResults,
        displaySentenceResults,
        generatePreprocessingComparisonHTML,
        toggleStageSTTDetails
    };
}
