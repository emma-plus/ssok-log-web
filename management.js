/**
 * 관리 기능 모듈 (management.js)
 * 
 * 승인/거절, 결과 내보내기, 유사도 상세보기 등의 관리 기능들을 담당
 */

// 승인 처리
function approveCandidate(candidateId) {
    approvalStatus[candidateId] = 'approved';
    const element = document.getElementById(`candidate_${candidateId}`);
    element.className = 'candidate-item approved';
    console.log(`승인됨: ${candidateId}`);

    // 승인/거절 상태 업데이트 후 최종 결과 출력
    updateFinalResults();
}

// 거절 처리
function rejectCandidate(candidateId) {
    approvalStatus[candidateId] = 'rejected';
    const element = document.getElementById(`candidate_${candidateId}`);
    element.className = 'candidate-item rejected';
    console.log(`거절됨: ${candidateId}`);

    // 승인/거절 상태 업데이트 후 최종 결과 출력
    updateFinalResults();
}

// 모든 결과 승인
function approveAll() {
    analysisResults.forEach(result => {
        result.candidates.forEach(candidate => {
            const candidateId = `${result.id}_${candidate.candidate_word}`;
            approveCandidate(candidateId);
        });
    });
}

// 모든 결과 거절
function rejectAll() {
    analysisResults.forEach(result => {
        result.candidates.forEach(candidate => {
            const candidateId = `${result.id}_${candidate.candidate_word}`;
            rejectCandidate(candidateId);
        });
    });
}

// 최종 결과 업데이트 (요청하신 JSON 형태로)
function updateFinalResults() {
    const finalResults = analysisResults.map(result => {
        const approvedCandidates = result.candidates.filter(candidate => {
            const candidateId = `${result.id}_${candidate.candidate_word}`;
            return approvalStatus[candidateId] === 'approved';
        });

        return {
            id: result.id,
            expected_answer: result.expected_answer,
            candidates: result.candidates.map(candidate => ({
                log_id: candidate.log_id,
                candidate_word: candidate.candidate_word,
                similarity: candidate.similarity,
                similarities: candidate.similarities, // 모든 유사도 점수 포함
                origin_judge: candidate.origin_judge,
                frequency: candidate.frequency,
                approval_status: approvalStatus[`${result.id}_${candidate.candidate_word}`] || 'pending'
            }))
        };
    });

    console.log('최종 결과 (요청 형태):', JSON.stringify(finalResults, null, 2));
}

// 결과 내보내기 (JSON 파일로 다운로드)
function exportResults() {
    const finalResults = analysisResults.map(result => {
        return {
            id: result.id,
            expected_answer: result.expected_answer,
            keyword: result.keyword || null,
            candidates: result.candidates.map(candidate => ({
                log_id: candidate.log_id,
                candidate_word: candidate.candidate_word,
                similarity: candidate.similarity,
                similarities: candidate.similarities, // 모든 유사도 점수 포함 (STT 메트릭 포함)
                origin_judge: candidate.origin_judge,
                frequency: candidate.frequency,
                approval_status: approvalStatus[`${result.id}_${candidate.candidate_word}`] || 'pending',
                best_preprocessing_method: candidate.bestPreprocessingMethod || null,
                preprocessing_comparison: candidate.preprocessingComparison ? 
                    Object.keys(candidate.preprocessingComparison).reduce((acc, stage) => {
                        const comparison = candidate.preprocessingComparison[stage];
                        acc[stage] = {
                            similarity: comparison.similarity,
                            similarities: comparison.similarities, // STT 메트릭 포함
                            expected_text: comparison.expectedText,
                            candidate_text: comparison.candidateText
                        };
                        return acc;
                    }, {}) : null
            }))
        };
    });

    // JSON 파일로 다운로드
    const dataStr = JSON.stringify(finalResults, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `similarity_analysis_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('결과가 JSON 파일로 내보내졌습니다.');
}

// 엑셀 파일로 내보내기
function exportExcel() {
    if (analysisResults.length === 0) {
        alert('분석 결과가 없습니다. 먼저 데이터를 분석해주세요.');
        return;
    }

    console.log('엑셀 내보내기 시작...');
    
    try {
        // 워크북 생성
        const workbook = XLSX.utils.book_new();
        
        // 시트 1: 분석 결과 요약
        const summaryData = createSummarySheet();
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Analysis_Summary');
        
        // 시트 2: 상세 후보 목록
        const detailsData = createDetailsSheet();
        const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detailed_Candidates');
        
        // 시트 3: 전처리 비교
        const preprocessingData = createPreprocessingSheet();
        const preprocessingSheet = XLSX.utils.json_to_sheet(preprocessingData);
        XLSX.utils.book_append_sheet(workbook, preprocessingSheet, 'Preprocessing_Comparison');
        
        // 시트 4: 원본 입력 데이터
        const inputData = createInputDataSheet();
        const inputSheet = XLSX.utils.json_to_sheet(inputData);
        XLSX.utils.book_append_sheet(workbook, inputSheet, 'Input_Data');
        
        // 파일 다운로드
        const fileName = `similarity_analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        console.log('엑셀 파일이 성공적으로 내보내졌습니다.');
        
    } catch (error) {
        console.error('엑셀 내보내기 중 오류:', error);
        alert('엑셀 파일 생성 중 오류가 발생했습니다: ' + error.message);
    }
}

// 시트 1: 분석 결과 요약 데이터 생성
function createSummarySheet() {
    return analysisResults.map(result => {
        const approvedCount = result.candidates.filter(c => 
            approvalStatus[`${result.id}_${c.candidate_word}`] === 'approved'
        ).length;
        const rejectedCount = result.candidates.filter(c => 
            approvalStatus[`${result.id}_${c.candidate_word}`] === 'rejected'
        ).length;
        const pendingCount = result.candidates.length - approvedCount - rejectedCount;
        
        const similarities = result.candidates.map(c => c.similarity).filter(s => s > 0);
        const maxSimilarity = Math.max(...similarities);
        const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
        
        return {
            'ID': result.id,
            '정답': result.expected_answer,
            '키워드': result.keyword || '',
            '총_후보수': result.candidates.length,
            '승인된_후보수': approvedCount,
            '거절된_후보수': rejectedCount,
            '대기중_후보수': pendingCount,
            '최고_유사도': maxSimilarity.toFixed(3),
            '평균_유사도': avgSimilarity.toFixed(3)
        };
    });
}

// 시트 2: 상세 후보 목록 데이터 생성
function createDetailsSheet() {
    const detailsData = [];
    
    analysisResults.forEach(result => {
        result.candidates.forEach(candidate => {
            const candidateId = `${result.id}_${candidate.candidate_word}`;
            const approvalStatus_val = approvalStatus[candidateId] || '대기중';
            const statusMap = { 'approved': '승인', 'rejected': '거절', '': '대기중' };
            
            const similarities = candidate.similarities || {};
            
            // 기본 데이터
            const rowData = {
                '그룹_ID': result.id,
                '정답': result.expected_answer,
                '키워드': result.keyword || '',
                '후보_답변': candidate.candidate_word,
                '주요_유사도_점수': candidate.similarity?.toFixed(3) || '0.000',
                '코사인_유사도': similarities.cosine?.toFixed(3) || '',
                '유클리디안_거리': similarities.euclidean?.toFixed(3) || '',
                '맨하탄_거리': similarities.manhattan?.toFixed(3) || '',
                '피어슨_상관계수': similarities.pearson?.toFixed(3) || '',
                '자카드_유사도': similarities.jaccard?.toFixed(3) || '',
                '앙상블_점수': similarities.ensemble?.toFixed(3) || ''
            };

            // STT 메트릭 추가
            if (similarities.stt_jaro_winkler !== undefined) {
                rowData['STT_Jaro_Winkler'] = similarities.stt_jaro_winkler?.toFixed(3) || '';
                rowData['STT_Levenshtein'] = similarities.stt_levenshtein?.toFixed(3) || '';
                rowData['STT_Korean_Phonetic'] = similarities.stt_phonetic?.toFixed(3) || '';
                rowData['STT_Ensemble'] = similarities.stt_ensemble?.toFixed(3) || '';
            }

            // 나머지 정보 추가
            Object.assign(rowData, {
                '출현_횟수': candidate.frequency || 1,
                '원본_판정': candidate.origin_judge,
                '승인_상태': statusMap[approvalStatus_val] || '대기중',
                '로그_ID_목록': candidate.log_id?.join(',') || '',
                '최적_전처리_방법': candidate.bestPreprocessingMethod || '',
                '원본_텍스트': candidate.candidate_word,
                '전처리_텍스트': candidate.preprocessingComparison?.[candidate.bestPreprocessingMethod]?.candidateText || candidate.candidate_word
            });
            
            detailsData.push(rowData);
        });
    });
    
    return detailsData;
}

// 시트 3: 전처리 비교 데이터 생성
function createPreprocessingSheet() {
    const preprocessingData = [];
    
    analysisResults.forEach(result => {
        result.candidates.forEach(candidate => {
            if (candidate.preprocessingComparison && Object.keys(candidate.preprocessingComparison).length > 0) {
                const comparison = candidate.preprocessingComparison;
                const stageNames = { 
                    'original': '원본', 
                    'step13': 'Step1-3', 
                    'step14': 'Step1-4',
                    'reverseR13': 'R1-R3',
                    'reverseR14': 'R1-R4'
                };
                
                const row = {
                    '그룹_ID': result.id,
                    '정답': result.expected_answer,
                    '키워드': result.keyword || '',
                    '후보_답변': candidate.candidate_word,
                    '최적_전처리_방법': candidate.bestPreprocessingMethod ? 
                        (stageNames[candidate.bestPreprocessingMethod] || candidate.bestPreprocessingMethod) : ''
                };
                
                // 각 전처리 단계별 유사도 및 STT 메트릭 추가
                Object.keys(comparison).forEach(stage => {
                    const stageName = stageNames[stage] || stage;
                    const stageData = comparison[stage];
                    
                    // 기본 유사도 (코사인)
                    row[`${stageName}_코사인_유사도`] = stageData.similarity?.toFixed(3) || '';
                    row[`${stageName}_텍스트`] = stageData.candidateText || '';
                    row[`${stageName}_정답_텍스트`] = stageData.expectedText || '';
                    
                    // STT 메트릭 (있는 경우만)
                    if (stageData.similarities) {
                        const similarities = stageData.similarities;
                        if (similarities.stt_jaro_winkler !== undefined) {
                            row[`${stageName}_STT_Jaro_Winkler`] = similarities.stt_jaro_winkler?.toFixed(3) || '';
                            row[`${stageName}_STT_Levenshtein`] = similarities.stt_levenshtein?.toFixed(3) || '';
                            row[`${stageName}_STT_Korean_Phonetic`] = similarities.stt_phonetic?.toFixed(3) || '';
                            row[`${stageName}_STT_Ensemble`] = similarities.stt_ensemble?.toFixed(3) || '';
                        }
                    }
                });
                
                preprocessingData.push(row);
            }
        });
    });
    
    return preprocessingData;
}

// 시트 4: 원본 입력 데이터 생성
function createInputDataSheet() {
    return DataParser.getOriginalInputData().map(item => ({
        '행_번호': item.row_number,
        'ID': item.id,
        '사용자_ID': item.user_id,
        '데이터_타입': item.data_type,
        '버전': item.version,
        '통과_여부': item.pass,
        '실패_사유': item.fail_reason,
        '프롬프트_타입': item.prompt_type,
        '키워드': item.keywords,
        '단어': item.word,
        '문장': item.sentence,
        '사용자_답변': item.user_response,
        '파싱_상태': item.parsing_status,
        '원본_라인': item.original_line
    }));
}

// 유사도 상세정보 토글 함수
function toggleSimilarityDetails(candidateId) {
    const detailsElement = document.getElementById(`similarity_${candidateId}`);
    const toggleButton = event.target;

    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
        toggleButton.textContent = '숨기기';
    } else {
        detailsElement.style.display = 'none';
        toggleButton.textContent = '상세보기';
    }
}

// PDF 내보내기 함수
async function exportPDF() {
    if (analysisResults.length === 0) {
        alert('분석 결과가 없습니다. 먼저 데이터를 분석해주세요.');
        return;
    }

    try {
        console.log('PDF 내보내기 시작...');

        // 로딩 표시
        const originalButtonText = event.target.textContent;
        event.target.textContent = '📄 PDF 생성중...';
        event.target.disabled = true;

        // 모든 상세보기 펼치기
        const allDetailElements = document.querySelectorAll('.similarity-details');
        const originalDisplayStates = [];
        
        allDetailElements.forEach((element, index) => {
            originalDisplayStates[index] = element.style.display;
            element.style.display = 'block';
        });

        // 모든 STT 상세 정보도 펼치기
        const allSTTDetails = document.querySelectorAll('[id^="stt_details_"]');
        const originalSTTStates = [];
        
        allSTTDetails.forEach((element, index) => {
            originalSTTStates[index] = element.style.display;
            element.style.display = 'block';
        });

        // 렌더링 완료를 위한 대기
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 결과 영역만 캡처
        const resultsElement = document.getElementById('results');
        if (!resultsElement) {
            throw new Error('결과 영역을 찾을 수 없습니다.');
        }

        // html2canvas 옵션 개선
        const canvas = await html2canvas(resultsElement, {
            useCORS: true,
            allowTaint: false,
            scale: 1.2,
            backgroundColor: '#1a1a1a',
            logging: false,
            height: resultsElement.scrollHeight,
            width: resultsElement.scrollWidth,
            scrollX: 0,
            scrollY: 0,
            windowWidth: resultsElement.scrollWidth,
            windowHeight: resultsElement.scrollHeight,
            // document.write 문제 해결을 위한 옵션
            foreignObjectRendering: false,
            removeContainer: true
        });

        console.log('캔버스 캡처 완료:', canvas.width, 'x', canvas.height);

        // PDF 생성
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 캔버스를 이미지로 변환
        const imgData = canvas.toDataURL('image/png', 0.8); // 압축률 추가
        
        // A4 크기 계산
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // 여백을 고려한 실제 사용 가능 영역
        const margin = 10;
        const availableWidth = pdfWidth - (margin * 2);
        const availableHeight = pdfHeight - (margin * 2);
        
        // 비율 계산
        const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        // 페이지 중앙에 이미지 배치
        const x = (pdfWidth - scaledWidth) / 2;
        const y = margin;

        // 이미지가 한 페이지를 벗어나는 경우 여러 페이지로 분할
        if (scaledHeight > availableHeight) {
            console.log('다중 페이지 PDF 생성...');
            
            const pageHeight = availableHeight;
            const totalPages = Math.ceil(scaledHeight / pageHeight);
            
            for (let page = 0; page < totalPages; page++) {
                if (page > 0) {
                    pdf.addPage();
                }
                
                // 소스 이미지에서 잘라낼 영역 계산
                const sourceY = (page * pageHeight) / ratio;
                const sourceHeight = Math.min(pageHeight / ratio, imgHeight - sourceY);
                
                if (sourceHeight > 0) {
                    // 임시 캔버스에 부분 이미지 그리기
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imgWidth;
                    tempCanvas.height = sourceHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // 원본 캔버스에서 부분 복사
                    tempCtx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
                    
                    const partImgData = tempCanvas.toDataURL('image/png', 0.8);
                    pdf.addImage(partImgData, 'PNG', x, y, scaledWidth, sourceHeight * ratio);
                }
            }
        } else {
            // 한 페이지에 들어가는 경우
            pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
        }

        // 메타데이터 추가
        pdf.setProperties({
            title: `유사도 분석 결과 - ${new Date().toISOString().split('T')[0]}`,
            subject: 'AI 분석 파이프라인 결과',
            author: 'AI 분석 시스템',
            creator: 'Claude Code'
        });

        // PDF 다운로드
        const fileName = `similarity_analysis_results_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

        console.log('PDF 파일이 성공적으로 생성되었습니다.');

        // 원래 상태로 복원
        allDetailElements.forEach((element, index) => {
            element.style.display = originalDisplayStates[index];
        });

        allSTTDetails.forEach((element, index) => {
            element.style.display = originalSTTStates[index];
        });

        // 버튼 상태 복원
        event.target.textContent = originalButtonText;
        event.target.disabled = false;

    } catch (error) {
        console.error('PDF 생성 중 오류:', error);
        
        // 사용자 친화적인 오류 메시지
        let errorMessage = 'PDF 파일 생성 중 오류가 발생했습니다.';
        if (error.message.includes('html2canvas')) {
            errorMessage += ' 브라우저 호환성 문제일 수 있습니다. Chrome 브라우저 사용을 권장합니다.';
        }
        
        alert(errorMessage);
        
        // 버튼 상태 복원
        if (event && event.target) {
            event.target.textContent = originalButtonText || '📄 PDF 내보내기';
            event.target.disabled = false;
        }
    }
}