export type ChatTranslation = {
    welcome: string;
    suggestions: {
        howTo: string;
        gallery: string;
        inquiry: string;
        report: string;
        refund: string;
    };
    toggleSuggestions: string;
    toggleSuggestionsAfter: string;
    placeholder: string;
    send: string;
    header: string;
    inquiry: {
        modeTitle: string;
        titlePlace: string;
        contentPlace: string;
        btn: string;
        confirm: string;
    };
    report: {
        modeTitle: string;
        reasonLabel: string;
        contentPlace: string;
        btn: string;
        confirm: string;
        reasons: {
            SPAM: string;
            INAPPROPRIATE: string;
            ABUSE: string;
            COPYRIGHT: string;
            OTHER: string;
        };
    };
    refund: {
        modeTitle: string;
        desc: string;
        empty: string;
        btn: string;
        confirm: string;
        alreadyProcessed: string;
    };
    cancel: string;
    actions: {
        create: string;
        gallery: string;
        mypage: string;
    };
    error: string;
    loginRequired: string;
    loadFailed: string;
    inputRequired: string;
    submitFailed: string;
    selectRequired: string;
};

export const CHAT_TRANSLATIONS: Record<string, ChatTranslation> = {
    ko: {
        welcome: "안녕하세요! 궁금한 점이 있으신가요?",
        suggestions: {
            howTo: "브릭 어떻게 만들어요?",
            gallery: "갤러리는 뭐예요?",
            inquiry: "문의하기",
            report: "신고하기",
            refund: "환불 요청"
        },
        toggleSuggestions: "이런 질문을 해보세요",
        toggleSuggestionsAfter: "다른 질문은 있으신가요?",
        placeholder: "궁금한 내용을 입력하세요...",
        send: "전송",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 문의하기",
            titlePlace: "문의 제목",
            contentPlace: "문의 내용을 자세히 적어주세요.",
            btn: "문의 접수",
            confirm: "문의가 접수되었습니다! 관리자가 확인 후 빠르게 답변드리겠습니다."
        },
        report: {
            modeTitle: "신고하기",
            reasonLabel: "신고 사유",
            contentPlace: "신고 내용을 적어주세요.",
            btn: "신고 접수",
            confirm: "신고가 접수되었습니다. 관리자가 검토 후 조치하겠습니다.",
            reasons: {
                SPAM: "스팸 / 부적절한 홍보",
                INAPPROPRIATE: "부적절한 콘텐츠",
                ABUSE: "욕설 / 비하 발언",
                COPYRIGHT: "저작권 침해",
                OTHER: "기타"
            }
        },
        refund: {
            modeTitle: "환불 요청",
            desc: "최근 결제 내역 중 환불할 항목을 선택해주세요.",
            empty: "환불 가능한 결제 내역이 없습니다.",
            btn: "환불 요청",
            confirm: "환불 요청이 접수되었습니다. 처리 결과는 알림으로 알려드릴게요.",
            alreadyProcessed: "이미 처리된 주문입니다. 목록을 새로고침합니다."
        },
        cancel: "취소",
        actions: {
            create: "브릭 만들기 시작",
            gallery: "갤러리 구경하기",
            mypage: "내 정보 보기"
        },
        error: "죄송해요, 잠시 문제가 생겼어요. 다시 시도해주세요!",
        loginRequired: "로그인이 필요한 서비스입니다.",
        loadFailed: "데이터를 불러오는데 실패했습니다.",
        inputRequired: "입력 내용을 확인해주세요.",
        submitFailed: "접수에 실패했습니다.",
        selectRequired: "항목을 선택해주세요."
    },
    en: {
        welcome: "Hello! How can I help you today?",
        suggestions: {
            howTo: "How do I make Brick?",
            gallery: "What is Gallery?",
            inquiry: "Inquiry",
            report: "Report",
            refund: "Request Refund"
        },
        toggleSuggestions: "Suggested Questions",
        toggleSuggestionsAfter: "Do you have any other questions?",
        placeholder: "Ask me anything...",
        send: "Send",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 Inquiry",
            titlePlace: "Title",
            contentPlace: "Please describe your inquiry.",
            btn: "Submit Inquiry",
            confirm: "Inquiry submitted! We will get back to you soon."
        },
        report: {
            modeTitle: "Report Details",
            reasonLabel: "Reason",
            contentPlace: "Please describe the issue.",
            btn: "Submit Report",
            confirm: "Report submitted. We will review it shortly.",
            reasons: {
                SPAM: "Spam / Promotion",
                INAPPROPRIATE: "Inappropriate Content",
                ABUSE: "Abusive Language",
                COPYRIGHT: "Copyright Infringement",
                OTHER: "Other"
            }
        },
        refund: {
            modeTitle: "Request Refund",
            desc: "Select a payment to refund.",
            empty: "No refundable payments found.",
            btn: "Request Refund",
            confirm: "Refund request submitted.",
            alreadyProcessed: "This order has already been processed. Refreshing list."
        },
        cancel: "Cancel",
        actions: {
            create: "Start Creating",
            gallery: "Visit Gallery",
            mypage: "My Page"
        },
        error: "Sorry, something went wrong. Please try again!",
        loginRequired: "Login required.",
        loadFailed: "Failed to load data.",
        inputRequired: "Please check your input.",
        submitFailed: "Submission failed.",
        selectRequired: "Please select an item."
    },
    ja: {
        welcome: "こんにちは！何かお手伝いしましょうか？",
        suggestions: {
            howTo: "どうやってブリックを作るの？",
            gallery: "ギャラリーって何？",
            inquiry: "お問い合わせ",
            report: "通報する",
            refund: "返金リクエスト"
        },
        toggleSuggestions: "こんな質問はどうですか？",
        toggleSuggestionsAfter: "他に質問はありますか？",
        placeholder: "気になることを入力してください...",
        send: "送信",
        header: "BrickBot",
        inquiry: {
            modeTitle: "1:1 お問い合わせ",
            titlePlace: "タイトル",
            contentPlace: "お問い合わせ内容を詳しく書いてください。",
            btn: "送信する",
            confirm: "お問い合わせを受け付けました！確認後、すぐにお答えします。"
        },
        report: {
            modeTitle: "通報する",
            reasonLabel: "通報理由",
            contentPlace: "内容を書いてください。",
            btn: "通報する",
            confirm: "通報を受け付けました。管理者が確認して対応します。",
            reasons: {
                SPAM: "スパム / 不適切な宣伝",
                INAPPROPRIATE: "不適切なコンテンツ",
                ABUSE: "暴言 / 誹謗中傷",
                COPYRIGHT: "著作権侵害",
                OTHER: "その他"
            }
        },
        refund: {
            modeTitle: "返金リクエスト",
            desc: "返金したい決済を選択してください。",
            empty: "返金可能な決済がありません。",
            btn: "リクエスト",
            confirm: "返金リクエストを受け付けました。",
            alreadyProcessed: "すでに処理済みの注文です。リストを更新します。"
        },
        cancel: "キャンセル",
        actions: {
            create: "ブリックを作り始める",
            gallery: "ギャラリーを見る",
            mypage: "マイページ"
        },
        error: "申し訳ありません。問題が発生しました。もう一度お試しください！",
        loginRequired: "ログインが必要です。",
        loadFailed: "データの読み込みに失敗しました。",
        inputRequired: "入力内容を確認してください。",
        submitFailed: "送信に失敗しました。",
        selectRequired: "項目を選択してください。"
    }
};
