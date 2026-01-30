export const ja = {
    main: {
        proMode: "PRO MODE",
        proSubtitle: "精密 · 検証 · 詳細設定",
        kidsMode: "キッズモード",
        kidsSubtitle: "簡単で楽しいレゴ生成",
        // gallery specific
        title: "Gallery",
        subtitle: "AIで作られた素晴らしいレゴ作品をご覧ください。",
        sortLatest: "最新順",
        sortPopular: "人気順",
        noItems: "作品がありません",
        next: "NEXT"
    },
    floatingMenu: {
        mypage: "マイページ",
        chatbot: "ブリックボット問い合わせ",
        gallery: "ギャラリー",
        admin: "管理者ページ",
        open: "メニューを開く",
        iconAlt: "メニューアイコン"
    },
    upgradeModal: {
        title: "UPGRADE",
        message: "アップグレードして、より多くの図面と高度な機能を使用してみてください。",
        kidsPlan: {
            title: "キッズモード",
            badge: "Easy",
            features: [
                "写真/画像を直接アップロード",
                "自動図面生成"
            ]
        },
        proPlan: {
            title: "プロモード",
            badge: "Pro",
            features: [
                "おすすめ図面 TOP 3 プレビュー",
                "最大3回再生成(リロール)可能"
            ]
        },
        payBtn: "Google Payで決済する",
        hint: "テスト決済環境(TEST)基準",
        alertSuccess: "プロメンバーシップにアップグレードされました！",
        alertFail: "メンバーシップのアップグレードに失敗しました。"
    },
    menu: {
        profile: "プロフィール",
        membership: "メンバーシップ情報",
        jobs: "作業履歴",
        gallery: "マイギャラリー",
        bookmarks: "ブックマーク",
        reports: "報告・通報履歴",
        settings: "設定",
        delete: "退会",
        admin: "管理者専用"
    },
    profile: {
        title: "プロフィール表示",
        editTitle: "プロフィール編集",
        nickname: "ニックネーム",
        email: "メールアドレス",
        bio: "自己紹介",
        joinedAt: "加入日",
        editBtn: "プロフィール編集",
        cancelBtn: "キャンセル",
        saveBtn: "保存",
        saving: "保存中...",
        alertSaved: "プロフィールを更新しました。",
        alertFailed: "プロフィールの更新に失敗しました。",
        imageAlt: "プロフィール",
        defaultNickname: "ユーザー"
    },
    membership: {
        title: "メンバーシップ情報",
        desc: "現在 {plan} プランを利用中です。",
        upgradeBtn: "プロにアップグレード",
        proUser: "プロプランを利用中です！"
    },
    jobs: {
        title: "作業履歴",
        empty: "まだ作業履歴がありません。",
        status: {
            QUEUED: "待機中",
            RUNNING: "実行中",
            CANCELED: "キャンセル済み",
            DONE: "完了",
            FAILED: "失敗"
        },
        retryFail: "再試行に失敗しました。",
        modalError: "失敗した作業です：",
        modalPending: "現在生成中か、3Dモデルの準備ができていません。",
        modalNoData: "モデルデータを読み込めませんでした。",
        stillGenerating: "まだ生成中です。少々お待ちください。",
        retryConfirm: "生成に失敗したか中断された作業です。再試行しますか？",
        settingsTbd: "設定機能準備中"
    },
    settings: {
        title: "設定",
        notification: "通知設定",
        language: "言語設定",
        changeBtn: "変更",
        langKo: "한국어",
        langEn: "English",
        langJa: "日本語"
    },
    delete: {
        title: "退会",
        desc: "本当に退会しますか？すべてのデータが削除され、復旧は不可能です。",
        btn: "退会",
    },
    inquiries: {
        title: "問い合わせ履歴",
        empty: "お問い合わせ履歴がありません。",
        status: {
            PENDING: "回答待ち",
            ANSWERED: "回答完了",
        },
        adminAnswer: "管理者からの回答",
    },
    reports: {
        title: "報告・通報履歴",
        empty: "通報・報告履歴がありません。",
        status: {
            PENDING: "確認中",
            RESOLVED: "対応完了",
            REJECTED: "却下",
        },
        reasons: {
            SPAM: "スパム/広告",
            ABUSE: "暴言/誹謗中傷",
            INAPPROPRIATE: "不適切な内容",
            GENERAL: "その他",
        },
        targets: {
            POST: "投稿",
            COMMENT: "コメント",
            USER: "ユーザー",
            GENERAL: "一般",
        },
        adminNote: "管理者からの対応内容",
        dataId: "データID",
    },
    kids: {
        title: "難易度を選択してください",
        level: "L{lv}",
        continueBtn: "進む",
        model1: "モデル 1",
        model2: "モデル 2",
        generate: {
            loading: "AIがレゴを作成しています...",
            creating: "作成中...",
            complete: "生成が完了しました！マイページで確認してください。",
            ready: "レゴが完成しました！",
            next: "次へ →",
            error: "おっと！問題が発生しました。\n後でもう一度お試しください。",
            failed: "作業失敗",
            starting: "作業開始...",
            uploadPrepare: "S3アップロード準備中...",
            uploading: "画像アップロード中...",
            creating2: "作業作成中...",
            jobCreated: "作業作成完了",
            inProgress: "進行中...",
            loadingResult: "結果読み込み中...",
            serverDelay: "サーバー応答遅延中...",
            aiNoResponse: "AIサーバー応答なし",
            errorOccurred: "エラー発生"
        },
        modelSelect: {
            title: "ブリック生成",
            sub: "モデル選択または画像アップロード",
            autoGenSub: "モデルを選択すると自動的に生成されます。",
            pick: "選択",
            picked: "選択済み",
            uploadTitle: "画像アップロード",
            uploadSub: "クリック または ファイルをドラッグしてください",
            uploadHint: "JPG / PNG / WEBP",
            uploadProTitle: "画像アップロード (PRO機能)",
            uploadProSub: "クリックしてアップグレード",
            uploadProHint: "アップグレード後に使用可能",
            confirm: "生成する",
            previewTitle: "3D プレビュー",
            previewSub: "モデルを回転させて確認してください"
        },
        steps: {
            back: "戻る",
            noUrl: "ステップを表示するURLがありません。",
            title: "ステップ {cur} / {total}",
            preview: "ブリックプレビュー",
            loading: "ステップ読み込み中...",
            prev: "前へ",
            next: "次へ",
            downloadGlb: "GLB ダウンロード",
            downloadLdr: "LDR ダウンロード",
            registerGallery: "ギャラリー登録",
            galleryModal: {
                title: "ギャラリーに作品を登録",
                placeholder: "作品のタイトルを入力してください",
                confirm: "登録する",
                cancel: "キャンセル",
                success: "ギャラリーに登録されました！",
                fail: "ギャラリー登録に失敗しました。",
                content: "キッズモードで作成"
            },
            glbNotFound: "サーバーにGLBファイルが見つかりません。",
            glbDownloadFail: "GLBファイルのダウンロードに失敗しました。",
            emptyGallery: "登録された作品がありません。",
            galleryTable: {
                title: "タイトル",
                author: "作成者",
                date: "修正日",
                views: "閲覧数"
            }
        }
    },
    header: {
        upgrade: "アップグレード",
        login: "ログイン",
        logout: "ログアウト",
        gallery: "ギャラリー",
        logoAlt: "ブリッカーズロゴ",
        myGallery: "マイギャラリー"
    },
    auth: {
        title: "ログイン",
        kakao: "Kakaoでログイン",
        google: "Googleでログイン",
        processing: "ログイン処理中... 少々お待ちください",
        failed: "ログインに失敗しました。",
        redirecting: "ホームへ移動しています..."
    },
    adult: {
        title: "PRO MODE",
        ldrTest: "LDR テスト",
        ldrDesc: "現在はLDrawパーツのレンダリング確認用ビューです。",
        fileLabel: "ファイル",
        panel: {
            title: "選択情報",
            hint: "ブリックをクリックすると詳細が表示されます。"
        }
    },
    admin: {
        panelTitle: "管理者パネル",
        welcome: "管理者専用ツールにアクセスしました。",
        stats: {
            users: "総ユーザー数",
            jobs: "今日の作業数",
            gallery: "新規ギャラリー"
        },
        sidebar: {
            dashboard: "ダッシュボード",
            users: "ユーザー管理",
            gallery: "ギャラリー管理",
            settings: "システム設定",
            inquiries: "問い合わせ管理",
            reports: "報告管理",
            refunds: "払い戻し管理"
        },
        accessDenied: "管理者権限がありません。(現在の権限: {role})",
        inquiry: {
            adminAnswer: "管理者の回答",
            placeholder: "回答を入力してください...",
            submit: "回答登録",
            success: "回答が登録されました。",
            empty: "問い合わせ履歴がありません。",
            inputRequired: "回答内容を入力してください。"
        },
        report: {
            resolve: "措置承認",
            reject: "却下",
            placeholder: "措置内容または却下理由を入力してください...",
            resolved: "措置が完了しました。",
            rejected: "報告が却下されました。",
            empty: "報告履歴がありません。",
            inputRequired: "措置内容を入力してください。",
            actionComplete: "措置完了",
            actionRejected: "報告却下"
        },
        refund: {
            approve: "承認",
            empty: "払い戻し要請がありません。",
            amount: "金額",
            inProgress: "機能開発中"
        },
        error: "エラーが発生しました。",
        failed: "処理に失敗しました。"
    },
    mypage: {
        stats: {
            jobs: "作業履歴",
            gallery: "マイギャラリー",
            joinedAt: "加入日"
        },
        bioPlaceholder: "自己紹介を入力してください！",
        nicknamePlaceholder: "ニックネームを入力",
        bioInputPlaceholder: "自己紹介を入力してください",
        noTitle: "タイトルなし",
        payment: {
            date: "決済日",
            nextDate: "次回決済日"
        }
    },
    common: {
        loading: "読み込み中...",
        loginRequired: "ログインが必要です",
        loginRequiredDesc: "サービスを利用するにはログインしてください。",
        homeBtn: "ホームへ",
        retryBtn: "もう一度試す",
        error: "データを読み込めませんでした。",
        unknownError: "不明なエラー",
        noPreview: "プレビューなし",
        noImage: "画像なし",
        anonymous: "匿名",
        confirm: "確認",
        cancel: "キャンセル",
        later: "後で"
    },
    // gallery specific (from original gallery-app)
    detail: {
        back: "← ギャラリーに戻る",
        description: "作品説明",
        noDescription: "説明がありません。",
        views: "閲覧",
        likes: "いいね",
        view3d: "3Dで見る＆作る"
    },
    my: {
        title: "マイギャラリー",
        subtitle: "あなたが作成した作品とブックマークした作品をチェックしましょう。",
        tabMy: "マイギャラリー",
        tabBookmarks: "ブックマーク",
        empty: "まだ作品がありません。",
        goToCreate: "作品を作りに行く →",
        next: "NEXT",
        newWork: "新規作成"
    },
    miniGame: {
        playAgain: "もう一度プレイ",
        gameOver: "ゲームオーバー！",
        score: "スコア"
    }
};
