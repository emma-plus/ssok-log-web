/**
 * CSV/TSV 데이터 파싱 및 그룹핑 모듈 (parser.js)
 * 
 * 이 모듈은 CSV/TSV 형태의 로그 데이터를 파싱하고 그룹핑하는 기능을 제공합니다:
 * - 자동 구분자 감지 (CSV/TSV)
 * - 단어/문장 데이터 파싱
 * - 정답별 그룹핑 및 중복 제거
 * - 원본 데이터 추적
 */

// 전역 변수 선언
let originalInputData = [];

/**
 * 구분자 자동 감지 함수
 * @param {string} dataText - 입력 데이터 텍스트
 * @returns {string} - 감지된 구분자 (',' 또는 '\t')
 */
function detectDelimiter(dataText) {
    const lines = dataText.trim().split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('--') && !trimmedLine.startsWith('-')) {
            // 탭과 쉼표 개수를 세어서 더 많은 쪽으로 결정
            const tabCount = (trimmedLine.match(/\t/g) || []).length;
            const commaCount = (trimmedLine.match(/,/g) || []).length;

            if (tabCount > commaCount) {
                console.log('TSV 형태로 감지되었습니다.');
                return '\t';
            } else {
                console.log('CSV 형태로 감지되었습니다.');
                return ',';
            }
        }
    }
    
    return ','; // 기본값
}

/**
 * 단어 데이터 파싱 함수
 * @param {string} dataText - CSV/TSV 형태의 데이터 텍스트
 * @param {number} debugLevel - 디버그 레벨 (0: 기본, 1: 상세, 2: 모든 로그)
 * @returns {Array} - 파싱된 데이터 배열
 */
function parseWordData(dataText, debugLevel = 2) {
    const lines = dataText.trim().split('\n');
    const data = [];
    originalInputData = []; // 원본 데이터 초기화

    // 카운터 변수들
    let skippedEmptyLines = 0;
    let skippedCommentLines = 0;
    let skippedInvalidLines = 0;
    let totalLines = lines.length;

    // 구분자 자동 감지
    const delimiter = detectDelimiter(dataText);

    for (const line of lines) {
        const trimmedLine = line.trim();

        // 빈 줄 체크
        if (!trimmedLine) {
            skippedEmptyLines++;
            continue;
        }

        // 주석 라인 체크
        if (trimmedLine.startsWith('--') || trimmedLine.startsWith('-')) {
            skippedCommentLines++;
            if (debugLevel >= 2) {
                console.log(`주석 라인 건너뛰기: ${trimmedLine}`);
            }
            continue;
        }

        const parts = trimmedLine.split(delimiter);
        if (parts.length >= 10) {
            data.push({
                id: parts[0].trim(),
                user_id: parts[1].trim(),
                origin_judge: parts[3].trim().toLowerCase() === 'true',
                answer: parts[7].trim(),
                user_answer: parts[9].trim()
            });

            // 원본 입력 데이터 저장
            originalInputData.push({
                row_number: originalInputData.length + 1,
                id: parts[0]?.trim() || '',
                user_id: parts[1]?.trim() || '',
                data_type: 'word',
                version: parts[2]?.trim() || '',
                pass: parts[3]?.trim() || '',
                fail_reason: parts[4]?.trim() || '',
                prompt_type: parts[5]?.trim() || '',
                keywords: parts[6]?.trim() || '',
                word: parts[7]?.trim() || '',
                sentence: parts[8]?.trim() || '',
                user_response: parts[9]?.trim() || '',
                parsing_status: '성공',
                original_line: trimmedLine
            });
        } else {
            skippedInvalidLines++;
            if (debugLevel >= 1) {
                console.log(`유효하지 않은 라인 (컬럼 수 부족): ${trimmedLine}`);
            }
        }
    }

    if (debugLevel >= 1) {
        console.log('=== 파싱 결과 요약 ===');
        console.log(`전체 라인 수: ${totalLines}`);
        console.log(`성공적으로 파싱된 레코드: ${data.length}`);
        console.log(`건너뛴 빈 줄: ${skippedEmptyLines}`);
        console.log(`건너뛴 주석 라인: ${skippedCommentLines}`);
        console.log(`건너뛴 유효하지 않은 라인: ${skippedInvalidLines}`);
        console.log(`사용된 구분자: '${delimiter === '\t' ? 'TAB' : 'COMMA'}'`);
        console.log('====================');
    }

    return data;
}

/**
 * 문장 데이터 파싱 함수
 * @param {string} dataText - CSV/TSV 형태의 데이터 텍스트
 * @param {number} debugLevel - 디버그 레벨 (0: 기본, 1: 상세, 2: 모든 로그)
 * @returns {Array} - 파싱된 데이터 배열
 */
function parseSentenceData(dataText, debugLevel = 2) {
    const lines = dataText.trim().split('\n');
    const data = [];
    originalInputData = []; // 원본 데이터 초기화

    // 카운터 변수들
    let skippedEmptyLines = 0;
    let skippedCommentLines = 0;
    let skippedInvalidLines = 0;
    let totalLines = lines.length;

    // 구분자 자동 감지
    const delimiter = detectDelimiter(dataText);

    for (const line of lines) {
        const trimmedLine = line.trim();

        // 빈 줄 체크
        if (!trimmedLine) {
            skippedEmptyLines++;
            continue;
        }

        // 주석 라인 체크
        if (trimmedLine.startsWith('--') || trimmedLine.startsWith('-')) {
            skippedCommentLines++;
            if (debugLevel >= 2) {
                console.log(`주석 라인 건너뛰기: ${trimmedLine}`);
            }
            continue;
        }

        const parts = trimmedLine.split(delimiter);
        // 문장 데이터는 최소 10개 컬럼이 필요
        if (parts.length >= 10) {
            data.push({
                id: parts[0].trim(),
                user_id: parts[1].trim(),
                version: parts[2].trim(),
                origin_judge: parts[3].trim().toLowerCase() === 'true',
                description: parts[4].trim(),
                type: parts[5].trim(),
                keyword: parts[6].trim(),
                empty1: parts[7].trim(),
                answer: parts[8].trim(), // 원본 문장
                user_answer: parts[9].trim() // 사용자 답변 문장
            });

            // 원본 입력 데이터 저장
            originalInputData.push({
                row_number: originalInputData.length + 1,
                id: parts[0]?.trim() || '',
                user_id: parts[1]?.trim() || '',
                data_type: 'sentence',
                version: parts[2]?.trim() || '',
                pass: parts[3]?.trim() || '',
                fail_reason: parts[4]?.trim() || '',
                prompt_type: parts[5]?.trim() || '',
                keywords: parts[6]?.trim() || '',
                word: parts[7]?.trim() || '',
                sentence: parts[8]?.trim() || '',
                user_response: parts[9]?.trim() || '',
                parsing_status: '성공',
                original_line: trimmedLine
            });
        } else {
            skippedInvalidLines++;
            if (debugLevel >= 1) {
                console.log(`유효하지 않은 라인 (컬럼 수 부족): ${trimmedLine}`);
            }
        }
    }

    if (debugLevel >= 1) {
        console.log('=== 문장 데이터 파싱 결과 요약 ===');
        console.log(`전체 라인 수: ${totalLines}`);
        console.log(`성공적으로 파싱된 레코드: ${data.length}`);
        console.log(`건너뛴 빈 줄: ${skippedEmptyLines}`);
        console.log(`건너뛴 주석 라인: ${skippedCommentLines}`);
        console.log(`건너뛴 유효하지 않은 라인: ${skippedInvalidLines}`);
        console.log(`사용된 구분자: '${delimiter === '\t' ? 'TAB' : 'COMMA'}'`);
        console.log('====================');
    }

    return data;
}

/**
 * 단어 데이터 그룹핑 함수 (expected_answer별로 그룹핑)
 * @param {Array} data - 파싱된 데이터 배열
 * @returns {Array} - 그룹핑된 데이터 배열
 */
function groupWordData(data) {
    const grouped = {};

    for (const row of data) {
        if (!row.answer || !row.user_answer) continue;

        const key = row.answer;
        if (!grouped[key]) {
            grouped[key] = {
                expected_answer: row.answer,
                candidates: []
            };
        }

        // 중복 제거를 위해 기존 후보 중에서 같은 user_answer가 있는지 확인
        const existingCandidate = grouped[key].candidates.find(c => c.candidate_word === row.user_answer);
        if (existingCandidate) {
            existingCandidate.log_id.push(parseInt(row.user_id));
            existingCandidate.frequency += 1;
        } else {
            grouped[key].candidates.push({
                log_id: [parseInt(row.user_id)],
                candidate_word: row.user_answer,
                similarity: 0, // 임베딩 계산 후 업데이트
                origin_judge: row.origin_judge ? "true" : "false",
                frequency: 1
            });
        }
    }

    return Object.values(grouped);
}

/**
 * 문장 데이터 그룹핑 함수 (키워드별로 그룹핑)
 * @param {Array} data - 파싱된 데이터 배열
 * @returns {Array} - 그룹핑된 데이터 배열
 */
function groupSentenceData(data) {
    const grouped = {};

    for (const row of data) {
        if (!row.answer || !row.user_answer || !row.keyword) continue;

        const key = row.keyword; // 키워드로 그룹핑
        if (!grouped[key]) {
            grouped[key] = {
                expected_answer: row.answer,
                keyword: row.keyword,
                candidates: []
            };
        }

        // 중복 제거를 위해 기존 후보 중에서 같은 user_answer가 있는지 확인
        const existingCandidate = grouped[key].candidates.find(c => c.candidate_word === row.user_answer);
        if (existingCandidate) {
            existingCandidate.log_id.push(parseInt(row.user_id));
            existingCandidate.frequency += 1;
        } else {
            grouped[key].candidates.push({
                log_id: [parseInt(row.user_id)],
                candidate_word: row.user_answer,
                keyword: row.keyword,
                keyword_included: false, // 키워드 포함 여부 (나중에 계산)
                similarity: 0, // 임베딩 계산 후 업데이트
                origin_judge: row.origin_judge ? "true" : "false",
                frequency: 1
            });
        }
    }

    return Object.values(grouped);
}

/**
 * 원본 입력 데이터 반환 함수
 * @returns {Array} - 원본 입력 데이터
 */
function getOriginalInputData() {
    return originalInputData;
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectDelimiter,
        parseWordData,
        parseSentenceData,
        groupWordData,
        groupSentenceData,
        getOriginalInputData
    };
} else {
    // Browser environment - expose as global object
    window.DataParser = {
        detectDelimiter,
        parseWordData,
        parseSentenceData,
        groupWordData,
        groupSentenceData,
        getOriginalInputData
    };
}