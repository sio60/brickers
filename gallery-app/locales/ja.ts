export const ja = {
    main: {
        proMode: "PRO MODE",
        proSubtitle: "精密 · 検証 · 詳細設定",
        kidsMode: "キッズモード",
        kidsSubtitle: "簡単で楽しいブリック生成",
        // gallery specific
        title: "Gallery",
        subtitle: "AIで作られた素晴らしいブリック作品をご覧ください。",
        sortLatest: "最新順",
        sortPopular: "人気順",
        noItems: "作品がありません",
        next: "NEXT",
        landing: {
            goMake: "作りに行く",
            cardTitle: "生成されたブリック 3D",
            titleLabel: "タイトル:",
            authorLabel: "作成者:",
            moreWorks: "もっと作品を見たいですか？",
            goToGallery: "ギャラリーへ",
            recentCreations: "最新の作品",
            itemsCount: "個の作品",
            doubleClick: "ダブルクリックで詳細表示"
        },
        galleryList: {
            workspace: "ワークスペース",
            allCreations: "全ギャラリー",
            myBookmarks: "マイブックマーク",
            gallery: "ギャラリー"
        }
    },
    floatingMenu: {
        mypage: "マイページ",
        chatbot: "ブリックボット問い合わせ",
        gallery: "ギャラリー",
        admin: "管理者ページ",
        open: "メニューを開く",
        iconAlt: "メニューアイコン",
        hint: "ご質問はブリックボットにお問い合わせください！"
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
        inquiries: "問い合わせ履歴",
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
        menu: {
            previewImage: "元画像を見る",
            viewBlueprint: "組立説明書を見る",
            glbFile: "モデルファイル(glb)をダウンロード",
            ldrFile: "図面ファイル(ldr)をダウンロード",
            sourceImage: "元画像ダウンロード",
            downloadPdf: "PDF説明書ダウンロード",
            downloadEnhanced: "補正画像ダウンロード"
        },
        noGlbFile: "GLBファイルがありません。",
        noLdrFile: "LDRファイルがありません。",
        noEnhancedImage: "改善された画像がありません。",
        retryFail: "再試行に失敗しました。",
        modalError: "失敗した作業です：",
        modalPending: "現在生成中か、3Dモデルの準備ができていません。",
        modalNoData: "モデルデータを読み込めませんでした。",
        stillGenerating: "まだ生成中です。少々お待ちください。",
        retryConfirm: "生成に失敗したか中断された作業です。再試行しますか？",
        cancelConfirm: "進行中の作業をキャンセルしますか？",
        cancelFail: "作業のキャンセルに失敗しました。",
        sortLatest: "最新順",
        sortOldest: "古い順",
        noPdfFile: "PDFがまだ生成されていません。組立ページで生成をお待ちください。",
        noCapturedImage: "キャプチャ画像がありません。",
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
            JOB: "作業公告",
            GALLERY_POST: "ギャラリー",
            INQUIRY: "問い合わせ",
            UPLOAD_FILE: "アップロードファイル",
            PAYMENT_ORDER: "決済注文",
            GENERAL: "一般/その他",
        },
        adminNote: "管理者からの対応内容",
        labelType: "タイプ",
        labelReason: "理由",
        dataId: "データID",
        noData: "報告履歴がありません。",
    },
    kids: {
        title: "難易度を選択してください",
        level: "L{lv}",
        bricks: "個",

        pro: "PRO",
        continueBtn: "進む",
        model1: "モデル 1",
        model2: "モデル 2",
        generate: {
            loading: "AIがブリックを作成しています...",
            creating: "作成中...",
            complete: "生成が完了しました！マイページで確認してください。",
            ready: "完成しました！",
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
            errorOccurred: "エラー発生",
            completeTitle: "生成完了！",
            completeBody: "ブリックモデルが完成しました。クリックして確認してください！"
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
            previewSub: "モデルを回転させて確認してください",
            freeUserNotice: "* 無料会員はアップグレード後にご利用いただけます",
            drawTitle: "お絵描きで作る",
            drawSub: "ウェブで直接絵を描いてみましょう",
            drawTool: {
                brush: "ブラシ",
                eraser: "消しゴム",
                clear: "クリア",
                done: "描き終わりました！",
                color: "色",
                size: "サイズ"
            },
            promptTitle: "テキストで作る",
            promptSub: "想像したことを文字で書いてみましょう",
            promptInputTitle: "何を作りたいですか？",
            promptInputPlaceholder: "例：翼のある車、虹色のお城",
            promptInputHint: "詳しく書くほど良い結果になります！",
            promptConfirm: "このまま作る"
        },
        steps: {
            back: "戻る",
            noUrl: "ステップを表示するURLがありません。",
            title: "ステップ {cur} / {total}",
            bricksNeeded: "必要なブリック",
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
            },
            viewModes: "表示モード",
            tabBrick: "ブリック3D",
            tabModeling: "3Dモデリング",
            tabOriginal: "オリジナル画像",
            originalModel: "AI 3Dモデル",
            previewTitle: "ブリックプレビュー",
            startAssembly: "組み立て開始",
            pdfConfirm: "PDFガイドを生成しますか？\nモデルのサイズによっては時間がかかる場合があります。",
            pdfComplete: "PDF生成が完了しました。",
            pdfGenerating: "📸 3Dモデルをキャプチャし、PDFを生成中...",
            pdfDownloadComplete: "✅ PDFダウンロード完了",
            pdfError: "❌ PDFエラー",
            colorThemeTitle: "カラーテーマ選択",
            colorThemeApplied: "テーマの適用が完了しました！",
            colorThemeFailed: "色の変更に失敗しました",
            colorThemeError: "色の変更中にエラーが発生しました。",
            changeColor: "色を変更",
            restoreOriginal: "元に戻す",
            pdfDownloadBtn: "PDFダウンロード",
            pdfPreparing: "PDF準備中...",
            pdfWait: "PDF準備中です。しばらくお待ちください。",
            registered: "登録完了",
            themeLoading: "テーマ読み込み中...",
            colorChangeModelError: "色変更後のモデル生成中にエラーが発生しました。"
        },
        viewer: {
            noUrl: "モデルURLがありません",
            back: "戻る",
            loading: "3Dモデル読み込み中...",
            completeModel: "完成したモデル",
            instructions: "ドラッグで回転 • スクロールで拡大/縮小",
            viewSteps: "ステップ表示"
        }
    },
    auth: {
        title: "ログイン",
        kakao: "Kakaoでログイン",
        google: "Googleでログイン",
        processing: "ログイン処理中... 少々お待ちください",
        loggingOut: "ログアウト処理中...",
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
            inProgress: "機能開発中",
            reject: "拒否",
            rejectReason: "拒否理由を入力",
            confirmApprove: "この払い戻しを承認しますか？",
            approved: "払い戻しが承認されました。",
            rejected: "払い戻しが拒否されました。",
            inputRequired: "拒否理由を入力してください。",
            planName: "商品名",
            reason: "キャンセル理由",
            user: "ユーザーID",
            requestDate: "要請日",
            orderNo: "注文番号"
        },
        users: {
            title: "ユーザー管理",
            searchPlaceholder: "メールまたはニックネームで検索...",
            suspendReason: "停止理由を入力してください:",
            suspended: "ユーザーが停止されました。",
            confirmActivate: "このユーザーの停止を解除しますか？",
            activated: "ユーザーの停止が解除されました。",
            empty: "ユーザーが見つかりません。"
        },
        error: "エラーが発生しました。",
        failed: "処理に失敗しました。",
        label: {
            target: "対象",
            reporter: "報告者",
            order: "注文番号",
            user: "ユーザー"
        }
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
        },
        preparing: "コンテンツ準備中です..."
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
        later: "後で",
        apply: "適用する",
        applying: "適用中...",
        colorChangeComplete: "色変更完了",
        themeApplied: "テーマが適用されました",
        downloadChangedLdr: "変更されたLDRをダウンロード",
        requestFailed: "リクエスト失敗",
        networkError: "ネットワークエラー"
    },
    header: {
        upgrade: "アップグレード",
        login: "ログイン",
        logout: "ログアウト",
        gallery: "ギャラリー",
        logoAlt: "ブリッカーズロゴ",
        myGallery: "マイギャラリー",
        myPage: "マイページ"
    },
    // gallery specific (from original gallery-app)
    detail: {
        back: "ギャラリーに戻る",
        description: "作品説明",
        noDescription: "説明がありません。",
        views: "閲覧",
        likes: "いいね",
        view3d: "3Dで見る＆作る",
        save: "保存",
        share: "共有",
        creator: "クリエイター",
        comments: "コメント",
        noComments: "コメントはまだありません。",
        placeholderComment: "コメントを入力...",
        loginToComment: "ログインしてコメントしてください",
        post: "投稿",
        noGlb: "3Dモデルファイルがありません。",
        noImg: "元画像がありません。",
        copied: "URLがコピーされました",
        copyFailed: "URLのコピーに失敗しました。",
        reply: "返信",
        replyPlaceholder: "返信を入力...",
        hideReplies: "返信を非表示",
        showReplies: "返信{count}件を表示",
        views3d: {
            noLdrUrl: "LDR URLがありません。",
            dragRotate: "ドラッグ: 回転",
            scrollZoom: "スクロール: ズーム"
        }
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
    },
    sse: {
        download: "画像を受信しました。構造から確認してみましょう。",
        gemini: "明暗と形状を分析中。ブリックの色に変換しやすい状態に補正しています。",
        tripo: "2D情報をもとに3D形状を構築しています。",
        brickify: "ブリック単位に分解しながら、安定した組み合わせを探しています。",
        bom: "現在の設計をもとに必要なパーツ数を計算しています。",
        pdf: "組み立て順序を整理して説明書に反映しています。",
        complete: "設計が完了しました。結果を確認してみましょう！",
        HYPOTHESIZE: "類似のブリック構造を参考に、可能な形状を仮定しています。",
        STRATEGY: "現在の条件で最も合理的な設計戦略を立てています。",
        GENERATE: "設計案を一つずつ実装しています。",
        VERIFY: "耐久性と組み立て可能性を確認中です。",
        ANALYZE: "不要な複雑さがないか検討しています。",
        REFLECT: "前回の試行と比較して改善点を整理しています。",
        EVOLVE: "形状と効率のバランスを調整しています。",
        COMPLETE: "設計が完了しました。次のステップに進みましょう。"
    },
    viewer3d: {
        loading: "3Dモデル読み込み中...",
        loadFailed: "3Dモデルの読み込みに失敗しました。",
        loadingWait: "3Dモデル読み込み中...\nしばらくお待ちください",
        loadError: "モデル読み込み失敗"
    },
    loginModal: {
        title: "ログインが必要です",
        bookmarkDesc: "ブックマーク機能を使うには\nログインしてください。",
        loginBtn: "ログインする"
    },
    galleryCard: {
        bookmarkRemove: "ブックマーク解除",
        bookmarkAdd: "ブックマーク追加",
        likeRemove: "いいね解除",
        likeAdd: "いいね追加",
        monthDay: "{month}月{day}日"
    }
};
