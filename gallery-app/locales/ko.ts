export const ko = {
    main: {
        proMode: "PRO MODE",
        proSubtitle: "정밀 · 검증 · 고급 설정",
        kidsMode: "키즈 모드",
        kidsSubtitle: "쉽고 재미있는 브릭 생성",
        // gallery 전용
        title: "Gallery",
        subtitle: "AI로 만든 멋진 브릭 작품들을 구경하세요.",
        sortLatest: "최신순",
        sortPopular: "인기순",
        noItems: "작품이 없습니다",
        next: "NEXT",
        landing: {
            goMake: "만들러 가기",
            cardTitle: "생성된 브릭 3D",
            titleLabel: "제목:",
            authorLabel: "생성한 사람:",
            moreWorks: "더 많은 작품이 궁금하신가요?",
            goToGallery: "갤러리 보러가기",
            recentCreations: "최신 작품",
            itemsCount: "작품",
            doubleClick: "상세 보려면 더블 클릭"
        },
        galleryList: {
            workspace: "워크스페이스",
            allCreations: "전체 갤러리",
            myBookmarks: "내 북마크",
            gallery: "갤러리"
        }
    },
    floatingMenu: {
        mypage: "마이페이지",
        chatbot: "브릭봇 문의",
        gallery: "갤러리",
        admin: "관리자 페이지",
        open: "메뉴 열기",
        iconAlt: "메뉴 아이콘"
    },
    upgradeModal: {
        title: "UPGRADE",
        message: "업그레이드하고 더 많은 도면과 고급 기능을 사용해보세요.",
        kidsPlan: {
            title: "키즈 모드",
            badge: "Easy",
            features: [
                "사진/이미지를 직접 업로드",
                "자동 도면 생성"
            ]
        },
        proPlan: {
            title: "프로 모드",
            badge: "Pro",
            features: [
                "추천 도면 TOP 3 미리보기",
                "최대 3회 재생성(리롤) 가능"
            ]
        },
        payBtn: "Google Pay로 결제하기",
        hint: "테스트 결제 환경(TEST) 기준",
        alertSuccess: "프로 멤버십으로 업그레이드되었습니다!",
        alertFail: "멤버십 업그레이드에 실패했습니다."
    },
    menu: {
        profile: "프로필 조회",
        membership: "멤버십 정보",
        jobs: "내 작업 목록",
        gallery: "내 갤러리",
        bookmarks: "북마크",
        inquiries: "내 문의함",
        reports: "내 신고함",
        settings: "설정",
        delete: "회원탈퇴",
        admin: "관리자 전용"
    },
    profile: {
        title: "프로필 조회",
        editTitle: "프로필 수정",
        nickname: "닉네임",
        email: "이메일",
        bio: "자기소개",
        joinedAt: "가입일",
        editBtn: "프로필 수정",
        cancelBtn: "취소",
        saveBtn: "저장",
        saving: "저장 중...",
        alertSaved: "프로필이 수정되었습니다.",
        alertFailed: "프로필 수정에 실패했습니다.",
        imageAlt: "프로필",
        defaultNickname: "사용자"
    },
    membership: {
        title: "멤버십 정보",
        desc: "현재 {plan} 플랜을 이용 중입니다.",
        upgradeBtn: "멤버십 업그레이드",
        proUser: "프로 플랜을 이용 중입니다!"
    },
    jobs: {
        title: "내 작업 목록",
        empty: "아직 작업 내역이 없습니다.",
        status: {
            QUEUED: "대기중",
            RUNNING: "실행 중",
            CANCELED: "취소됨",
            DONE: "완료",
            FAILED: "실패"
        },
        menu: {
            previewImage: "이미지 원본 보기",
            viewBlueprint: "조립 설명서 보기",
            sourceImage: "원본 이미지 다운로드",
            glbFile: "모델링 파일 다운(glb)",
            ldrFile: "도면 파일 다운(ldr)"
        },
        noGlbFile: "GLB 파일이 없습니다.",
        noLdrFile: "LDR 파일이 없습니다.",
        noEnhancedImage: "개선 이미지가 없습니다.",
        retryFail: "작업 재시도에 실패했습니다.",
        modalError: "실패한 작업입니다: ",
        modalPending: "아직 생성 중이거나 3D 모델이 준비되지 않았습니다.",
        modalNoData: "모델 데이터를 불러올 수 없습니다.",
        stillGenerating: "아직 생성 중입니다. 잠시만 기다려 주세요.",
        retryConfirm: "생성에 실패했거나 중단된 작업입니다. 다시 시도하시겠습니까?",
        cancelConfirm: "진행 중인 작업을 취소하시겠습니까?",
        cancelFail: "작업 취소에 실패했습니다.",
        settingsTbd: "설정 기능 준비 중"
    },
    settings: {
        title: "설정",
        notification: "알림 설정",
        language: "언어 설정",
        changeBtn: "변경",
        langKo: "한국어",
        langEn: "English",
        langJa: "日本語"
    },
    delete: {
        title: "회원탈퇴",
        desc: "정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구가 불가능합니다.",
        btn: "회원탈퇴",
    },
    inquiries: {
        title: "내 문의함",
        empty: "문의 내역이 없습니다.",
        status: {
            PENDING: "답변 대기",
            ANSWERED: "답변 완료",
        },
        adminAnswer: "관리자 답변",
    },
    reports: {
        title: "내 신고함",
        empty: "신고 내역이 없습니다.",
        status: {
            PENDING: "검토 중",
            RESOLVED: "처리 완료",
            REJECTED: "반려",
        },
        reasons: {
            SPAM: "스팸/광고",
            ABUSE: "욕설/비하",
            INAPPROPRIATE: "부적절한 내용",
            GENERAL: "기타",
        },
        targets: {
            POST: "게시글",
            COMMENT: "댓글",
            USER: "사용자",
            JOB: "공고",
            GALLERY_POST: "갤러리",
            INQUIRY: "문의",
            UPLOAD_FILE: "업로드 파일",
            PAYMENT_ORDER: "결제",
            GENERAL: "일반/기타",
        },
        adminNote: "관리자 조치 내용",
        labelType: "유형",
        labelReason: "사유",
        dataId: "데이터 ID",
        noData: "신고 내역이 없습니다.",
    },
    kids: {
        title: "난이도를 선택해 보세요",
        level: "L{lv}",
        pro: "PRO",
        continueBtn: "계속하기",
        model1: "모델 1",
        model2: "모델 2",
        generate: {
            loading: "AI가 브릭을 만들고 있어요...",
            creating: "생성 중...",
            complete: "생성이 완료되었습니다! 마이페이지에서 확인해주세요.",
            ready: "완성되었어요!",
            next: "다음으로 →",
            error: "앗! 문제가 발생했어요.\n나중에 다시 시도해 주세요.",
            failed: "작업 실패",
            starting: "작업 시작...",
            uploadPrepare: "S3 업로드 준비 중...",
            uploading: "이미지 업로드 중...",
            creating2: "작업 생성 요청 중...",
            jobCreated: "작업 생성 완료",
            inProgress: "진행 중...",
            loadingResult: "결과물 로딩 중...",
            serverDelay: "서버 응답 지연 중...",
            aiNoResponse: "AI 서버 응답 없음",
            errorOccurred: "오류 발생"
        },
        modelSelect: {
            title: "브릭 생성하기",
            sub: "모델 선택 또는 이미지 업로드",
            autoGenSub: "원하는 모델을 선택하면 자동으로 생성됩니다.",
            pick: "선택",
            picked: "선택됨",
            uploadTitle: "이미지 업로드",
            uploadSub: "클릭하거나 파일을 여기로 드래그하세요",
            uploadHint: "JPG / PNG / WEBP",
            uploadProTitle: "이미지 업로드 (프로 기능)",
            uploadProSub: "클릭하여 업그레이드하세요",
            uploadProHint: "업그레이드 시 사용 가능",
            confirm: "생성하기",
            previewTitle: "3D 미리보기",
            previewSub: "모델을 회전시켜 확인하세요"
        },
        steps: {
            back: "뒤로",
            noUrl: "스텝을 볼 URL이 없습니다.",
            title: "STEP {cur} / {total}",
            preview: "브릭 정보",
            loading: "스텝 로딩 중...",
            prev: "이전",
            next: "다음",
            downloadGlb: "GLB 다운로드",
            downloadLdr: "LDR 다운로드",
            registerGallery: "갤러리 등록",
            galleryModal: {
                title: "갤러리에 작품 등록",
                placeholder: "작품 제목을 입력하세요",
                confirm: "등록하기",
                cancel: "취소",
                success: "갤러리에 등록되었습니다!",
                fail: "갤러리 등록에 실패했습니다.",
                content: "키즈 모드에서 생성됨"
            },
            glbNotFound: "서버에서 GLB 파일을 찾을 수 없습니다.",
            glbDownloadFail: "GLB 파일 다운로드에 실패했습니다.",
            emptyGallery: "등록된 작품이 없습니다.",
            galleryTable: {
                title: "제목",
                author: "작성자",
                date: "수정한 날짜",
                views: "조회수"
            },
            viewModes: "보기 모드",
            tabBrick: "브릭 3D",
            tabModeling: "3D 모델링",
            tabOriginal: "원본 이미지",
            originalModel: "AI 3D 모델",
            previewTitle: "브릭 미리보기",
            startAssembly: "조립 시작하기",
            pdfConfirm: "PDF 설명을 생성하시겠습니까?\n모델 크기에 따라 시간이 걸릴 수 있습니다.",
            pdfComplete: "PDF 생성이 완료되었습니다.",
            pdfGenerating: "📸 3D 모델 캡처 및 PDF 생성 중...",
            pdfDownloadComplete: "✅ PDF 다운로드 완료",
            pdfError: "❌ PDF 오류",
            colorThemeTitle: "색상 테마 선택",
            colorThemeApplied: "테마 적용 완료!",
            colorThemeFailed: "색상 변경 실패",
            colorThemeError: "색상 변경 중 오류가 발생했습니다."
        },
        viewer: {
            noUrl: "모델 URL이 없습니다",
            back: "돌아가기",
            loading: "3D 모델 로딩 중...",
            completeModel: "완성된 모델",
            instructions: "드래그하여 회전 • 스크롤하여 확대/축소",
            viewSteps: "스텝 보기"
        }
    },
    header: {
        upgrade: "업그레이드",
        login: "로그인",
        logout: "로그아웃",
        gallery: "갤러리",
        logoAlt: "브릭커스 로고",
        myGallery: "내 갤러리",
        myPage: "마이페이지"
    },
    auth: {
        title: "로그인",
        kakao: "Kakao로 시작하기",
        google: "Google로 시작하기",
        processing: "Login...",
        loggingOut: "Logout...",
        failed: "로그인에 실패했습니다.",
        redirecting: "홈으로 이동합니다..."
    },
    adult: {
        title: "PRO MODE",
        ldrTest: "LDR 테스트",
        ldrDesc: "현재는 LDraw 파츠 렌더링 확인용 뷰입니다.",
        fileLabel: "파일",
        panel: {
            title: "선택 정보",
            hint: "브릭을 클릭하면 상세가 표시됩니다."
        }
    },
    common: {
        loading: "로딩 중...",
        loginRequired: "로그인이 필요합니다.",
        loginRequiredDesc: "서비스를 이용하려면 로그인해 주세요.",
        homeBtn: "홈으로",
        retryBtn: "다시 시도",
        error: "데이터를 불러오지 못했습니다.",
        unknownError: "알 수 없는 오류",
        noPreview: "미리보기 없음",
        noImage: "이미지 없음",
        anonymous: "익명",
        confirm: "확인",
        cancel: "취소",
        later: "나중에 할게요"
    },
    admin: {
        panelTitle: "관리자 패널",
        welcome: "전용 관리자 도구에 접속하셨습니다.",
        stats: {
            users: "총 사용자",
            jobs: "오늘의 작업",
            gallery: "신규 갤러리"
        },
        sidebar: {
            dashboard: "대시보드",
            users: "사용자 관리",
            gallery: "갤러리 관리",
            settings: "시스템 설정",
            inquiries: "문의 관리",
            reports: "신고 관리",
            refunds: "환불 관리"
        },
        accessDenied: "관리자 권한이 없습니다. (현재 권한: {role})",
        inquiry: {
            adminAnswer: "관리자 답변",
            placeholder: "답변을 입력하세요...",
            submit: "답변 등록",
            success: "답변이 등록되었습니다.",
            empty: "문의 내역이 없습니다.",
            inputRequired: "답변 내용을 입력하세요."
        },
        report: {
            resolve: "조치 승인",
            reject: "반려",
            placeholder: "조치 내용이나 반려 사유를 입력하세요...",
            resolved: "조치가 완료되었습니다.",
            rejected: "신고가 반려되었습니다.",
            empty: "신고 내역이 없습니다.",
            inputRequired: "조치 내용을 입력하세요.",
            actionComplete: "조치 완료",
            actionRejected: "신고 반려"
        },
        refund: {
            approve: "승인",
            empty: "환불 요청이 없습니다.",
            amount: "금액",
            inProgress: "기능 구현 중"
        },
        error: "오류가 발생했습니다.",
        failed: "처리에 실패했습니다.",
        label: {
            target: "대상",
            reporter: "신고자",
            order: "주문 번호",
            user: "사용자"
        }
    },
    mypage: {
        stats: {
            jobs: "내 작업",
            gallery: "내 갤러리",
            joinedAt: "가입일"
        },
        bioPlaceholder: "자기소개를 입력해주세요!",
        nicknamePlaceholder: "닉네임을 입력하세요",
        bioInputPlaceholder: "자기소개를 입력하세요",
        noTitle: "제목 없음",
        payment: {
            date: "결제일",
            nextDate: "다음 결제일"
        },
        preparing: "콘텐츠 준비 중입니다..."
    },
    // gallery 전용 (기존 gallery-app)
    detail: {
        back: "갤러리로 돌아가기",
        description: "작품 설명",
        noDescription: "설명이 없습니다.",
        views: "조회",
        likes: "좋아요",
        view3d: "3D로 보기 & 만들기",
        save: "저장",
        share: "공유",
        creator: "크리에이터",
        comments: "댓글",
        noComments: "댓글이 없습니다.",
        placeholderComment: "댓글을 입력하세요...",
        loginToComment: "로그인 후 댓글을 남겨보세요",
        post: "등록",
        noGlb: "3D 모델 파일이 없습니다.",
        noImg: "원본 이미지가 없습니다."
    },
    my: {
        title: "내 갤러리",
        subtitle: "내가 만든 작품과 북마크한 작품을 모아보세요.",
        tabMy: "내 갤러리",
        tabBookmarks: "북마크",
        empty: "아직 작품이 없습니다.",
        goToCreate: "작품 만들러 가기 →",
        next: "NEXT",
        newWork: "새 작품 만들기"
    },
    miniGame: {
        playAgain: "다시 하기",
        gameOver: "게임 오버!",
        score: "점수"
    },
    sse: {
        download: "이미지 수신 완료. 구조부터 살펴보겠습니다.",
        gemini: "명암과 형태를 분석합니다. 브릭 색상으로 옮기기 좋은 상태로 보정하고 있어요.",
        tripo: "2D 정보를 바탕으로 3D 형태를 잡아봅니다.",
        brickify: "브릭 단위로 분해하면서 안정적인 조합을 탐색 중이에요.",
        bom: "현재 설계를 기준으로 필요한 부품 수를 계산하고 있어요.",
        pdf: "조립 순서를 정리해서 설명서로 옮기고 있어요.",
        complete: "설계가 끝났어요. 결과를 한번 살펴볼까요?",
        HYPOTHESIZE: "유사한 브릭 구조를 참고해서 가능한 형태를 가정하고 있어요.",
        STRATEGY: "현재 조건에서 가장 합리적인 설계 전략을 세우고 있어요.",
        GENERATE: "설계안을 하나씩 구현해 보는 중이에요.",
        VERIFY: "내구성과 조립 가능성을 확인 중이에요.",
        ANALYZE: "불필요한 복잡성이 있는지 검토하고 있어요.",
        REFLECT: "이전 시도와 비교해서 개선된 점을 정리하고 있어요.",
        EVOLVE: "형태와 효율 사이의 균형을 맞추고 있어요.",
        COMPLETE: "설계가 완료됐어요. 다음 단계로 넘어가도 좋아요."
    }
};
